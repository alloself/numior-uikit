import type { CellRange } from '../cell.types';
import { lookupKey } from '../calc/coerce';
import type { Sheet } from '../workbook';

export interface RangeStats {
  count(): number;
  kth(index: number): number | undefined;
  low(): number | undefined;
  high(): number | undefined;
  mean(): number;
  deviation(): number;
  countOf(key: string): number;
}

interface ChunkNumbers {
  readonly stamp: number;
  readonly sorted: Float64Array;
  readonly sum: number;
  readonly squares: number;
}

interface Totals {
  readonly count: number;
  readonly sum: number;
  readonly squares: number;
  readonly low: number;
  readonly high: number;
}

interface Window {
  readonly part: Float64Array;
  from: number;
  to: number;
}

const NO_TOTALS: Totals = {
  count: 0,
  sum: 0,
  squares: 0,
  low: Number.POSITIVE_INFINITY,
  high: Number.NEGATIVE_INFINITY,
};

const areaKey = (area: CellRange): string =>
  `${String(area.top)}:${String(area.left)}:${String(area.bottom)}:${String(area.right)}`;

const chunkNumbers = (sheet: Sheet, area: CellRange, stamp: number): ChunkNumbers => {
  const numbers: number[] = [];

  sheet.cells.forEachInRange(area, (_row, _col, value) => {
    if (value.kind === 'number') {
      numbers.push(value.value);
    }
  });

  return {
    stamp,
    sorted: Float64Array.from(numbers).toSorted(),
    sum: numbers.reduce((total, value) => total + value, 0),
    squares: numbers.reduce((total, value) => total + value * value, 0),
  };
};

const boundOf = (part: Float64Array, window: Window, value: number, inclusive: boolean): number => {
  let low = window.from;
  let high = window.to;

  while (low < high) {
    const middle = (low + high) >>> 1;
    const item = part[middle] ?? 0;

    if (item < value || (inclusive && item === value)) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
};

const widest = (windows: readonly Window[]): Window | undefined =>
  windows.reduce<Window | undefined>(
    (best, window) =>
      best === undefined || window.to - window.from > best.to - best.from ? window : best,
    undefined,
  );

const kthOf = (parts: readonly Float64Array[], wanted: number): number | undefined => {
  const windows: Window[] = parts.map((part) => ({ part, from: 0, to: part.length }));
  let rank = wanted;

  for (
    let largest = widest(windows);
    largest !== undefined && largest.to > largest.from;
    largest = widest(windows)
  ) {
    const pivot = largest.part[(largest.from + largest.to) >>> 1] ?? 0;
    const below = windows.map((window) => boundOf(window.part, window, pivot, false));
    const upTo = windows.map((window) => boundOf(window.part, window, pivot, true));
    const less = below.reduce((sum, bound, index) => sum + bound - (windows[index]?.from ?? 0), 0);
    const equal = upTo.reduce((sum, bound, index) => sum + bound - (below[index] ?? 0), 0);

    if (rank >= less && rank < less + equal) {
      return pivot;
    }

    const lower = rank < less;

    rank -= lower ? 0 : less + equal;

    windows.forEach((window, index) => {
      if (lower) {
        window.to = below[index] ?? window.to;
      } else {
        window.from = upTo[index] ?? window.from;
      }
    });
  }
  return undefined;
};

const countsOf = (sheet: Sheet, ranges: readonly CellRange[]): Map<string, number> =>
  ranges.reduce((counts, range) => {
    sheet.cells.forEachInRange(range, (_row, _col, value) => {
      const key = lookupKey(value);

      if (key !== undefined) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    });

    return counts;
  }, new Map<string, number>());

const totalsOf = (parts: Iterable<ChunkNumbers>): Totals => {
  let totals = NO_TOTALS;

  for (const part of parts) {
    totals = {
      count: totals.count + part.sorted.length,
      sum: totals.sum + part.sum,
      squares: totals.squares + part.squares,
      low: Math.min(totals.low, part.sorted[0] ?? Number.POSITIVE_INFINITY),
      high: Math.max(totals.high, part.sorted.at(-1) ?? Number.NEGATIVE_INFINITY),
    };
  }
  return totals;
};

const sameParts = (
  left: ReadonlyMap<string, ChunkNumbers>,
  right: ReadonlyMap<string, ChunkNumbers>,
): boolean => {
  if (left.size !== right.size) {
    return false;
  }
  for (const [key, part] of left) {
    if (right.get(key) !== part) {
      return false;
    }
  }
  return true;
};

export const createRangeStats = (sheet: Sheet, ranges: readonly CellRange[]): RangeStats => {
  let chunks = new Map<string, ChunkNumbers>();
  let counts: Map<string, number> | undefined;
  let ranked = new Map<number, number | undefined>();
  let sortedParts: Float64Array[] | undefined;
  let totals: Totals | undefined;
  let revision = -1;

  const refreshed = (): ReadonlyMap<string, ChunkNumbers> => {
    if (revision === sheet.cells.revision) {
      return chunks;
    }

    const next = new Map<string, ChunkNumbers>();

    ranges.forEach((range) => {
      sheet.cells.forEachChunk(range, (stamp, area) => {
        const key = areaKey(area);
        const known = chunks.get(key);

        next.set(key, known?.stamp === stamp ? known : chunkNumbers(sheet, area, stamp));
      });
    });

    if (!sameParts(next, chunks)) {
      totals = undefined;
      ranked = new Map();
      sortedParts = undefined;
    }
    revision = sheet.cells.revision;
    counts = undefined;
    chunks = next;
    return chunks;
  };

  const totalsNow = (): Totals => {
    const parts = refreshed();

    totals ??= totalsOf(parts.values());
    return totals;
  };

  return {
    count: () => totalsNow().count,
    kth: (index) => {
      const parts = refreshed();

      if (!ranked.has(index)) {
        sortedParts ??= [...parts.values()].map((part) => part.sorted);
        ranked.set(index, kthOf(sortedParts, index));
      }
      return ranked.get(index);
    },
    low: () => {
      const { count, low } = totalsNow();

      return count === 0 ? undefined : low;
    },
    high: () => {
      const { count, high } = totalsNow();

      return count === 0 ? undefined : high;
    },
    mean: () => {
      const { count, sum } = totalsNow();

      return count === 0 ? 0 : sum / count;
    },
    deviation: () => {
      const { count, sum, squares } = totalsNow();

      return count < 2 ? 0 : Math.sqrt(Math.max(squares - (sum * sum) / count, 0) / (count - 1));
    },
    countOf: (key) => {
      refreshed();
      counts ??= countsOf(sheet, ranges);
      return counts.get(key) ?? 0;
    },
  };
};

export const percentileOf = (stats: RangeStats, fraction: number): number => {
  const count = stats.count();

  if (count === 0) {
    return 0;
  }

  const position = Math.min(Math.max(fraction, 0), 1) * (count - 1);
  const low = Math.floor(position);
  const lower = stats.kth(low) ?? 0;
  const upper = stats.kth(Math.min(low + 1, count - 1)) ?? lower;

  return lower + (upper - lower) * (position - low);
};
