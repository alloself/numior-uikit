import { MAX_COLS, MAX_ROWS } from '../address';
import type { CellContent } from '../calc/calc.types';
import type { Calculator } from '../calc/calculator';
import { CellInputKind, type CellRange } from '../cell.types';
import { followMove } from '../formula/follow-move';
import type { Sheet, Workbook } from '../workbook';
import { mergesStep, rangesMeet } from './clip-merges';
import { cellContentsIn, cellKey } from './contents';
import { StepKind, type CellEdit, type WorkbookStep } from './step.types';

export interface CellsMerge {
  readonly steps: readonly WorkbookStep[];
  readonly dropped: number;
}

interface MergeEdits {
  readonly cells: CellEdit[];
  dropped: number;
}

const EMPTY: CellContent = { kind: CellInputKind.Empty };

const isMany = (range: CellRange): boolean => range.bottom > range.top || range.right > range.left;

const isWholeLine = (range: CellRange): boolean =>
  (range.top === 0 && range.bottom === MAX_ROWS - 1) ||
  (range.left === 0 && range.right === MAX_COLS - 1);

const sameRange = (left: CellRange, right: CellRange): boolean =>
  left.top === right.top &&
  left.left === right.left &&
  left.bottom === right.bottom &&
  left.right === right.right;

const meetsAny = (range: CellRange, others: readonly CellRange[]): boolean =>
  others.some((other) => rangesMeet(other, range));

const isFilled = (cell: CellEdit): boolean =>
  cell.content !== undefined && cell.content.kind !== CellInputKind.Empty;

const filledIn = (
  book: Workbook,
  calculator: Calculator,
  sheet: Sheet,
  range: CellRange,
): CellEdit[] =>
  [...cellContentsIn(book, calculator, sheet, range).values()]
    .filter(isFilled)
    .toSorted((left, right) => cellKey(left.row, left.col) - cellKey(right.row, right.col));

const carried = (sheet: Sheet, cell: CellEdit, range: CellRange): CellContent | undefined =>
  cell.content?.kind === CellInputKind.Formula
    ? {
        kind: cell.content.kind,
        ast: followMove(
          cell.content.ast,
          {
            from: sheet.name,
            area: { top: cell.row, left: cell.col, bottom: cell.row, right: cell.col },
            to: sheet.name,
            rows: range.top - cell.row,
            cols: range.left - cell.col,
          },
          { sheet: sheet.name, origin: { row: cell.row, col: cell.col } },
          { sheet: sheet.name, origin: { row: range.top, col: range.left } },
        ),
      }
    : cell.content;

const emptied = (cell: CellEdit): CellEdit => ({ row: cell.row, col: cell.col, content: EMPTY });

const keepFirst = (sheet: Sheet, range: CellRange, filled: readonly CellEdit[]): CellEdit[] => {
  const [kept, ...rest] = filled;
  const cleared = rest.map(emptied);

  if (kept === undefined || (kept.row === range.top && kept.col === range.left)) {
    return cleared;
  }
  return [
    {
      row: range.top,
      col: range.left,
      content: carried(sheet, kept, range),
      format: kept.format,
    },
    emptied(kept),
    ...cleared,
  ];
};

export const mergeableRanges = (sheet: Sheet, ranges: readonly CellRange[]): CellRange[] => {
  const wanted = ranges.filter(
    (range) =>
      isMany(range) &&
      !isWholeLine(range) &&
      !sheet.layout.merges.some((merge) => sameRange(merge, range)),
  );

  const crossing = wanted.some((range, index) => meetsAny(range, wanted.slice(index + 1)));

  return crossing ? [] : wanted;
};

export const mergeBlocked = (book: Workbook, sheet: Sheet, ranges: readonly CellRange[]): boolean =>
  ranges.some(
    (range) =>
      book.tables.on(sheet).some((table) => rangesMeet(table.range, range)) ||
      book.pivots
        .on(sheet)
        .some((pivot) => pivot.footprint !== undefined && rangesMeet(pivot.footprint, range)),
  );

export const mergeCells = (
  book: Workbook,
  calculator: Calculator,
  sheet: Sheet,
  ranges: readonly CellRange[],
): CellsMerge => {
  const edits = ranges.reduce<MergeEdits>(
    (found, range) => {
      const filled = filledIn(book, calculator, sheet, range);

      for (const edit of keepFirst(sheet, range, filled)) {
        found.cells.push(edit);
      }
      found.dropped += Math.max(filled.length - 1, 0);
      return found;
    },
    { cells: [], dropped: 0 },
  );

  const layout = mergesStep(sheet, [
    ...sheet.layout.merges.filter((merge) => !meetsAny(merge, ranges)),
    ...ranges,
  ]);

  const steps: WorkbookStep[] = layout === undefined ? [] : [layout];

  if (edits.cells.length > 0) {
    steps.push({ kind: StepKind.SetCells, sheet: sheet.name, cells: edits.cells });
  }
  return { steps, dropped: edits.dropped };
};

export const unmergeCells = (sheet: Sheet, ranges: readonly CellRange[]): WorkbookStep[] => {
  const left = sheet.layout.merges.filter((merge) => !meetsAny(merge, ranges));
  const step = left.length === sheet.layout.merges.length ? undefined : mergesStep(sheet, left);

  return step === undefined ? [] : [step];
};
