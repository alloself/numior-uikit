import type { NuiTableOverlaySlot, NuiTableRange, NuiTableRect } from '@numior/table';
import {
  DrawingAnchorKind,
  MAX_COLS,
  MAX_ROWS,
  type DrawingAnchor,
  type DrawingMark,
} from '../../core';
import { FrameGrip } from '../sheet.types';
import type {
  DrawingBox,
  DrawingEdgeLimits,
  DrawingEdges,
  DrawingFrozen,
  DrawingPlace,
  DrawingSpan,
  LineNear,
  LineSizes,
} from './drawings.types';

interface Reach {
  readonly line: number;
  readonly rest: number;
}

const MIN_SIZE = 8;

const GRID_LINE = 1;

const START_GRIPS = new Set<FrameGrip>([
  FrameGrip.Start,
  FrameGrip.TopStart,
  FrameGrip.BottomStart,
]);

const END_GRIPS = new Set<FrameGrip>([FrameGrip.End, FrameGrip.TopEnd, FrameGrip.BottomEnd]);

const TOP_GRIPS = new Set<FrameGrip>([FrameGrip.Top, FrameGrip.TopStart, FrameGrip.TopEnd]);

const BOTTOM_GRIPS = new Set<FrameGrip>([
  FrameGrip.Bottom,
  FrameGrip.BottomStart,
  FrameGrip.BottomEnd,
]);

const CORNER_GRIPS = new Set<FrameGrip>([
  FrameGrip.TopStart,
  FrameGrip.TopEnd,
  FrameGrip.BottomStart,
  FrameGrip.BottomEnd,
]);

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
      const lastRow = lastOf(from.row, to.row, to.dy);
      const lastCol = lastOf(from.col, to.col, to.dx);

      return {
        from,
        last: { row: lastRow, col: lastCol },
        width: Math.max(sumOf(from.col, to.col, sizes.width) - from.dx + to.dx, 0),
        height: Math.max(sumOf(from.row, to.row, sizes.height) - from.dy + to.dy, 0),
        cells: {
          width: sumOf(from.col, lastCol + 1, sizes.width),
          height: sumOf(from.row, lastRow + 1, sizes.height),
        },
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

const stepped = (
  line: number,
  rest: number,
  delta: number,
  size: (line: number) => number,
  limit: number,
): Reach => {
  let at = line;
  let left = rest + delta;

  while (left < 0 && at > 0) {
    at -= 1;
    left += size(at);
  }
  while (at < limit - 1 && left >= size(at)) {
    left -= size(at);
    at += 1;
  }
  return { line: at, rest: Math.max(left, 0) };
};

const movedMark = (
  mark: DrawingMark,
  across: number,
  down: number,
  sizes: LineSizes,
): DrawingMark => {
  const col = stepped(mark.col, mark.dx, across, sizes.width, MAX_COLS);
  const row = stepped(mark.row, mark.dy, down, sizes.height, MAX_ROWS);

  return { row: row.line, col: col.line, dx: col.rest, dy: row.rest };
};

export const movedAnchor = (
  anchor: DrawingAnchor,
  edges: DrawingEdges,
  sizes: LineSizes,
): DrawingAnchor => {
  const { start, top, end, bottom } = edges;

  switch (anchor.kind) {
    case DrawingAnchorKind.Cells:
      return {
        ...anchor,
        from: movedMark(anchor.from, start, top, sizes),
        to: movedMark(anchor.to, end, bottom, sizes),
      };
    case DrawingAnchorKind.Cell:
      return {
        ...anchor,
        from: movedMark(anchor.from, start, top, sizes),
        width: anchor.width + end - start,
        height: anchor.height + bottom - top,
      };
    case DrawingAnchorKind.Point:
      return {
        ...anchor,
        x: Math.max(anchor.x + start, 0),
        y: Math.max(anchor.y + top, 0),
        width: anchor.width + end - start,
        height: anchor.height + bottom - top,
      };
  }
};

export const boxOfAnchor = (anchor: DrawingAnchor, sizes: LineSizes): DrawingBox => {
  const span = spanOf(anchor, sizes);

  return {
    x: sumOf(0, span.from.col, sizes.width) + span.from.dx,
    y: sumOf(0, span.from.row, sizes.height) + span.from.dy,
    width: span.width,
    height: span.height,
  };
};

export const allEdges = (across: number, down: number): DrawingEdges => ({
  start: across,
  top: down,
  end: across,
  bottom: down,
});

const lowEdge = (delta: number, position: number, size: number): number =>
  Math.max(Math.min(delta, size - MIN_SIZE), -position);

const highEdge = (delta: number, size: number): number => Math.max(delta, MIN_SIZE - size);

const withRatio = (edges: DrawingEdges, grip: FrameGrip, box: DrawingBox): DrawingEdges => {
  const width = box.width + edges.end - edges.start;
  const height = box.height + edges.bottom - edges.top;
  const scale = Math.max(width / box.width, height / box.height);
  const wider = box.width * scale - width;
  const taller = box.height * scale - height;

  return {
    start: START_GRIPS.has(grip) ? edges.start - wider : edges.start,
    end: END_GRIPS.has(grip) ? edges.end + wider : edges.end,
    top: TOP_GRIPS.has(grip) ? edges.top - taller : edges.top,
    bottom: BOTTOM_GRIPS.has(grip) ? edges.bottom + taller : edges.bottom,
  };
};

export const edgesOf = (
  grip: FrameGrip | undefined,
  across: number,
  down: number,
  limits: DrawingEdgeLimits,
): DrawingEdges => {
  const { box, keepRatio } = limits;

  if (grip === undefined) {
    return allEdges(Math.max(across, -box.x), Math.max(down, -box.y));
  }

  const edges: DrawingEdges = {
    start: START_GRIPS.has(grip) ? lowEdge(across, box.x, box.width) : 0,
    top: TOP_GRIPS.has(grip) ? lowEdge(down, box.y, box.height) : 0,
    end: END_GRIPS.has(grip) ? highEdge(across, box.width) : 0,
    bottom: BOTTOM_GRIPS.has(grip) ? highEdge(down, box.height) : 0,
  };

  return keepRatio && CORNER_GRIPS.has(grip) ? withRatio(edges, grip, box) : edges;
};

const rangeOf = (span: DrawingSpan, near: LineNear): NuiTableRange => ({
  from: { row: near.row(span.from.row), col: near.col(span.from.col) },
  to: { row: near.row(span.last.row), col: near.col(span.last.col) },
});

const fitted = (own: number, shown: number, modelled: number | undefined): number =>
  modelled === undefined ? own : own + shown - modelled;

const lapOf = (offset: number): number => (offset === 0 ? GRID_LINE : 0);

const grown = (rect: NuiTableRect, inline: number, block: number): NuiTableRect => ({
  top: rect.top - block,
  start: rect.start - inline,
  width: rect.width + inline,
  height: rect.height + block,
});

export const boxOf = (
  span: DrawingSpan,
  near: LineNear,
  rectOf: NuiTableOverlaySlot['rectOf'],
  frozen: DrawingFrozen,
): DrawingPlace | undefined => {
  const range = rangeOf(span, near);
  const covered = rectOf(range);

  if (covered === undefined) {
    return undefined;
  }

  const inline = lapOf(span.from.dx);
  const block = lapOf(span.from.dy);

  const rect = {
    top: covered.top + span.from.dy,
    start: covered.start + span.from.dx,
    width: fitted(span.width, covered.width, span.cells?.width),
    height: fitted(span.height, covered.height, span.cells?.height),
  };

  return {
    rect: grown(rect, inline, block),
    frame: grown(
      rect,
      range.from.col === frozen.cols ? 0 : inline,
      range.from.row === frozen.rows ? 0 : block,
    ),
  };
};
