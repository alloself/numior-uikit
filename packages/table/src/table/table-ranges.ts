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

const spansAt = (ranges: NuiTableRanges, row: number): RangeSpan[] =>
  mergeSpans(
    ranges.flatMap((range) => {
      const box = boxOf(range);

      return row < box.top || row > box.bottom ? [] : [{ start: box.start, end: box.end }];
    }),
  );

const covers = (spans: readonly RangeSpan[], col: number): boolean =>
  spans.some((span) => col >= span.start && col <= span.end);

const cutsOf = (span: RangeSpan, around: readonly RangeSpan[]): number[] =>
  [...new Set(around.flatMap((other) => [other.start, other.end + 1]))]
    .filter((col) => col > span.start && col <= span.end)
    .toSorted((a, b) => a - b);

export const segmentsOf = (
  ranges: NuiTableRanges,
  row: number,
  offset: number,
): TableRangeSegment[] => {
  const own = spansAt(ranges, row);

  if (own.length === 0) {
    return [];
  }
  const above = spansAt(ranges, row - 1);
  const below = spansAt(ranges, row + 1);

  return own.flatMap((span) => {
    const edges = [span.start, ...cutsOf(span, [...above, ...below]), span.end + 1];

    return edges.slice(0, -1).map((from, index) => {
      const to = (edges[index + 1] ?? span.end + 1) - 1;

      return {
        from: from + offset,
        to: to + offset,
        top: !covers(above, from),
        bottom: !covers(below, from),
        start: from === span.start,
        end: to === span.end,
      };
    });
  });
};

const rangeOfBox = (box: RangeBox): NuiTableRange => ({
  from: { row: box.top, col: box.start },
  to: { row: box.bottom, col: box.end },
});

const overlaps = (a: RangeBox, b: RangeBox): boolean =>
  a.top <= b.bottom && b.top <= a.bottom && a.start <= b.end && b.start <= a.end;

const subtractRange = (range: NuiTableRange, cut: NuiTableRange): NuiTableRange[] => {
  const box = boxOf(range);
  const hole = boxOf(cut);

  if (!overlaps(box, hole)) {
    return [range];
  }
  const top = Math.max(box.top, hole.top);
  const bottom = Math.min(box.bottom, hole.bottom);

  return [
    { top: box.top, bottom: top - 1, start: box.start, end: box.end },
    { top, bottom, start: box.start, end: hole.start - 1 },
    { top, bottom, start: hole.end + 1, end: box.end },
    { top: bottom + 1, bottom: box.bottom, start: box.start, end: box.end },
  ]
    .filter((piece) => piece.top <= piece.bottom && piece.start <= piece.end)
    .map(rangeOfBox);
};

export const cutRanges = (ranges: NuiTableRanges, cut: NuiTableRange): NuiTableRange[] =>
  ranges.flatMap((range) => subtractRange(range, cut));

export const withLast = (others: NuiTableRanges, last: NuiTableRange): NuiTableRange[] => [
  ...cutRanges(others, last),
  last,
];

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
