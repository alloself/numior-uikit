import { containsCell } from '../address';
import type { CellRange } from '../cell.types';
import { layoutDelta } from '../layout/merge-layout';
import type { Sheet } from '../workbook';
import { StepKind, type CellEdit, type WorkbookStep } from './step.types';

export const rangesMeet = (left: CellRange, right: CellRange): boolean =>
  left.top <= right.bottom &&
  right.top <= left.bottom &&
  left.left <= right.right &&
  right.left <= left.right;

export const rangeHolds = (outer: CellRange, inner: CellRange): boolean =>
  inner.top >= outer.top &&
  inner.bottom <= outer.bottom &&
  inner.left >= outer.left &&
  inner.right <= outer.right;

export const shiftedRange = (range: CellRange, rows: number, cols: number): CellRange => ({
  top: range.top + rows,
  left: range.left + cols,
  bottom: range.bottom + rows,
  right: range.right + cols,
});

export const mergesMeeting = (sheet: Sheet, area: CellRange): CellRange[] =>
  sheet.layout.merges.filter((merge) => rangesMeet(merge, area));

const covers = (merge: CellRange, row: number, col: number): boolean =>
  containsCell(merge, row, col) && (row !== merge.top || col !== merge.left);

export const outsideCovered = <E extends Pick<CellEdit, 'row' | 'col'>>(
  merges: readonly CellRange[],
  edits: readonly E[],
): readonly E[] =>
  merges.length === 0
    ? edits
    : edits.filter((edit) => !merges.some((merge) => covers(merge, edit.row, edit.col)));

export const mergesStep = (
  sheet: Sheet,
  merges: readonly CellRange[],
): WorkbookStep | undefined => {
  const delta = layoutDelta(sheet.layout, { ...sheet.layout, merges });

  return delta === undefined
    ? undefined
    : { kind: StepKind.SetLayout, sheet: sheet.name, ...delta };
};

export const mergesApartStep = (sheet: Sheet, area: CellRange): WorkbookStep | undefined => {
  const met = mergesMeeting(sheet, area);

  return met.length === 0
    ? undefined
    : mergesStep(
        sheet,
        sheet.layout.merges.filter((merge) => !met.includes(merge)),
      );
};

export const batched = (steps: readonly WorkbookStep[]): WorkbookStep | undefined => {
  const [only] = steps;

  if (only === undefined) {
    return undefined;
  }
  return steps.length === 1 ? only : { kind: StepKind.Batch, steps };
};
