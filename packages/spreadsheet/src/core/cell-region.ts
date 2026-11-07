import { MAX_COLS, MAX_ROWS } from './address';
import type { CellRange } from './cell.types';
import type { CellStore } from './cell-store';

interface Reach {
  readonly start: number;
  readonly step: 1 | -1;
  readonly limit: number;
}

const FIRST_SPAN = 64;

const linesHit = (
  cells: CellStore,
  rows: boolean,
  from: number,
  to: number,
  across: CellRange,
): Set<number> => {
  const hit = new Set<number>();

  const strip: CellRange = rows
    ? {
        top: Math.min(from, to),
        bottom: Math.max(from, to),
        left: Math.max(across.left - 1, 0),
        right: Math.min(across.right + 1, MAX_COLS - 1),
      }
    : {
        top: Math.max(across.top - 1, 0),
        bottom: Math.min(across.bottom + 1, MAX_ROWS - 1),
        left: Math.min(from, to),
        right: Math.max(from, to),
      };

  cells.forEachInRange(strip, (row, col) => {
    hit.add(rows ? row : col);
  });

  return hit;
};

const reached = (cells: CellStore, rows: boolean, range: CellRange, reach: Reach): number => {
  let edge = reach.start;

  for (let span = FIRST_SPAN; edge !== reach.limit; span *= 2) {
    const far =
      reach.step > 0 ? Math.min(edge + span, reach.limit) : Math.max(edge - span, reach.limit);

    const hit = linesHit(cells, rows, edge + reach.step, far, range);
    let next = edge;

    while (next !== far && hit.has(next + reach.step)) {
      next += reach.step;
    }
    if (next !== far) {
      return next;
    }
    edge = next;
  }
  return edge;
};

const grown = (cells: CellStore, range: CellRange): CellRange => {
  const top = reached(cells, true, range, { start: range.top, step: -1, limit: 0 });

  const bottom = reached(cells, true, range, {
    start: range.bottom,
    step: 1,
    limit: MAX_ROWS - 1,
  });

  const tall = { ...range, top, bottom };
  const left = reached(cells, false, tall, { start: range.left, step: -1, limit: 0 });

  const right = reached(cells, false, tall, {
    start: range.right,
    step: 1,
    limit: MAX_COLS - 1,
  });

  return { top, bottom, left, right };
};

const sameRange = (left: CellRange, right: CellRange): boolean =>
  left.top === right.top &&
  left.bottom === right.bottom &&
  left.left === right.left &&
  left.right === right.right;

export const currentRegion = (cells: CellStore, row: number, col: number): CellRange => {
  let range: CellRange = { top: row, left: col, bottom: row, right: col };

  for (let next = grown(cells, range); !sameRange(next, range); next = grown(cells, range)) {
    range = next;
  }
  return range;
};
