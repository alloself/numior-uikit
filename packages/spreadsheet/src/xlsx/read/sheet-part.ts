import { MAX_COLS, MAX_ROWS, parseRange } from '../../core/address';
import { bookArrays, withImplicitIntersections } from '../../core/calc/array-formula';
import type { Calculator } from '../../core/calc/calculator';
import type { CellRange, CellValue } from '../../core/cell.types';
import type { FormulaNode } from '../../core/formula/formula.types';
import { EN_FORMULAS } from '../../core/formula/locale';
import { parseFormula } from '../../core/formula/parser';
import { formulaReferences } from '../../core/formula/references';
import {
  EMPTY,
  booleanValue,
  errorValue,
  isCellError,
  numberValue,
  textValue,
} from '../../core/values';
import type { Sheet, Workbook } from '../../core/workbook';
import type { DifferentialStyle } from '../../core/conditional/conditional.types';
import type { XmlAttribute } from '../xml/xml.types';
import { X14, createConditionalCollector, createExtensionCollector } from './conditional-part';
import { decodeXstring } from '../xml/xstring';
import { createFragmentRecorder } from './fragment-part';
import { createLayoutCollector } from './layout-part';
import type { ZipArchive } from '../zip/zip.types';
import { MAIN, attributeOf, numberOf, readPart, type PartOptions } from './ooxml';

export interface SheetContext {
  readonly book: Workbook;
  readonly calculator: Calculator;
  readonly sheet: Sheet;
  readonly strings: readonly string[];
  readonly formats: readonly string[];
  readonly decorations: readonly number[];
  readonly differentials: readonly DifferentialStyle[];
  readonly known: (name: string) => boolean;
  readonly recalculate: boolean;
}

export interface SheetCounts {
  formulas: number;
  kept: number;
  unparsed: number;
  dataTables: number;
  merges: number;
  conditional: number;
  validations: number;
  hyperlinks: number;
  drawings: number;
  comments: number;
  layout: number;
  protection: number;
  externalTables: number;
  readonly unknown: Set<string>;
}

type FormulaKind = 'normal' | 'shared' | 'array' | 'dataTable';

interface Cell {
  row: number;
  col: number;
  type: string;
  style: number;
  value: string;
  inline: string;
  formula:
    | { kind: FormulaKind; ref: string | undefined; shared: string | undefined; text: string }
    | undefined;
}

const PREFIXES = /_xl(?:fn|ws|pm)\./gu;

const DAY_MS = 86_400_000;

const EPOCH_SERIAL = 25_569;

const COUNTED: Readonly<Record<string, keyof Omit<SheetCounts, 'unknown'>>> = {
  dataValidation: 'validations',
  hyperlink: 'hyperlinks',
  drawing: 'drawings',
  legacyDrawing: 'comments',
  pane: 'layout',
  sheetProtection: 'protection',
};

const emptyCounts = (): SheetCounts => ({
  formulas: 0,
  kept: 0,
  unparsed: 0,
  dataTables: 0,
  merges: 0,
  conditional: 0,
  validations: 0,
  hyperlinks: 0,
  drawings: 0,
  comments: 0,
  layout: 0,
  protection: 0,
  externalTables: 0,
  unknown: new Set(),
});

const upperLetter = (code: number): boolean => code >= 65 && code <= 90;

export const cellOf = (reference: string): { row: number; col: number } | undefined => {
  let col = 0;
  let index = 0;

  while (index < reference.length && upperLetter(reference.charCodeAt(index))) {
    col = col * 26 + reference.charCodeAt(index) - 64;
    index += 1;
  }

  const row = Number(reference.slice(index));

  return col === 0 || !Number.isInteger(row) || row < 1 || row > MAX_ROWS || col > MAX_COLS
    ? undefined
    : { row: row - 1, col: col - 1 };
};

export const valueOf = (
  cell: Pick<Cell, 'type' | 'value' | 'inline'>,
  strings: readonly string[],
): CellValue => {
  switch (cell.type) {
    case 's':
      return textValue(strings[numberOf(cell.value, -1)] ?? '');
    case 'str':
      return textValue(decodeXstring(cell.value));
    case 'inlineStr':
      return textValue(decodeXstring(cell.inline));
    case 'b':
      return booleanValue(cell.value === '1' || cell.value === 'true');
    case 'e':
      return isCellError(cell.value) ? errorValue(cell.value) : errorValue('#VALUE!');
    case 'd': {
      const time = Date.parse(cell.value.endsWith('Z') ? cell.value : `${cell.value}Z`);

      return Number.isFinite(time) ? numberValue(time / DAY_MS + EPOCH_SERIAL) : EMPTY;
    }
    default:
      return cell.value === '' ? EMPTY : numberValue(numberOf(cell.value, 0));
  }
};

const callsIn = (node: FormulaNode, visit: (name: string) => void): void => {
  switch (node.kind) {
    case 'call':
      visit(node.name);
      node.args.forEach((arg) => callsIn(arg, visit));
      return;
    case 'unary':
    case 'percent':
      callsIn(node.operand, visit);
      return;
    case 'binary':
      callsIn(node.left, visit);
      callsIn(node.right, visit);
      return;
    default:
      return;
  }
};

const formulaKind = (text: string | undefined): FormulaKind => {
  switch (text) {
    case 'shared':
    case 'array':
    case 'dataTable':
      return text;
    default:
      return 'normal';
  }
};

const spillOf = (cell: Cell): CellRange | undefined =>
  cell.formula?.kind === 'array' && cell.formula.ref !== undefined
    ? parseRange(cell.formula.ref)
    : undefined;

export const readSheetPart = async (
  archive: ZipArchive,
  part: string,
  context: SheetContext,
  options: PartOptions,
): Promise<SheetCounts> => {
  const { calculator, sheet } = context;
  const counts = emptyCounts();
  const shared = new Map<string, FormulaNode>();
  let row = -1;
  let col = -1;
  let cell: Cell | undefined;
  let capture: 'value' | 'formula' | 'inline' | undefined;
  let phonetic = 0;
  const conditional = createConditionalCollector(context.differentials);
  const extensions = createExtensionCollector();
  const layout = createLayoutCollector(context);
  const recorder = createFragmentRecorder();
  let depth = 0;
  let inData = false;

  const astOf = (current: Cell): FormulaNode | undefined => {
    const formula = current.formula;

    if (formula === undefined) {
      return undefined;
    }
    if (formula.text === '' && formula.shared !== undefined) {
      return shared.get(formula.shared);
    }

    const parsed = parseFormula(formula.text.replaceAll(PREFIXES, ''), EN_FORMULAS, current);

    if (!parsed.ok) {
      return undefined;
    }

    const ast =
      formula.kind === 'array'
        ? parsed.ast
        : withImplicitIntersections(
            parsed.ast,
            bookArrays(context.book, calculator.functions, sheet),
          );

    if (formula.kind === 'shared' && formula.shared !== undefined) {
      shared.set(formula.shared, ast);
    }
    return ast;
  };

  const commitFormula = (current: Cell, value: CellValue): void => {
    const ast = current.formula?.kind === 'dataTable' ? undefined : astOf(current);

    if (ast === undefined) {
      counts[current.formula?.kind === 'dataTable' ? 'dataTables' : 'unparsed'] += 1;
      calculator.importValue(sheet, current.row, current.col, value);
      return;
    }

    let known = true;

    callsIn(ast, (name) => {
      if (!context.known(name)) {
        counts.unknown.add(name);
        known = false;
      }
    });

    const external = formulaReferences(ast).some(
      (reference) => reference.kind === 'structured' && reference.book !== undefined,
    );

    counts.formulas += 1;
    counts.kept += known ? 0 : 1;
    counts.externalTables += external ? 1 : 0;

    calculator.importFormula(sheet, current.row, current.col, ast, {
      value,
      spill: spillOf(current),
      recalculate: context.recalculate,
      keep: !known || external,
    });
  };

  const commit = (current: Cell): void => {
    const value = valueOf(current, context.strings);
    const format = context.formats[current.style];

    if (current.formula !== undefined) {
      commitFormula(current, value);
    } else if (value.kind !== 'empty') {
      calculator.importValue(sheet, current.row, current.col, value);
    }
    const decoration = context.decorations[current.style] ?? 0;

    if (format !== undefined && format !== 'General') {
      sheet.formats.set(current.row, current.col, context.book.formats.id(format));
    }
    if (decoration !== 0) {
      sheet.decorations.set(current.row, current.col, decoration);
    }
  };

  const openCell = (attributes: readonly XmlAttribute[]): void => {
    const reference = attributeOf(attributes, 'r');
    const place = reference === undefined ? { row, col: col + 1 } : cellOf(reference);

    if (place === undefined) {
      cell = undefined;
      return;
    }
    row = place.row;
    col = place.col;

    cell = {
      row,
      col,
      type: attributeOf(attributes, 't') ?? 'n',
      style: numberOf(attributeOf(attributes, 's'), 0),
      value: '',
      inline: '',
      formula: undefined,
    };
  };

  const openMain = (local: string, attributes: readonly XmlAttribute[]): void => {
    switch (local) {
      case 'row':
        row = numberOf(attributeOf(attributes, 'r'), row + 2) - 1;
        col = -1;
        counts.layout += attributeOf(attributes, 'customHeight') === '1' ? 1 : 0;
        layout.row(row, attributes);
        return;
      case 'col':
        counts.layout += 1;
        layout.col(attributes);
        return;
      case 'mergeCell':
        counts.merges += 1;
        layout.merge(attributeOf(attributes, 'ref'));
        return;
      case 'c':
        openCell(attributes);
        return;
      case 'v':
        capture = 'value';
        return;
      case 'f':
        capture = 'formula';
        if (cell !== undefined) {
          cell.formula = {
            kind: formulaKind(attributeOf(attributes, 't')),
            ref: attributeOf(attributes, 'ref'),
            shared: attributeOf(attributes, 'si'),
            text: '',
          };
        }
        return;
      case 't':
        capture = cell !== undefined && phonetic === 0 ? 'inline' : undefined;
        return;
      case 'rPh':
        phonetic += 1;
        return;
      default: {
        const counted = COUNTED[local];

        if (counted !== undefined) {
          counts[counted] += 1;
        }
      }
    }
  };

  await readPart(
    archive,
    part,
    {
      open: (element, attributes) => {
        if (depth === 1 && element.local === 'sheetData') {
          inData = true;
        } else if (depth >= 1 && !inData) {
          recorder.open(element, attributes);
        }
        depth += 1;
        if (
          conditional.inside() ||
          (element.local === 'conditionalFormatting' && MAIN.has(element.uri))
        ) {
          conditional.open(element, attributes);
        } else if (
          extensions.inside() ||
          (element.local === 'conditionalFormatting' && element.uri === X14)
        ) {
          extensions.open(element, attributes);
        } else if (MAIN.has(element.uri)) {
          openMain(element.local, attributes);
        }
      },
      text: (text) => {
        if (depth >= 2 && !inData) {
          recorder.text(text);
        }
        if (conditional.inside()) {
          conditional.text(text);
          return;
        }
        if (extensions.inside()) {
          extensions.text(text);
          return;
        }
        if (cell === undefined) {
          return;
        }
        switch (capture) {
          case 'value':
            cell.value += text;
            return;
          case 'inline':
            cell.inline += text;
            return;
          case 'formula':
            if (cell.formula !== undefined) {
              cell.formula.text += text;
            }
            return;
          default:
            return;
        }
      },
      close: (element) => {
        depth -= 1;
        if (inData && depth === 1) {
          inData = false;
          recorder.tail();
        } else if (depth >= 1 && !inData) {
          recorder.close(element);
        }
        if (conditional.inside()) {
          conditional.close(element);
          return;
        }
        if (extensions.inside()) {
          extensions.close(element);
          return;
        }
        switch (element.local) {
          case 'c':
            if (cell !== undefined) {
              commit(cell);
            }
            cell = undefined;
            return;
          case 'rPh':
            phonetic -= 1;
            return;
          case 'v':
          case 'f':
          case 't':
            capture = undefined;
            return;
          default:
            return;
        }
      },
    },
    options,
  );

  sheet.conditional = [...conditional.formats(), ...extensions.formats()];
  sheet.layout = { ...layout.layout(), xml: recorder.result() };
  counts.conditional = conditional.foreign();
  return counts;
};
