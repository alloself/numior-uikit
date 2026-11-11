import { boxOf, type RangeBounds, type RangeBox } from './table-ranges';
import {
  MergeSide,
  TableCellSpanKind,
  type NuiTableEditMove,
  type NuiTableRange,
  type NuiTableCellPosition,
  type TableCellSpan,
  type TableMergeLayout,
  type TableMergePiece,
  type TableMergeSlot,
  type TableRowSpan,
} from './table.types';
import { Key } from '@numior/primitives';

export interface TableMergeIndex {
  readonly size: number;
  at(row: number, col: number): RangeBox | undefined;
  within(top: number, bottom: number): readonly RangeBox[];
}

export interface MergeGeometry {
  readonly rowOffset: (position: number) => number;
  readonly colOffset: (col: number) => number;
}

interface Segment {
  readonly first: number;
  readonly last: number;
}

const BLOCK = 32;
const NO_MERGES: readonly RangeBox[] = [];

const blockOf = (row: number): number => Math.floor(row / BLOCK);

const holds = (box: RangeBox, row: number, col: number): boolean =>
  row >= box.top && row <= box.bottom && col >= box.start && col <= box.end;

const crosses = (a: RangeBox, b: RangeBox): boolean =>
  a.top <= b.bottom && b.top <= a.bottom && a.start <= b.end && b.start <= a.end;

const clipped = (box: RangeBox, bounds: RangeBounds): RangeBox => ({
  top: Math.max(0, box.top),
  bottom: Math.min(bounds.rows - 1, box.bottom),
  start: Math.max(0, box.start),
  end: Math.min(bounds.cols - 1, box.end),
});

const spansCells = (box: RangeBox): boolean =>
  box.bottom >= box.top && box.end >= box.start && (box.bottom > box.top || box.end > box.start);

export const createMergeIndex = (
  merges: readonly NuiTableRange[],
  bounds: RangeBounds,
): TableMergeIndex => {
  const blocks = new Map<number, RangeBox[]>();
  const kept: RangeBox[] = [];

  const near = (top: number, bottom: number): RangeBox[] => {
    const found = new Set<RangeBox>();

    for (let block = blockOf(top); block <= blockOf(bottom); block += 1) {
      for (const box of blocks.get(block) ?? NO_MERGES) {
        found.add(box);
      }
    }
    return [...found];
  };

  for (const merge of merges) {
    const box = clipped(boxOf(merge), bounds);

    if (!spansCells(box) || near(box.top, box.bottom).some((other) => crosses(other, box))) {
      continue;
    }

    kept.push(box);

    for (let block = blockOf(box.top); block <= blockOf(box.bottom); block += 1) {
      blocks.set(block, [...(blocks.get(block) ?? NO_MERGES), box]);
    }
  }

  return {
    size: kept.length,
    at: (row, col) => blocks.get(blockOf(row))?.find((box) => holds(box, row, col)),
    within: (top, bottom) =>
      near(top, bottom).filter((box) => box.top <= bottom && box.bottom >= top),
  };
};

const grown = (box: RangeBox, hits: readonly RangeBox[]): RangeBox =>
  hits.reduce<RangeBox>(
    (sum, hit) => ({
      top: Math.min(sum.top, hit.top),
      bottom: Math.max(sum.bottom, hit.bottom),
      start: Math.min(sum.start, hit.start),
      end: Math.max(sum.end, hit.end),
    }),
    box,
  );

const sameBox = (a: RangeBox, b: RangeBox): boolean =>
  a.top === b.top && a.bottom === b.bottom && a.start === b.start && a.end === b.end;

const boxWithMerges = (index: TableMergeIndex, box: RangeBox): RangeBox => {
  const next = grown(
    box,
    index.within(box.top, box.bottom).filter((merge) => crosses(merge, box)),
  );

  return sameBox(next, box) ? box : boxWithMerges(index, next);
};

export const spansLines = (range: NuiTableRange, bounds: RangeBounds): boolean => {
  const box = boxOf(range);

  return (
    (box.start === 0 && box.end >= bounds.cols - 1) ||
    (box.top === 0 && box.bottom >= bounds.rows - 1)
  );
};

export const expandToMerges = (
  index: TableMergeIndex,
  range: NuiTableRange,
  bounds: RangeBounds,
): NuiTableRange => {
  const box = boxOf(range);
  const full = index.size === 0 || spansLines(range, bounds) ? box : boxWithMerges(index, box);

  if (full === box) {
    return range;
  }
  const down = range.to.row >= range.from.row;
  const forward = range.to.col >= range.from.col;

  return {
    from: { row: down ? full.top : full.bottom, col: forward ? full.start : full.end },
    to: { row: down ? full.bottom : full.top, col: forward ? full.end : full.start },
  };
};

export const anchorOf = (
  index: TableMergeIndex,
  position: NuiTableCellPosition,
): NuiTableCellPosition => {
  const merge = index.at(position.row, position.col);

  return merge === undefined ? position : { row: merge.top, col: merge.start };
};

const MOVE_SIDES: Readonly<Record<NuiTableEditMove, MergeSide | undefined>> = {
  down: 'bottom',
  up: 'top',
  next: 'end',
  previous: 'start',
  stay: undefined,
  fill: undefined,
  blur: undefined,
};

const sideOfKey = (key: string, rtl: boolean): MergeSide | undefined => {
  switch (key) {
    case Key.ArrowDown:
      return 'bottom';
    case Key.ArrowUp:
      return 'top';
    case Key.ArrowRight:
      return rtl ? 'start' : 'end';
    case Key.ArrowLeft:
      return rtl ? 'end' : 'start';
    default:
      return undefined;
  }
};

const edgeOf = (
  merge: RangeBox,
  from: NuiTableCellPosition,
  side: MergeSide,
): NuiTableCellPosition => {
  switch (side) {
    case MergeSide.Bottom:
      return { row: merge.bottom, col: from.col };
    case MergeSide.Top:
      return { row: merge.top, col: from.col };
    case MergeSide.End:
      return { row: from.row, col: merge.end };
    case MergeSide.Start:
      return { row: from.row, col: merge.start };
  }
};

const toEdge = (
  index: TableMergeIndex,
  from: NuiTableCellPosition,
  side: MergeSide | undefined,
): NuiTableCellPosition => {
  const merge = index.at(from.row, from.col);

  return merge === undefined || side === undefined ? from : edgeOf(merge, from, side);
};

export const leaveMerge = (
  index: TableMergeIndex,
  from: NuiTableCellPosition,
  key: string,
  rtl: boolean,
): NuiTableCellPosition => toEdge(index, from, sideOfKey(key, rtl));

export const leaveMergeBy = (
  index: TableMergeIndex,
  from: NuiTableCellPosition,
  move: NuiTableEditMove,
): NuiTableCellPosition => toEdge(index, from, MOVE_SIDES[move]);

export const consecutiveRuns = (positions: readonly number[], edge = 0): number[][] => {
  const runs: number[][] = [];

  for (const position of positions) {
    const run = runs.at(-1);

    if (run !== undefined && run.at(-1) === position - 1 && position !== edge) {
      run.push(position);
    } else {
      runs.push([position]);
    }
  }
  return runs;
};

const rowSegments = (merge: RangeBox, runs: readonly (readonly number[])[]): Segment[] => {
  const isInside = (row: number): boolean => row >= merge.top && row <= merge.bottom;

  return runs.flatMap((run) => {
    const first = run.find(isInside);
    const last = run.findLast(isInside);

    return first === undefined || last === undefined ? [] : [{ first, last }];
  });
};

const slotSegments = (merge: RangeBox, slots: readonly TableMergeSlot[]): Segment[] => {
  const segments = new Map<string, Segment>();

  slots.forEach((slot, at) => {
    if (slot.col === undefined || slot.col < merge.start || slot.col > merge.end) {
      return;
    }

    segments.set(slot.pane, { first: segments.get(slot.pane)?.first ?? at, last: at });
  });

  return [...segments.values()];
};

const COVERED: TableCellSpan = { kind: 'covered' };

const colOf = (slots: readonly TableMergeSlot[], at: number, fallback: number): number =>
  slots[at]?.col ?? fallback;

export const mergeSpans = (
  merges: readonly RangeBox[],
  runs: readonly (readonly number[])[],
  slots: readonly TableMergeSlot[],
  geometry: MergeGeometry,
): TableMergeLayout<RangeBox> => {
  const spans = new Map<number, Map<string, TableCellSpan>>();
  const pieces = new Map<RangeBox, TableMergePiece[]>();

  const put = (row: number, key: string, span: TableCellSpan): void => {
    const cells = spans.get(row) ?? new Map<string, TableCellSpan>();

    cells.set(key, span);
    spans.set(row, cells);
  };

  const cover = (rows: Segment, cols: Segment): void => {
    for (let row = rows.first; row <= rows.last; row += 1) {
      for (let at = cols.first; at <= cols.last; at += 1) {
        put(row, slots[at]?.key ?? '', COVERED);
      }
    }
  };

  for (const merge of merges) {
    const left = geometry.colOffset(merge.start);
    const top = geometry.rowOffset(merge.top);
    const found: TableMergePiece[] = [];

    for (const rows of rowSegments(merge, runs)) {
      for (const cols of slotSegments(merge, slots)) {
        const start = colOf(slots, cols.first, merge.start);
        const end = colOf(slots, cols.last, merge.end);
        const covered = slots.slice(cols.first, cols.last + 1);

        cover(rows, cols);

        put(rows.first, slots[cols.first]?.key ?? '', {
          kind: 'lead',
          row: rows.first,
          col: start,
          rowspan: rows.last - rows.first + 1,
          colspan: cols.last - cols.first + 1,
          span: end - start + 1,
          anchor: { row: merge.top, col: merge.start },
          rows: merge.bottom - merge.top + 1,
          cols: merge.end - merge.start + 1,
          edge: covered.some((slot) => slot.edge === true),
          tail: covered.some((slot) => slot.tail === true),
          x: geometry.colOffset(start) - left,
          y: geometry.rowOffset(rows.first) - top,
          width: geometry.colOffset(merge.end + 1) - left,
          height: geometry.rowOffset(merge.bottom + 1) - top,
        });

        found.push({ top: rows.first, bottom: rows.last, start, end });
      }
    }
    pieces.set(merge, found);
  }
  return { spans, pieces };
};

const LEAD_FIELDS = [
  'row',
  'col',
  'rowspan',
  'colspan',
  'span',
  'rows',
  'cols',
  'edge',
  'tail',
  'x',
  'y',
  'width',
  'height',
] as const;

const sameSpan = (a: TableCellSpan, b: TableCellSpan | undefined): boolean => {
  if (b === undefined || a.kind !== b.kind) {
    return false;
  }
  if (a.kind === TableCellSpanKind.Covered || b.kind === TableCellSpanKind.Covered) {
    return true;
  }
  return (
    a.anchor.row === b.anchor.row &&
    a.anchor.col === b.anchor.col &&
    LEAD_FIELDS.every((field) => a[field] === b[field])
  );
};

const sameRowSpans = (a: TableRowSpan, b: TableRowSpan): boolean =>
  a.size === b.size && [...a].every(([key, span]) => sameSpan(span, b.get(key)));

export const keepSpans = (
  next: ReadonlyMap<number, TableRowSpan>,
  previous: ReadonlyMap<number, TableRowSpan> | undefined,
): ReadonlyMap<number, TableRowSpan> =>
  previous === undefined
    ? next
    : new Map(
        [...next].map(([row, spans]) => {
          const before = previous.get(row);

          return [row, before !== undefined && sameRowSpans(spans, before) ? before : spans];
        }),
      );

export const pieceOf = (
  pieces: readonly TableMergePiece[] | undefined,
  position: NuiTableCellPosition,
): TableMergePiece | undefined =>
  pieces?.find(
    (piece) =>
      position.row >= piece.top &&
      position.row <= piece.bottom &&
      position.col >= piece.start &&
      position.col <= piece.end,
  );
