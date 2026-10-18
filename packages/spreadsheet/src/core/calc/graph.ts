import { MAX_COLS, MAX_ROWS, cellIndex, containsCell } from '../address';
import type { CellRange } from '../cell.types';

export interface Precedent {
  readonly sheet: number;
  readonly range: CellRange;
}

export interface DependencyGraph {
  set(key: number, precedents: readonly Precedent[]): void;
  remove(key: number): void;
  precedentsOf(key: number): readonly Precedent[];
  forEachDependent(sheet: number, row: number, col: number, visit: (key: number) => void): void;
}

export interface RecalcPlan {
  readonly order: readonly number[];
  readonly cycles: ReadonlySet<number>;
}

interface RangeEntry {
  readonly sheet: number;
  readonly range: CellRange;
  readonly dependents: Set<number>;
}

const SHEET_CELLS = MAX_ROWS * MAX_COLS;

const BAND_ROWS = 64;

const BAND_COLS = 32;

const ROW_BANDS = MAX_ROWS / BAND_ROWS;

const COL_BANDS = MAX_COLS / BAND_COLS;

const SPAN_LIMIT = 32;

export const formulaKey = (sheet: number, row: number, col: number): number =>
  sheet * SHEET_CELLS + cellIndex(row, col);

const sheetOfKey = (key: number): number => Math.floor(key / SHEET_CELLS);

export const rowOfKey = (key: number): number => Math.floor((key % SHEET_CELLS) / MAX_COLS);

export const colOfKey = (key: number): number => key % MAX_COLS;

const bandKey = (sheet: number, rowBand: number, colBand: number): number =>
  (sheet * ROW_BANDS + rowBand) * COL_BANDS + colBand;

const bandsOf = (entry: RangeEntry): number[] | undefined => {
  const { range } = entry;
  const top = Math.floor(range.top / BAND_ROWS);
  const bottom = Math.floor(range.bottom / BAND_ROWS);
  const left = Math.floor(range.left / BAND_COLS);
  const right = Math.floor(range.right / BAND_COLS);

  if ((bottom - top + 1) * (right - left + 1) > SPAN_LIMIT) {
    return undefined;
  }
  const keys: number[] = [];

  for (let row = top; row <= bottom; row += 1) {
    for (let col = left; col <= right; col += 1) {
      keys.push(bandKey(entry.sheet, row, col));
    }
  }
  return keys;
};

const rangeId = ({ sheet, range }: Precedent): string =>
  `${String(sheet)}:${String(range.top)}:${String(range.left)}:${String(range.bottom)}:${String(range.right)}`;

const single = (range: CellRange): boolean =>
  range.top === range.bottom && range.left === range.right;

const addTo = <K, V>(map: Map<K, Set<V>>, key: K, value: V): void => {
  const known = map.get(key);

  if (known === undefined) {
    map.set(key, new Set([value]));
  } else {
    known.add(value);
  }
};

const removeFrom = <K, V>(map: Map<K, Set<V>>, key: K, value: V): void => {
  const known = map.get(key);

  known?.delete(value);
  if (known?.size === 0) {
    map.delete(key);
  }
};

export const createDependencyGraph = (): DependencyGraph => {
  const singles = new Map<number, Set<number>>();
  const ranges = new Map<string, RangeEntry>();
  const bands = new Map<number, Set<RangeEntry>>();
  const wide = new Map<number, Set<RangeEntry>>();
  const precedents = new Map<number, readonly Precedent[]>();

  const place = (entry: RangeEntry, add: boolean): void => {
    const keys = bandsOf(entry);
    const change = add ? addTo : removeFrom;

    if (keys === undefined) {
      change(wide, entry.sheet, entry);
      return;
    }

    keys.forEach((key) => {
      change(bands, key, entry);
    });
  };

  const link = (key: number, precedent: Precedent): void => {
    if (single(precedent.range)) {
      addTo(singles, formulaKey(precedent.sheet, precedent.range.top, precedent.range.left), key);
      return;
    }
    const id = rangeId(precedent);
    const known = ranges.get(id);

    if (known !== undefined) {
      known.dependents.add(key);
      return;
    }
    const entry: RangeEntry = { ...precedent, dependents: new Set([key]) };

    ranges.set(id, entry);
    place(entry, true);
  };

  const unlink = (key: number, precedent: Precedent): void => {
    if (single(precedent.range)) {
      removeFrom(
        singles,
        formulaKey(precedent.sheet, precedent.range.top, precedent.range.left),
        key,
      );

      return;
    }
    const id = rangeId(precedent);
    const entry = ranges.get(id);

    entry?.dependents.delete(key);
    if (entry?.dependents.size === 0) {
      ranges.delete(id);
      place(entry, false);
    }
  };

  const remove = (key: number): void => {
    precedents.get(key)?.forEach((precedent) => {
      unlink(key, precedent);
    });

    precedents.delete(key);
  };

  const visitEntries = (
    entries: ReadonlySet<RangeEntry> | undefined,
    row: number,
    col: number,
    visit: (key: number) => void,
  ): void => {
    entries?.forEach((entry) => {
      if (containsCell(entry.range, row, col)) {
        entry.dependents.forEach(visit);
      }
    });
  };

  return {
    set: (key, list) => {
      remove(key);
      precedents.set(key, list);

      list.forEach((precedent) => {
        link(key, precedent);
      });
    },
    remove,
    precedentsOf: (key) => precedents.get(key) ?? [],
    forEachDependent: (sheet, row, col, visit) => {
      singles.get(formulaKey(sheet, row, col))?.forEach(visit);

      visitEntries(
        bands.get(bandKey(sheet, Math.floor(row / BAND_ROWS), Math.floor(col / BAND_COLS))),
        row,
        col,
        visit,
      );

      visitEntries(wide.get(sheet), row, col, visit);
    },
  };
};

interface Frame {
  readonly key: number;
  readonly next: number[];
  at: number;
}

export const planRecalc = (seeds: Iterable<number>, graph: DependencyGraph): RecalcPlan => {
  const index = new Map<number, number>();
  const low = new Map<number, number>();
  const onStack = new Set<number>();
  const stack: number[] = [];
  const components: number[][] = [];
  const looped = new Set<number>();
  const cycles = new Set<number>();
  const frames: Frame[] = [];

  const open = (key: number): void => {
    const next: number[] = [];

    graph.forEachDependent(sheetOfKey(key), rowOfKey(key), colOfKey(key), (dependent) => {
      next.push(dependent);
    });

    index.set(key, index.size);
    low.set(key, index.size - 1);
    stack.push(key);
    onStack.add(key);
    frames.push({ key, next, at: 0 });
  };

  const close = (frame: Frame): void => {
    const own = low.get(frame.key) ?? 0;

    if (own === index.get(frame.key)) {
      const component: number[] = [];

      for (let member = stack.pop(); member !== undefined; member = stack.pop()) {
        onStack.delete(member);
        component.push(member);
        if (member === frame.key) {
          break;
        }
      }
      if (component.length > 1 || looped.has(frame.key)) {
        component.forEach((member) => cycles.add(member));
      }
      components.push(component);
    }
    const parent = frames.at(-1);

    if (parent !== undefined) {
      low.set(parent.key, Math.min(low.get(parent.key) ?? 0, own));
    }
  };

  const advance = (frame: Frame): void => {
    const next = frame.next[frame.at];

    frame.at += 1;
    if (next === undefined) {
      return;
    }
    if (next === frame.key) {
      looped.add(next);
    }
    if (!index.has(next)) {
      open(next);
    } else if (onStack.has(next)) {
      low.set(frame.key, Math.min(low.get(frame.key) ?? 0, index.get(next) ?? 0));
    }
  };

  for (const seed of seeds) {
    if (!index.has(seed)) {
      open(seed);
    }
    for (let frame = frames.at(-1); frame !== undefined; frame = frames.at(-1)) {
      if (frame.at < frame.next.length) {
        advance(frame);
      } else {
        frames.pop();
        close(frame);
      }
    }
  }
  return { order: components.toReversed().flat(), cycles };
};
