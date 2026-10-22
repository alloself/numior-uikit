import { limitOf, type LineMove } from '../lines';
import type { LineChange } from '../formula/rewrite';
import type { LineLayout, LineLayouts, SheetLayout } from './layout.types';
import { shiftMerges } from './shift-ranges';

const lowerBound = (lines: Int32Array, value: number): number => {
  let low = 0;
  let high = lines.length;

  while (low < high) {
    const middle = (low + high) >>> 1;

    if ((lines[middle] ?? 0) < value) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
};

const createLineLayouts = (lines: Int32Array, layouts: readonly LineLayout[]): LineLayouts => {
  const visitRange = (
    from: number,
    to: number,
    visit: (line: number, layout: LineLayout) => void,
  ): void => {
    for (let index = from; index < to; index += 1) {
      const layout = layouts[index];

      if (layout !== undefined) {
        visit(lines[index] ?? 0, layout);
      }
    }
  };

  const moved = (start: number, removed: number, change: LineMove): LineLayouts => {
    const kept = change.count > 0 ? lowerBound(lines, limitOf(change.axis) - change.count) : 0;
    const end = change.count > 0 ? kept : lines.length;
    const next = new Int32Array(end - removed);

    next.set(lines.subarray(0, start));
    for (let index = start + removed; index < end; index += 1) {
      next[index - removed] = (lines[index] ?? 0) + change.count;
    }
    return createLineLayouts(next, [
      ...layouts.slice(0, start),
      ...layouts.slice(start + removed, end),
    ]);
  };

  const self: LineLayouts = {
    size: lines.length,
    get: (line) => {
      const index = lowerBound(lines, line);

      return lines[index] === line ? layouts[index] : undefined;
    },
    last: () => lines.at(-1) ?? -1,
    forEach: (visit) => {
      visitRange(0, lines.length, visit);
    },
    forEachIn: (from, to, visit) => {
      visitRange(lowerBound(lines, from), lowerBound(lines, to + 1), visit);
    },
    shifted: (change) => {
      const start = lowerBound(lines, change.at);

      if (start === lines.length) {
        return self;
      }

      const removed = change.count < 0 ? lowerBound(lines, change.at - change.count) - start : 0;

      return moved(start, removed, change);
    },
  };

  return self;
};

const EMPTY_LINES = createLineLayouts(new Int32Array(0), []);

export const EMPTY_LAYOUT: SheetLayout = { rows: EMPTY_LINES, cols: EMPTY_LINES, merges: [] };

export const lineLayoutsOf = (
  entries: readonly (readonly [line: number, layout: LineLayout])[],
): LineLayouts => {
  const sorted = entries.toSorted(([left], [right]) => left - right);

  return sorted.length === 0
    ? EMPTY_LINES
    : createLineLayouts(
        Int32Array.from(sorted, ([line]) => line),
        sorted.map(([, layout]) => layout),
      );
};

export const shiftLayout = (layout: SheetLayout, change: LineChange): SheetLayout => ({
  rows: change.axis === 'rows' ? layout.rows.shifted(change) : layout.rows,
  cols: change.axis === 'cols' ? layout.cols.shifted(change) : layout.cols,
  merges: shiftMerges(layout.merges, change),
});
