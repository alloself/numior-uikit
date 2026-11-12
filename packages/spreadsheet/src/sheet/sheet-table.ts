import type { LineLayouts, Sheet } from '../core';
import type { SheetSource } from './sheet.types';

export interface ColumnShape {
  readonly sheet: Sheet;
  readonly lines: LineLayouts;
  readonly width: number | undefined;
  readonly frozen: number;
  readonly source: SheetSource;
}

export const sameColumns = (one: ColumnShape, other: ColumnShape): boolean =>
  one.sheet === other.sheet &&
  one.lines === other.lines &&
  one.width === other.width &&
  one.frozen === other.frozen;

export const liveSource = (
  built: SheetSource,
  current: () => SheetSource | undefined,
): SheetSource => {
  const now = (): SheetSource => current() ?? built;

  return {
    get rows() {
      return now().rows;
    },
    cols: built.cols,
    cellAt: (row, col) => now().cellAt(row, col),
    nextEdge: (from, direction) => now().nextEdge(from, direction),
    lastCell: () => now().lastCell(),
    columnWidth: (col) => built.columnWidth(col),
    rowLabel: (row) => now().rowLabel(row),
    columnLabel: (col) => built.columnLabel(col),
  };
};
