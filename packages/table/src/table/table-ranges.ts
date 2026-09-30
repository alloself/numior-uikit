import { clamp } from '@vueuse/core';
import { listMoveFor } from '@numior/primitives';
import type {
  NuiTableRange,
  NuiTableRanges,
  TableCellPosition,
  TableRangeSegment,
} from './table.types';

export interface RangeBounds {
  readonly rows: number;
  readonly cols: number;
}

export interface RangeBox {
  readonly top: number;
  readonly bottom: number;
  readonly start: number;
  readonly end: number;
}

export interface RangeSpan {
  readonly start: number;
  readonly end: number;
}

export type CopyShape =
  | {
      readonly kind: 'block';
      readonly rows: readonly RangeSpan[];
      readonly cols: readonly RangeSpan[];
    }
  | { readonly kind: 'disjoint' };

export interface CornerKey {
  readonly key: string;
  readonly ctrl: boolean;
  readonly page: number;
  readonly rtl: boolean;
}

export const boxOf = (range: NuiTableRange): RangeBox => ({
  top: Math.min(range.from.row, range.to.row),
  bottom: Math.max(range.from.row, range.to.row),
  start: Math.min(range.from.col, range.to.col),
  end: Math.max(range.from.col, range.to.col),
});

const samePosition = (a: TableCellPosition, b: TableCellPosition): boolean =>
  a.row === b.row && a.col === b.col;

export const sameRanges = (a: NuiTableRanges, b: NuiTableRanges): boolean =>
  a.length === b.length &&
  a.every((range, index) => {
    const other = b[index];

    return (
      other !== undefined &&
      samePosition(range.from, other.from) &&
      samePosition(range.to, other.to)
    );
  });

export const clampPosition = (
  position: TableCellPosition,
  bounds: RangeBounds,
): TableCellPosition => ({
  row: clamp(position.row, 0, Math.max(0, bounds.rows - 1)),
  col: clamp(position.col, 0, Math.max(0, bounds.cols - 1)),
});

export const inRanges = (ranges: NuiTableRanges, position: TableCellPosition): boolean =>
  ranges.some((range) => {
    const box = boxOf(range);

    return (
      position.row >= box.top &&
      position.row <= box.bottom &&
      position.col >= box.start &&
      position.col <= box.end
    );
  });

export const segmentsOf = (
  ranges: NuiTableRanges,
  row: number,
  offset: number,
): TableRangeSegment[] =>
  ranges.flatMap((range) => {
    const box = boxOf(range);

    return row < box.top || row > box.bottom
      ? []
      : [
          {
            from: box.start + offset,
            to: box.end + offset,
            top: row === box.top,
            bottom: row === box.bottom,
          },
        ];
  });

export const withCorner = (
  ranges: NuiTableRanges,
  from: TableCellPosition,
  to: TableCellPosition,
): NuiTableRange[] => {
  const last = ranges.at(-1);

  return last === undefined ? [{ from, to }] : [...ranges.slice(0, -1), { from: last.from, to }];
};

export const rowsOf = (range: NuiTableRange, bounds: RangeBounds): NuiTableRange => ({
  from: { row: range.from.row, col: 0 },
  to: { row: range.to.row, col: Math.max(0, bounds.cols - 1) },
});

export const colsOf = (range: NuiTableRange, bounds: RangeBounds): NuiTableRange => ({
  from: { row: 0, col: range.from.col },
  to: { row: Math.max(0, bounds.rows - 1), col: range.to.col },
});

export const allOf = (bounds: RangeBounds): NuiTableRange => ({
  from: { row: 0, col: 0 },
  to: { row: Math.max(0, bounds.rows - 1), col: Math.max(0, bounds.cols - 1) },
});

const edgeCorner = (
  input: CornerKey,
  corner: TableCellPosition,
  bounds: RangeBounds,
): TableCellPosition | undefined => {
  const lastRow = bounds.rows - 1;
  const lastCol = bounds.cols - 1;

  switch (input.key) {
    case 'Home':
      return input.ctrl ? { row: 0, col: 0 } : { row: corner.row, col: 0 };
    case 'End':
      return input.ctrl ? { row: lastRow, col: lastCol } : { row: corner.row, col: lastCol };
    default:
      return undefined;
  }
};

const rowStep = (input: CornerKey, corner: TableCellPosition, bounds: RangeBounds) => {
  switch (input.key) {
    case 'ArrowUp':
      return input.ctrl ? 0 : corner.row - 1;
    case 'ArrowDown':
      return input.ctrl ? bounds.rows - 1 : corner.row + 1;
    case 'PageUp':
      return corner.row - input.page;
    case 'PageDown':
      return corner.row + input.page;
    default:
      return undefined;
  }
};

const colStep = (input: CornerKey, corner: TableCellPosition, bounds: RangeBounds) => {
  switch (listMoveFor(input.key, 'horizontal', input.rtl)) {
    case 'next':
      return input.ctrl ? bounds.cols - 1 : corner.col + 1;
    case 'prev':
      return input.ctrl ? 0 : corner.col - 1;
    default:
      return undefined;
  }
};

export const stepCorner = (
  corner: TableCellPosition,
  input: CornerKey,
  bounds: RangeBounds,
): TableCellPosition | undefined => {
  const edge = edgeCorner(input, corner, bounds);
  const row = rowStep(input, corner, bounds);
  const col = colStep(input, corner, bounds);

  if (edge !== undefined) {
    return clampPosition(edge, bounds);
  }
  if (row !== undefined) {
    return clampPosition({ row, col: corner.col }, bounds);
  }
  return col === undefined ? undefined : clampPosition({ row: corner.row, col }, bounds);
};

const mergeSpans = (spans: readonly RangeSpan[]): RangeSpan[] => {
  const merged: RangeSpan[] = [];

  for (const span of spans.toSorted((a, b) => a.start - b.start)) {
    const last = merged.at(-1);

    if (last !== undefined && span.start <= last.end + 1) {
      merged[merged.length - 1] = { start: last.start, end: Math.max(last.end, span.end) };
    } else {
      merged.push(span);
    }
  }
  return merged;
};

export const copyShapeOf = (ranges: NuiTableRanges): CopyShape => {
  const boxes = ranges.map(boxOf);
  const first = boxes[0];

  if (first === undefined) {
    return { kind: 'disjoint' };
  }
  if (boxes.every((box) => box.top === first.top && box.bottom === first.bottom)) {
    return {
      kind: 'block',
      rows: [{ start: first.top, end: first.bottom }],
      cols: mergeSpans(boxes.map((box) => ({ start: box.start, end: box.end }))),
    };
  }
  if (boxes.every((box) => box.start === first.start && box.end === first.end)) {
    return {
      kind: 'block',
      rows: mergeSpans(boxes.map((box) => ({ start: box.top, end: box.bottom }))),
      cols: [{ start: first.start, end: first.end }],
    };
  }
  return { kind: 'disjoint' };
};

export const spanLength = (spans: readonly RangeSpan[]): number =>
  spans.reduce((sum, span) => sum + span.end - span.start + 1, 0);

export const spanItems = (spans: readonly RangeSpan[]): number[] =>
  spans.flatMap((span) =>
    Array.from({ length: span.end - span.start + 1 }, (_, index) => span.start + index),
  );
