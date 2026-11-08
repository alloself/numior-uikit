import type { NuiTableOverlaySlot, NuiTableRange, NuiTableRect } from '@numior/table';
import { DrawingAnchorKind, MAX_COLS, MAX_ROWS, type DrawingAnchor } from '../../core';
import type { DrawingSpan, LineNear, LineSizes } from './drawings.types';

interface Reach {
  readonly line: number;
  readonly rest: number;
}

const reach = (
  start: number,
  offset: number,
  size: (line: number) => number,
  limit: number,
): Reach => {
  let line = start;
  let rest = offset;

  while (line < limit - 1 && rest >= size(line)) {
    rest -= size(line);
    line += 1;
  }
  return { line, rest };
};

const sumOf = (from: number, to: number, size: (line: number) => number): number => {
  let total = 0;

  for (let line = from; line < to; line += 1) {
    total += size(line);
  }
  return total;
};

const lastOf = (from: number, to: number, offset: number): number =>
  to > from && offset <= 0 ? to - 1 : to;

const sizedSpan = (
  row: Reach,
  col: Reach,
  width: number,
  height: number,
  sizes: LineSizes,
): DrawingSpan => ({
  from: { row: row.line, col: col.line, dx: col.rest, dy: row.rest },
  last: {
    row: reach(row.line, row.rest + Math.max(height, 1) - 1, sizes.height, MAX_ROWS).line,
    col: reach(col.line, col.rest + Math.max(width, 1) - 1, sizes.width, MAX_COLS).line,
  },
  width,
  height,
});

export const spanOf = (anchor: DrawingAnchor, sizes: LineSizes): DrawingSpan => {
  switch (anchor.kind) {
    case DrawingAnchorKind.Cells: {
      const { from, to } = anchor;

      return {
        from,
        last: {
          row: lastOf(from.row, to.row, to.dy),
          col: lastOf(from.col, to.col, to.dx),
        },
        width: Math.max(sumOf(from.col, to.col, sizes.width) - from.dx + to.dx, 0),
        height: Math.max(sumOf(from.row, to.row, sizes.height) - from.dy + to.dy, 0),
      };
    }
    case DrawingAnchorKind.Cell:
      return sizedSpan(
        { line: anchor.from.row, rest: anchor.from.dy },
        { line: anchor.from.col, rest: anchor.from.dx },
        anchor.width,
        anchor.height,
        sizes,
      );
    case DrawingAnchorKind.Point:
      return sizedSpan(
        reach(0, anchor.y, sizes.height, MAX_ROWS),
        reach(0, anchor.x, sizes.width, MAX_COLS),
        anchor.width,
        anchor.height,
        sizes,
      );
  }
};

const rangeOf = (span: DrawingSpan, near: LineNear): NuiTableRange => ({
  from: { row: near.row(span.from.row), col: near.col(span.from.col) },
  to: { row: near.row(span.last.row), col: near.col(span.last.col) },
});

export const boxOf = (
  span: DrawingSpan,
  near: LineNear,
  rectOf: NuiTableOverlaySlot['rectOf'],
): NuiTableRect | undefined => {
  const covered = rectOf(rangeOf(span, near));

  return covered === undefined
    ? undefined
    : {
        top: covered.top + span.from.dy,
        start: covered.start + span.from.dx,
        width: span.width,
        height: span.height,
      };
};
