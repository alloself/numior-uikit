import { boxOf, type RangeBounds, type RangeBox } from './table-ranges';
import {
  type NuiTableRange,
  type NuiTableRanges,
  type PastePlanKind,
  type TableCellPosition,
} from './table.types';

export interface PasteCell {
  readonly row: number;
  readonly col: number;
  readonly text: string;
}

export type PastePlan =
  | { readonly kind: typeof PastePlanKind.None }
  | { readonly kind: typeof PastePlanKind.Limit; readonly count: number }
  | {
      readonly kind: typeof PastePlanKind.Cells;
      readonly cells: readonly PasteCell[];
      readonly area: NuiTableRange | undefined;
    };

interface BlockSize {
  readonly rows: number;
  readonly cols: number;
}

const NONE: PastePlan = { kind: 'none' };

const sizeOf = (box: RangeBox): BlockSize => ({
  rows: box.bottom - box.top + 1,
  cols: box.end - box.start + 1,
});

const fillOf = (ranges: NuiTableRanges, text: string, limit: number): PastePlan => {
  const boxes = ranges.map(boxOf);

  const count = boxes.reduce((sum, box) => {
    const size = sizeOf(box);

    return sum + size.rows * size.cols;
  }, 0);

  if (count > limit) {
    return { kind: 'limit', count };
  }

  const cells = boxes.flatMap((box) => {
    const size = sizeOf(box);

    return Array.from({ length: size.rows * size.cols }, (_, index) => ({
      row: box.top + Math.floor(index / size.cols),
      col: box.start + (index % size.cols),
      text,
    }));
  });

  return { kind: 'cells', cells, area: undefined };
};

const targetOf = (
  ranges: NuiTableRanges,
  anchor: TableCellPosition | undefined,
): RangeBox | undefined => {
  const last = ranges.at(-1);

  if (last !== undefined) {
    return boxOf(last);
  }
  return anchor === undefined
    ? undefined
    : { top: anchor.row, bottom: anchor.row, start: anchor.col, end: anchor.col };
};

const tiles = (block: BlockSize, target: BlockSize): boolean =>
  target.rows % block.rows === 0 &&
  target.cols % block.cols === 0 &&
  (target.rows > block.rows || target.cols > block.cols);

const clipped = (size: BlockSize, box: RangeBox, bounds: RangeBounds): BlockSize => ({
  rows: Math.max(0, Math.min(size.rows, bounds.rows - box.top)),
  cols: Math.max(0, Math.min(size.cols, bounds.cols - box.start)),
});

export const planPaste = (
  block: readonly (readonly string[])[],
  ranges: NuiTableRanges,
  anchor: TableCellPosition | undefined,
  bounds: RangeBounds,
  limit: number,
): PastePlan => {
  const first = block[0];
  const box = targetOf(ranges, anchor);

  if (first === undefined || first.length === 0 || box === undefined) {
    return NONE;
  }
  if (block.length === 1 && first.length === 1 && ranges.length > 0) {
    return fillOf(ranges, first[0] ?? '', limit);
  }
  const size = { rows: block.length, cols: Math.max(...block.map((line) => line.length)) };
  const target = sizeOf(box);
  const area = clipped(ranges.length === 1 && tiles(size, target) ? target : size, box, bounds);
  const count = area.rows * area.cols;

  if (count > limit) {
    return { kind: 'limit', count };
  }

  const cells = Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / area.cols);
    const col = index % area.cols;

    return {
      row: box.top + row,
      col: box.start + col,
      text: block[row % size.rows]?.[col % size.cols] ?? '',
    };
  });

  return count === 0
    ? NONE
    : {
        kind: 'cells',
        cells,
        area: {
          from: { row: box.top, col: box.start },
          to: { row: box.top + area.rows - 1, col: box.start + area.cols - 1 },
        },
      };
};
