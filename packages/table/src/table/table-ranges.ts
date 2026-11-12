import { clamp } from '@vueuse/core';
import { Key, ListMove, listMoveFor } from '@numior/primitives';
import { edgeDirectionOf, tableEdge, type TableEdgeOf, type TableLastOf } from './table-keys';
import {
  TableRangeLines,
  type CopyShapeKind,
  type NuiTableRange,
  type NuiTableRanges,
  type NuiTableCellPosition,
  type TableRangeSegment,
  type TableRevealAxis,
  type TableSpan,
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

export type RangeSpan = TableSpan;

export type CopyShape =
  | {
      readonly kind: typeof CopyShapeKind.Block;
      readonly rows: readonly RangeSpan[];
      readonly cols: readonly RangeSpan[];
    }
  | { readonly kind: typeof CopyShapeKind.Disjoint };

export interface CornerKey {
  readonly key: string;
  readonly ctrl: boolean;
  readonly page: number;
  readonly rtl: boolean;
  readonly edge?: TableEdgeOf | undefined;
  readonly last?: TableLastOf | undefined;
}

interface RangeItem {
  readonly box: RangeBox;
  readonly range: NuiTableRange | undefined;
}

interface RangeJoin {
  readonly first: number;
  readonly second: number;
  readonly box: RangeBox;
}

export const boxOf = (range: NuiTableRange): RangeBox => ({
  top: Math.min(range.from.row, range.to.row),
  bottom: Math.max(range.from.row, range.to.row),
  start: Math.min(range.from.col, range.to.col),
  end: Math.max(range.from.col, range.to.col),
});

export const samePosition = (a: NuiTableCellPosition, b: NuiTableCellPosition): boolean =>
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
  position: NuiTableCellPosition,
  bounds: RangeBounds,
): NuiTableCellPosition => ({
  row: clamp(position.row, 0, Math.max(0, bounds.rows - 1)),
  col: clamp(position.col, 0, Math.max(0, bounds.cols - 1)),
});

export const inRanges = (ranges: NuiTableRanges, position: NuiTableCellPosition): boolean =>
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

export const inSpans = (spans: readonly RangeSpan[], index: number): boolean =>
  spans.some((span) => index >= span.start && index <= span.end);

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
        top: !inSpans(above, from),
        bottom: !inSpans(below, from),
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
  ].reduce<NuiTableRange[]>((found, piece) => {
    if (piece.top <= piece.bottom && piece.start <= piece.end) {
      found.push(rangeOfBox(piece));
    }
    return found;
  }, []);
};

export const cutRanges = (ranges: NuiTableRanges, cut: NuiTableRange): NuiTableRange[] =>
  ranges.flatMap((range) => subtractRange(range, cut));

export const withLast = (others: NuiTableRanges, last: NuiTableRange): NuiTableRange[] => [
  ...cutRanges(others, last),
  last,
];

const joinBoxes = (a: RangeBox, b: RangeBox): RangeBox | undefined => {
  const sameCols = a.start === b.start && a.end === b.end;
  const sameRows = a.top === b.top && a.bottom === b.bottom;

  if (sameCols && a.top <= b.bottom + 1 && b.top <= a.bottom + 1) {
    return {
      top: Math.min(a.top, b.top),
      bottom: Math.max(a.bottom, b.bottom),
      start: a.start,
      end: a.end,
    };
  }
  return sameRows && a.start <= b.end + 1 && b.start <= a.end + 1
    ? {
        top: a.top,
        bottom: a.bottom,
        start: Math.min(a.start, b.start),
        end: Math.max(a.end, b.end),
      }
    : undefined;
};

const joinOf = (items: readonly RangeItem[]): RangeJoin | undefined => {
  for (const [second, right] of items.entries()) {
    for (const [first, left] of items.entries()) {
      const box = first < second ? joinBoxes(left.box, right.box) : undefined;

      if (box !== undefined) {
        return { first, second, box };
      }
    }
  }
  return undefined;
};

const joinAll = (items: readonly RangeItem[]): readonly RangeItem[] => {
  const join = joinOf(items);

  if (join === undefined) {
    return items;
  }
  return joinAll(
    items.flatMap((item, index) => {
      if (index === join.first) {
        return [];
      }
      return index === join.second ? [{ box: join.box, range: undefined }] : [item];
    }),
  );
};

const isCorner = (box: RangeBox, cell: NuiTableCellPosition): boolean =>
  (cell.row === box.top || cell.row === box.bottom) &&
  (cell.col === box.start || cell.col === box.end);

const orient = (box: RangeBox, moving: NuiTableCellPosition | undefined): NuiTableRange =>
  moving !== undefined && isCorner(box, moving)
    ? {
        from: { row: box.top + box.bottom - moving.row, col: box.start + box.end - moving.col },
        to: moving,
      }
    : rangeOfBox(box);

export const tidyRanges = (ranges: NuiTableRanges): NuiTableRange[] => {
  const items = joinAll(ranges.map((range) => ({ box: boxOf(range), range })));
  const moving = ranges.at(-1)?.to;

  return items.map(
    (item, index) =>
      item.range ?? orient(item.box, index === items.length - 1 ? moving : undefined),
  );
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

export const widenRange = (
  range: NuiTableRange,
  lines: TableRangeLines,
  bounds: RangeBounds,
): NuiTableRange => {
  switch (lines) {
    case TableRangeLines.Cells:
      return range;
    case TableRangeLines.Rows:
      return rowsOf(range, bounds);
    case TableRangeLines.Cols:
      return colsOf(range, bounds);
  }
};

export const revealAxisOf = (range: NuiTableRange, bounds: RangeBounds): TableRevealAxis => {
  const box = boxOf(range);
  const everyRow = bounds.rows > 1 && box.top === 0 && box.bottom >= bounds.rows - 1;
  const everyCol = bounds.cols > 1 && box.start === 0 && box.end >= bounds.cols - 1;

  if (everyRow && everyCol) {
    return 'none';
  }
  if (everyRow) {
    return 'col';
  }
  return everyCol ? 'row' : 'both';
};

export const columnSpansOf = (ranges: NuiTableRanges, offset: number): RangeSpan[] =>
  mergeSpans(
    ranges.map((range) => {
      const box = boxOf(range);

      return { start: box.start + offset, end: box.end + offset };
    }),
  );

const edgeCorner = (
  input: CornerKey,
  corner: NuiTableCellPosition,
  bounds: RangeBounds,
): NuiTableCellPosition | undefined => {
  const lastRow = bounds.rows - 1;
  const lastCol = bounds.cols - 1;

  switch (input.key) {
    case Key.Home:
      return input.ctrl ? { row: 0, col: 0 } : { row: corner.row, col: 0 };
    case Key.End:
      return input.ctrl
        ? (input.last?.() ?? { row: lastRow, col: lastCol })
        : { row: corner.row, col: lastCol };
    default:
      return undefined;
  }
};

const rowStep = (input: CornerKey, corner: NuiTableCellPosition) => {
  switch (input.key) {
    case Key.ArrowUp:
      return corner.row - 1;
    case Key.ArrowDown:
      return corner.row + 1;
    case Key.PageUp:
      return corner.row - input.page;
    case Key.PageDown:
      return corner.row + input.page;
    default:
      return undefined;
  }
};

const colStep = (input: CornerKey, corner: NuiTableCellPosition) => {
  switch (listMoveFor(input.key, 'horizontal', input.rtl)) {
    case ListMove.Next:
      return corner.col + 1;
    case ListMove.Prev:
      return corner.col - 1;
    default:
      return undefined;
  }
};

export const stepCorner = (
  corner: NuiTableCellPosition,
  input: CornerKey,
  bounds: RangeBounds,
): NuiTableCellPosition | undefined => {
  const direction = input.ctrl ? edgeDirectionOf(input.key, input.rtl) : undefined;

  if (direction !== undefined) {
    return clampPosition(
      input.edge?.(corner, direction) ?? tableEdge(corner, direction, bounds.rows, bounds.cols),
      bounds,
    );
  }
  const edge = edgeCorner(input, corner, bounds);
  const row = rowStep(input, corner);
  const col = colStep(input, corner);

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
