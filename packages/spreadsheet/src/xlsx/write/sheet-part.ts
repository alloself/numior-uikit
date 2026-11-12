import { max } from 'lodash-es';
import { MAX_COLS, formatCell, formatRange } from '../../core/address';
import {
  bookArrays,
  needsArrayEvaluation,
  withImplicitIntersections,
  withoutIntersections,
} from '../../core/calc/array-formula';
import { sameTree } from '../../core/calc/shared-trees';
import type { Calculator } from '../../core/calc/calculator';
import { CHUNK_ROWS } from '../../core/cell-store';
import { nextTask } from '../../core/calc/tasks';
import { CellError, CellValueKind, type CellRange, type CellValue } from '../../core/cell.types';
import { FILE_FORMULAS } from '../../core/formula/locale';
import type { FormulaNode } from '../../core/formula/formula.types';
import { printFormula } from '../../core/formula/printer';
import type { Sheet, Workbook } from '../../core/workbook';
import { escapeAttribute, escapeText } from '../xml/writer';
import { encodeXstring } from '../xml/xstring';
import { cellText } from './long-text';
import { concatBytes } from '../zip/streams';
import type { Bytes } from '../zip/zip.types';
import { withFuturePrefixes } from './future-functions';
import { richErrorSlot } from './value-errors';
import { conditionalXml, extensionXml, withConditional, withExtensions } from './conditional-part';
import { colsXml, mergesXml, rowAttributes } from './layout-part';
import { placeInTail } from './tail';
import type { SheetExtras } from './source';
import type { StyleBook } from './styles-part';
import { FormulaState } from '../../core/calc/calc.types';

export interface StringTable {
  index(text: string): number;
  bytes(): Promise<Bytes>;
}

export interface SheetWriting {
  readonly book: Workbook;
  readonly sheet: Sheet;
  readonly calculator: Calculator;
  readonly outdated: (sheet: Sheet, row: number, col: number) => boolean;
  readonly styles: StyleBook;
  readonly strings: StringTable;
  readonly extras: SheetExtras | undefined;
  readonly tables: readonly string[];
  readonly drawing: string | undefined;
  readonly keepConditional: boolean;
  readonly signal?: AbortSignal | undefined;
}

export interface SheetOutput {
  readonly chunks: readonly Bytes[];
  readonly stale: number;
  readonly spills: number;
  readonly errors: number;
}

interface Sink {
  push(piece: string): void;
  pause(): Promise<void>;
  chunks(): Bytes[];
}

interface CellCounts {
  stale: number;
  spills: number;
  errors: number;
}

interface FileFormula {
  readonly ast: FormulaNode;
  readonly array: CellRange | undefined;
}

const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

const RELATIONSHIPS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

const HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';

const CHUNK = 65_536;

const CHECK_EVERY = 128;

const BUDGET_MS = 6;

const SPACE_EDGE = /^\s|\s$/u;

const stringXml = (text: string): string => {
  const encoded = escapeText(encodeXstring(text));

  return SPACE_EDGE.test(text)
    ? `<si><t xml:space="preserve">${encoded}</t></si>`
    : `<si><t>${encoded}</t></si>`;
};

export const createStringTable = (): StringTable => {
  const items: string[] = [];
  const ids = new Map<string, number>();

  return {
    index: (text) => {
      const known = ids.get(text);

      if (known !== undefined) {
        return known;
      }
      ids.set(text, items.length);
      items.push(text);
      return items.length - 1;
    },
    bytes: async () => {
      const encoder = new TextEncoder();
      const count = String(items.length);

      const chunks: Bytes[] = [
        encoder.encode(`${HEADER}<sst xmlns="${MAIN}" count="${count}" uniqueCount="${count}">`),
      ];

      let started = performance.now();

      for (let from = 0; from < items.length; from += CHECK_EVERY) {
        chunks.push(
          encoder.encode(
            items
              .slice(from, from + CHECK_EVERY)
              .map(stringXml)
              .join(''),
          ),
        );

        if (performance.now() - started <= BUDGET_MS) {
          continue;
        }

        await nextTask();
        started = performance.now();
      }
      chunks.push(encoder.encode('</sst>'));
      return concatBytes(chunks);
    },
  };
};

const bandRange = (band: number): CellRange => ({
  top: band * CHUNK_ROWS,
  left: 0,
  bottom: band * CHUNK_ROWS + CHUNK_ROWS - 1,
  right: MAX_COLS - 1,
});

const formulaBands = (sheet: Sheet, calculator: Calculator): Map<number, number[]> => {
  const bands = new Map<number, number[]>();

  calculator.forEachFormula((owner, row, col) => {
    if (owner !== sheet) {
      return;
    }

    const band = Math.floor(row / CHUNK_ROWS);
    const keys = bands.get(band) ?? [];

    keys.push(row * MAX_COLS + col);
    bands.set(band, keys);
  });

  return bands;
};

const lastRowOf = (sheet: Sheet, formulas: ReadonlyMap<number, number[]>): number =>
  Math.max(
    sheet.cells.lastRow(),
    sheet.formats.lastRow(),
    sheet.decorations.lastRow(),
    sheet.layout.rows.last(),
    (max([...formulas.keys()]) ?? -1) * CHUNK_ROWS + CHUNK_ROWS - 1,
  );

const bandKeys = (
  sheet: Sheet,
  band: number,
  formulas: ReadonlyMap<number, number[]>,
): number[] => {
  const keys = new Set(formulas.get(band));
  const range = bandRange(band);

  const add = (row: number, col: number): void => {
    keys.add(row * MAX_COLS + col);
  };

  sheet.cells.forEachInRange(range, add);
  sheet.formats.forEachInRange(range, add);
  sheet.decorations.forEachInRange(range, add);
  return [...keys].toSorted((left, right) => left - right);
};

const numberText = (value: number): string => String(value);

const richErrors = (value: CellValue): number =>
  value.kind === CellValueKind.Error && richErrorSlot(value.code) !== undefined ? 1 : 0;

const valueParts = (
  value: CellValue,
  formula: boolean,
  strings: StringTable,
  q: string,
): readonly [string, string] => {
  const inner = (text: string): string => `<${q}v>${text}</${q}v>`;

  switch (value.kind) {
    case CellValueKind.Number:
      return ['', inner(numberText(value.value))];
    case CellValueKind.String:
      return formula
        ? [' t="str"', inner(escapeText(encodeXstring(cellText(value.value))))]
        : [' t="s"', inner(String(strings.index(cellText(value.value))))];
    case CellValueKind.Boolean:
      return [' t="b"', inner(value.value ? '1' : '0')];
    case CellValueKind.Error: {
      const slot = richErrorSlot(value.code);

      return slot === undefined
        ? [' t="e"', inner(escapeText(value.code))]
        : [` t="e" vm="${String(slot)}"`, inner(CellError.Value)];
    }
    default:
      return ['', ''];
  }
};

const createSink = (signal: AbortSignal | undefined): Sink => {
  const encoder = new TextEncoder();
  const bytes: Bytes[] = [];
  let pieces: string[] = [];
  let length = 0;
  let started = performance.now();

  const flush = (): void => {
    bytes.push(encoder.encode(pieces.join('')));
    pieces = [];
    length = 0;
  };

  return {
    push: (piece) => {
      pieces.push(piece);
      length += piece.length;
      if (length < CHUNK) {
        return;
      }

      flush();
    },
    pause: async () => {
      if (performance.now() - started <= BUDGET_MS) {
        return;
      }

      signal?.throwIfAborted();
      await nextTask();
      started = performance.now();
    },
    chunks: () => {
      flush();
      return bytes;
    },
  };
};

const multiCell = (range: CellRange | undefined): range is CellRange =>
  range !== undefined && (range.bottom > range.top || range.right > range.left);

const fileFormula = (
  writing: SheetWriting,
  place: { readonly row: number; readonly col: number },
  ast: FormulaNode,
): FileFormula => {
  const { sheet, calculator } = writing;
  const spill = calculator.spillOf(sheet, place.row, place.col);
  const context = bookArrays(writing.book, calculator.functions, sheet);

  if (multiCell(spill)) {
    return { ast, array: spill };
  }

  const legacy = withoutIntersections(ast);

  if (sameTree(withImplicitIntersections(legacy, context), ast)) {
    return { ast: legacy, array: undefined };
  }

  const self = { top: place.row, left: place.col, bottom: place.row, right: place.col };

  return { ast, array: needsArrayEvaluation(ast, context) ? self : undefined };
};

const formulaCellXml = (
  writing: SheetWriting,
  place: { readonly row: number; readonly col: number; readonly head: string },
  counts: CellCounts,
  q: string,
): string | undefined => {
  const { sheet, calculator } = writing;
  const formula = calculator.formulaAt(sheet, place.row, place.col);

  if (formula === undefined) {
    return undefined;
  }

  const written = fileFormula(writing, place, formula.ast);
  const text = escapeText(printFormula(withFuturePrefixes(written.ast), FILE_FORMULAS, place));
  const spill = written.array;
  const fresh = formula.state === FormulaState.Fresh || formula.state === FormulaState.Imported;
  const known = fresh && !writing.outdated(sheet, place.row, place.col);
  const value = sheet.cells.get(place.row, place.col);
  const [type, inner] = known ? valueParts(value, true, writing.strings, q) : ['', ''];

  counts.stale += known ? 0 : 1;
  counts.errors += known ? richErrors(value) : 0;
  if (spill === undefined) {
    return `${place.head}${type}><${q}f>${text}</${q}f>${inner}</${q}c>`;
  }
  counts.spills += 1;
  return `${place.head}${type} cm="1"><${q}f t="array" ref="${escapeAttribute(formatRange(spill))}">${text}</${q}f>${inner}</${q}c>`;
};

const cellXmlOf =
  (writing: SheetWriting, counts: CellCounts, q: string) =>
  (row: number, col: number): string => {
    const { sheet } = writing;
    const reference = formatCell({ row, col, rowAbsolute: false, colAbsolute: false });
    const style = writing.styles.xf(sheet.formats.get(row, col), sheet.decorations.get(row, col));
    const head = `<${q}c r="${reference}"${style === 0 ? '' : ` s="${String(style)}"`}`;
    const formula = formulaCellXml(writing, { row, col, head }, counts, q);

    if (formula !== undefined) {
      return formula;
    }

    const value = sheet.cells.get(row, col);
    const [type, inner] = valueParts(value, false, writing.strings, q);

    counts.errors += richErrors(value);
    if (inner === '') {
      return style === 0 ? '' : `${head}/>`;
    }
    return `${head}${type}>${inner}</${q}c>`;
  };

const tablePartsXml = (ids: readonly string[], q: string): string =>
  ids.length === 0
    ? ''
    : `<${q}tableParts xmlns:r="${RELATIONSHIPS}" count="${String(ids.length)}">${ids
        .map((id) => `<${q}tablePart r:id="${id}"/>`)
        .join('')}</${q}tableParts>`;

const drawingXml = (id: string | undefined, q: string): string =>
  id === undefined ? '' : `<${q}drawing xmlns:r="${RELATIONSHIPS}" r:id="${id}"/>`;

const withTables = (after: string, tables: string, q: string): string => {
  const extensions = after.search(new RegExp(`<${q}extLst[\\s>]`, 'u'));

  return extensions < 0
    ? after + tables
    : after.slice(0, extensions) + tables + after.slice(extensions);
};

const writeRows = async (
  writing: SheetWriting,
  sink: Sink,
  cellXml: (row: number, col: number) => string,
  q: string,
): Promise<void> => {
  const { rows } = writing.sheet.layout;
  const formulas = formulaBands(writing.sheet, writing.calculator);
  const lastBand = Math.floor(lastRowOf(writing.sheet, formulas) / CHUNK_ROWS);
  let row = -1;

  const open = (next: number): void => {
    sink.push(row < 0 ? '' : `</${q}row>`);
    sink.push(`<${q}row r="${String(next + 1)}"${rowAttributes(rows.get(next), writing.styles)}>`);
    row = next;
  };

  for (let band = 0; band <= lastBand; band += 1) {
    const keys = bandKeys(writing.sheet, band, formulas);
    const range = bandRange(band);
    const bare: number[] = [];
    let pending = 0;

    rows.forEachIn(range.top, range.bottom, (line) => {
      bare.push(line);
    });

    const openBefore = (limit: number): void => {
      while (pending < bare.length && (bare[pending] ?? limit) < limit) {
        open(bare[pending] ?? limit);
        pending += 1;
      }
    };

    await sink.pause();
    for (const [index, key] of keys.entries()) {
      const cellRow = Math.floor(key / MAX_COLS);

      if (cellRow !== row) {
        openBefore(cellRow);
        pending += bare[pending] === cellRow ? 1 : 0;
        open(cellRow);
      }
      sink.push(cellXml(cellRow, key % MAX_COLS));
      if (index % CHECK_EVERY !== 0) {
        continue;
      }

      await sink.pause();
    }
    openBefore(range.bottom + 1);
  }
  sink.push(row < 0 ? '' : `</${q}row>`);
};

export const writeSheetPart = async (writing: SheetWriting): Promise<SheetOutput> => {
  const { extras } = writing;
  const q = extras?.prefix ?? '';
  const sink = createSink(writing.signal);
  const counts: CellCounts = { stale: 0, spills: 0, errors: 0 };

  sink.push(HEADER);
  sink.push(extras?.root ?? `<worksheet xmlns="${MAIN}" xmlns:r="${RELATIONSHIPS}">`);
  sink.push(extras?.before ?? '');
  sink.push(colsXml(writing.sheet.layout.cols, writing.styles, q));
  sink.push(`<${q}sheetData>`);
  await writeRows(writing, sink, cellXmlOf(writing, counts, q), q);
  sink.push(`</${q}sheetData>`);
  const after = extras?.after ?? '';

  const conditional = writing.keepConditional
    ? after
    : withExtensions(
        withConditional(after, conditionalXml(writing.sheet.conditional, writing.styles, q)),
        extensionXml(writing.sheet.conditional),
        q,
      );

  const tail = placeInTail(conditional, mergesXml(writing.sheet.layout.merges, q), 'mergeCells');

  const drawn = placeInTail(tail, drawingXml(writing.drawing, q), 'drawing');

  sink.push(withTables(drawn, tablePartsXml(writing.tables, q), q));
  sink.push(`</${q}worksheet>`);

  return { chunks: sink.chunks(), ...counts };
};
