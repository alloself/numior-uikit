import { MAX_COLS, MAX_ROWS, containsCell } from '../address';
import type { Calculator } from '../calc/calculator';
import type { CellContent } from '../calc/calc.types';
import { CellInputKind, CellValueKind, type CellAddress, type CellRange } from '../cell.types';
import type { CellDecoration } from '../decorations';
import { parseNumberFormat } from '../format/format-code';
import { SectionKind } from '../format/format.types';
import { followMove, type BlockMove, type FormulaPlace } from '../formula/follow-move';
import { numberValue, textValue } from '../values';
import type { Sheet, Workbook } from '../workbook';
import { FillMode, type CellClip, type CellClips, type ClipPaste } from './clip.types';
import { cellContentsIn, cellKey } from './contents';
import type { CellEdit, WorkbookStep } from './step.types';

interface Lane {
  readonly contents: readonly CellContent[];
  readonly formats: readonly string[];
  readonly decorations: readonly (CellDecoration | undefined)[];
}

interface Trend {
  readonly base: number;
  readonly step: number;
}

interface Numbered {
  readonly prefix: string;
  readonly digits: string;
}

interface Span {
  readonly start: number;
  readonly size: number;
}

interface FillDirection {
  readonly vertical: boolean;
  readonly backward: boolean;
}

interface FillPlan extends FillDirection {
  readonly start: number;
  readonly size: number;
  readonly cross: number;
  readonly lanes: number;
  readonly extra: number;
}

type Series = (index: number) => CellContent | undefined;

const GENERAL = 'General';

const PRECISION = 15;

const TRAILING_NUMBER = /^(.*?)(\d+)$/u;

const EMPTY: CellContent = { kind: CellInputKind.Empty };

const heightOf = (range: CellRange): number => range.bottom - range.top + 1;

const widthOf = (range: CellRange): number => range.right - range.left + 1;

const inSheet = (range: CellRange): boolean =>
  range.top >= 0 && range.left >= 0 && range.bottom < MAX_ROWS && range.right < MAX_COLS;

const cyclic = (index: number, size: number): number => ((index % size) + size) % size;

const rounded = (value: number): number => Number(value.toPrecision(PRECISION));

const trendOf = (values: readonly number[]): Trend => {
  const count = values.length;
  const meanX = (count - 1) / 2;
  const meanY = values.reduce((sum, value) => sum + value, 0) / count;

  const spread = values.reduce(
    (sums, value, index) => ({
      xy: sums.xy + (index - meanX) * (value - meanY),
      xx: sums.xx + (index - meanX) ** 2,
    }),
    { xy: 0, xx: 0 },
  );

  const step = spread.xx === 0 ? 0 : spread.xy / spread.xx;

  return { base: meanY - step * meanX, step };
};

const numberOf = (content: CellContent | undefined): number | undefined =>
  content?.kind === CellInputKind.Value && content.value.kind === CellValueKind.Number
    ? content.value.value
    : undefined;

const numberedOf = (content: CellContent | undefined): Numbered | undefined => {
  if (content?.kind !== CellInputKind.Value || content.value.kind !== CellValueKind.String) {
    return undefined;
  }

  const match = TRAILING_NUMBER.exec(content.value.value);

  return match === null ? undefined : { prefix: match[1] ?? '', digits: match[2] ?? '' };
};

const isDateCode = (code: string): boolean =>
  parseNumberFormat(code).sections[0]?.kind === SectionKind.Date;

const definedAll = <T>(values: readonly (T | undefined)[]): T[] | undefined =>
  values.every((value) => value !== undefined)
    ? values.filter((value) => value !== undefined)
    : undefined;

const numberSeries = (lane: Lane): Series | undefined => {
  const numbers = definedAll(lane.contents.map(numberOf));

  if (numbers === undefined) {
    return undefined;
  }

  const single = numbers.length === 1;

  if (single && !isDateCode(lane.formats[0] ?? GENERAL)) {
    return undefined;
  }

  const trend = single ? { base: numbers[0] ?? 0, step: 1 } : trendOf(numbers);

  return (index) => ({
    kind: CellInputKind.Value,
    value: numberValue(rounded(trend.base + trend.step * index)),
  });
};

const textSeries = (lane: Lane): Series | undefined => {
  const parts = definedAll(lane.contents.map(numberedOf));
  const prefix = parts?.[0]?.prefix;

  if (parts === undefined || parts.some((part) => part.prefix !== prefix)) {
    return undefined;
  }

  const width = Math.max(...parts.map((part) => part.digits.length));
  const numbers = parts.map((part) => Number(part.digits));
  const trend = numbers.length === 1 ? { base: numbers[0] ?? 0, step: 1 } : trendOf(numbers);

  return (index) => ({
    kind: CellInputKind.Value,
    value: textValue(
      `${prefix ?? ''}${String(Math.abs(Math.round(trend.base + trend.step * index))).padStart(width, '0')}`,
    ),
  });
};

const seriesOf = (lane: Lane, mode: FillMode): Series | undefined =>
  mode === FillMode.Copy ? undefined : (numberSeries(lane) ?? textSeries(lane));

const alongOf = (range: CellRange, vertical: boolean): Span =>
  vertical
    ? { start: range.top, size: heightOf(range) }
    : { start: range.left, size: widthOf(range) };

const fillDirection = (source: CellRange, target: CellRange): FillDirection | undefined => {
  const vertical = source.left === target.left && source.right === target.right;
  const horizontal = source.top === target.top && source.bottom === target.bottom;

  if (vertical === horizontal) {
    return undefined;
  }

  const from = alongOf(source, vertical);
  const to = alongOf(target, vertical);
  const longer = to.size > from.size;
  const forward = longer && to.start === from.start;
  const backward = longer && to.start + to.size === from.start + from.size;

  return forward || backward ? { vertical, backward } : undefined;
};

const fillPlan = (source: CellRange, target: CellRange): FillPlan | undefined => {
  const direction = fillDirection(source, target);

  if (direction === undefined) {
    return undefined;
  }

  const along = alongOf(source, direction.vertical);
  const across = alongOf(source, !direction.vertical);

  return {
    ...direction,
    start: along.start,
    size: along.size,
    cross: across.start,
    lanes: across.size,
    extra: alongOf(target, direction.vertical).size - along.size,
  };
};

const planCell = (plan: FillPlan, lane: number, index: number): CellAddress =>
  plan.vertical
    ? { row: plan.start + index, col: plan.cross + lane }
    : { row: plan.cross + lane, col: plan.start + index };

const tiledArea = (clip: CellClip, target: CellRange): CellRange => {
  const rows = heightOf(target);
  const cols = widthOf(target);
  const tiles = rows % clip.rows === 0 && cols % clip.cols === 0;

  return {
    top: target.top,
    left: target.left,
    bottom: target.top + (tiles ? rows : clip.rows) - 1,
    right: target.left + (tiles ? cols : clip.cols) - 1,
  };
};

const placedContent = (
  content: CellContent | undefined,
  move: BlockMove,
  from: FormulaPlace,
  to: FormulaPlace,
) =>
  content?.kind === CellInputKind.Formula
    ? { kind: content.kind, ast: followMove(content.ast, move, from, to) }
    : content;

export const createCellClips = (book: Workbook, calculator: Calculator): CellClips => {
  const blank = book.decorations.get(0);

  const sheetNamed = (name: string): Sheet | undefined => book.sheet(name);

  const formatAt = (sheet: Sheet, row: number, col: number): string =>
    book.formats.code(sheet.formats.get(row, col));

  const decorationAt = (sheet: Sheet, row: number, col: number): CellDecoration | undefined => {
    const id = sheet.decorations.get(row, col);

    return id === 0 ? undefined : book.decorations.get(id);
  };

  const cleared = (row: number, col: number): CellEdit => ({
    row,
    col,
    content: EMPTY,
    format: GENERAL,
    decoration: blank,
  });

  const written = (cell: CellEdit, row: number, col: number): CellEdit => ({
    row,
    col,
    content: cell.content ?? EMPTY,
    format: cell.format ?? GENERAL,
    decoration: cell.decoration ?? blank,
  });

  const copy = (name: string, range: CellRange): CellClip | undefined => {
    const sheet = sheetNamed(name);

    if (sheet === undefined || !inSheet(range)) {
      return undefined;
    }

    const cells = [...cellContentsIn(book, calculator, sheet, range).values()].map(
      (cell): CellEdit => ({ ...cell, row: cell.row - range.top, col: cell.col - range.left }),
    );

    return {
      sheet: name,
      origin: { row: range.top, col: range.left },
      rows: heightOf(range),
      cols: widthOf(range),
      cells,
    };
  };

  const pasteEdits = (sheet: Sheet, clip: CellClip, area: CellRange): Map<number, CellEdit> => {
    const edits = new Map<number, CellEdit>();

    for (const cell of cellContentsIn(book, calculator, sheet, area).values()) {
      edits.set(cellKey(cell.row, cell.col), cleared(cell.row, cell.col));
    }
    for (let top = area.top; top <= area.bottom; top += clip.rows) {
      for (let left = area.left; left <= area.right; left += clip.cols) {
        for (const cell of clip.cells) {
          const row = top + cell.row;
          const col = left + cell.col;

          edits.set(cellKey(row, col), written(cell, row, col));
        }
      }
    }
    return edits;
  };

  const paste = (name: string, clip: CellClip, target: CellRange): ClipPaste | undefined => {
    const sheet = sheetNamed(name);
    const area = tiledArea(clip, target);

    if (sheet === undefined || !inSheet(area)) {
      return undefined;
    }
    return {
      step: { kind: 'setCells', sheet: name, cells: [...pasteEdits(sheet, clip, area).values()] },
      area,
    };
  };

  const move = (name: string, clip: CellClip, at: CellAddress): ClipPaste | undefined => {
    const sheet = sheetNamed(name);
    const from = sheetNamed(clip.sheet);

    const area = {
      top: at.row,
      left: at.col,
      bottom: at.row + clip.rows - 1,
      right: at.col + clip.cols - 1,
    };

    if (sheet === undefined || from === undefined || !inSheet(area)) {
      return undefined;
    }

    const sourceArea: CellRange = {
      top: clip.origin.row,
      left: clip.origin.col,
      bottom: clip.origin.row + clip.rows - 1,
      right: clip.origin.col + clip.cols - 1,
    };

    const carried: BlockMove = {
      from: from.name,
      area: sourceArea,
      to: sheet.name,
      rows: at.row - clip.origin.row,
      cols: at.col - clip.origin.col,
    };

    const placed: CellClip = {
      ...clip,
      cells: clip.cells.map((cell) => ({
        ...cell,
        content: placedContent(
          cell.content,
          carried,
          {
            sheet: from.name,
            origin: { row: clip.origin.row + cell.row, col: clip.origin.col + cell.col },
          },
          { sheet: sheet.name, origin: { row: at.row + cell.row, col: at.col + cell.col } },
        ),
      })),
    };

    const sources = [...cellContentsIn(book, calculator, from, sourceArea).values()].map((cell) =>
      cleared(cell.row, cell.col),
    );

    const edits = new Map<Sheet, CellEdit[]>([
      [from, sources],
      [sheet, [...(from === sheet ? sources : []), ...pasteEdits(sheet, placed, area).values()]],
    ]);

    calculator.forEachFormula((owner, row, col, ast) => {
      if (
        (owner === from && containsCell(sourceArea, row, col)) ||
        (owner === sheet && containsCell(area, row, col))
      ) {
        return;
      }
      const followed = followMove(ast, carried, { sheet: owner.name, origin: { row, col } });

      if (followed !== ast) {
        const known = edits.get(owner) ?? [];

        known.push({ row, col, content: { kind: 'formula', ast: followed } });
        edits.set(owner, known);
      }
    });

    const steps = [...edits].reduce<WorkbookStep[]>((found, [owner, cells]) => {
      if (cells.length > 0) {
        found.push({ kind: 'setCells', sheet: owner.name, cells });
      }
      return found;
    }, []);

    const [only] = steps;

    return {
      step: steps.length === 1 && only !== undefined ? only : { kind: 'batch', steps },
      area,
    };
  };

  const laneOf = (sheet: Sheet, cells: readonly CellAddress[]): Lane => ({
    contents: cells.map((cell) => calculator.contentAt(sheet, cell.row, cell.col)),
    formats: cells.map((cell) => formatAt(sheet, cell.row, cell.col)),
    decorations: cells.map((cell) => decorationAt(sheet, cell.row, cell.col)),
  });

  const laneEdits = (sheet: Sheet, plan: FillPlan, lane: number, mode: FillMode): CellEdit[] => {
    const pattern = laneOf(
      sheet,
      Array.from({ length: plan.size }, (_, index) => planCell(plan, lane, index)),
    );

    const series = seriesOf(pattern, mode);

    return Array.from({ length: plan.extra }, (_, step): CellEdit => {
      const index = plan.backward ? -step - 1 : plan.size + step;
      const slot = cyclic(index, plan.size);
      const place = planCell(plan, lane, index);

      return {
        row: place.row,
        col: place.col,
        content: series?.(index) ?? pattern.contents[slot] ?? EMPTY,
        format: pattern.formats[slot] ?? GENERAL,
        decoration: pattern.decorations[slot] ?? blank,
      };
    });
  };

  const fill = (
    name: string,
    source: CellRange,
    target: CellRange,
    mode: FillMode = FillMode.Series,
  ): WorkbookStep | undefined => {
    const sheet = sheetNamed(name);
    const plan = fillPlan(source, target);

    if (sheet === undefined || plan === undefined || !inSheet(target)) {
      return undefined;
    }
    return {
      kind: 'setCells',
      sheet: name,
      cells: Array.from({ length: plan.lanes }, (_, lane) => lane).flatMap((lane) =>
        laneEdits(sheet, plan, lane, mode),
      ),
    };
  };

  const clear = (name: string, ranges: readonly CellRange[]): WorkbookStep | undefined => {
    const sheet = sheetNamed(name);

    if (sheet === undefined) {
      return undefined;
    }

    const edits = new Map<number, CellEdit>();

    for (const range of ranges) {
      for (const cell of cellContentsIn(book, calculator, sheet, range).values()) {
        if (cell.content?.kind !== CellInputKind.Empty) {
          edits.set(cellKey(cell.row, cell.col), { row: cell.row, col: cell.col, content: EMPTY });
        }
      }
    }
    return edits.size === 0
      ? undefined
      : { kind: 'setCells', sheet: name, cells: [...edits.values()] };
  };

  return { copy, paste, move, fill, clear };
};
