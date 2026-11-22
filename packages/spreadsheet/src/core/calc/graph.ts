import { MAX_COLS, MAX_ROWS, cellIndex, containsCell } from '../address';
import { LineAxis, type CellRange } from '../cell.types';
import { coversAxis, type LineMove } from '../lines';

export interface Precedent {
  readonly sheet: number;
  readonly range: { top: number; left: number; bottom: number; right: number };
}

export interface DependencyGraph {
  readonly version: number;
  set(key: number, precedents: readonly Precedent[]): void;
  remove(key: number): void;
  precedentsOf(key: number): readonly Precedent[];
  forEachDependent(sheet: number, row: number, col: number, visit: (key: number) => void): void;
  shift(sheet: number, change: LineMove): void;
}

export interface RecalcPlanner {
  advance(overdue: () => boolean, minimum: number): RecalcPlan | undefined;
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

type Dependents = number | readonly number[] | Set<number>;

interface Frame {
  readonly key: number;
  readonly next: number[];
  at: number;
}

export interface GraphPlace {
  readonly sheet: number;
  readonly row: number;
  readonly col: number;
}

const SHEET_CELLS = MAX_ROWS * MAX_COLS;

const BAND_ROWS = 64;

const BAND_COLS = 32;

const ROW_BANDS = MAX_ROWS / BAND_ROWS;

const COL_BANDS = MAX_COLS / BAND_COLS;

const SPAN_LIMIT = 32;

const SMALL_DEPENDENTS = 16;

const CHECK_STEPS = 256;

export const formulaKey = (sheet: number, row: number, col: number): number =>
  sheet * SHEET_CELLS + cellIndex(row, col);

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

const shiftInPlace = (
  range: { top: number; bottom: number; left: number; right: number },
  change: LineMove,
): void => {
  if (change.axis === LineAxis.Rows) {
    range.top += change.count;
    range.bottom = Math.min(range.bottom + change.count, MAX_ROWS - 1);
  } else {
    range.left += change.count;
    range.right = Math.min(range.right + change.count, MAX_COLS - 1);
  }
};

const firstLine = (range: CellRange, axis: LineMove['axis']): number =>
  axis === LineAxis.Rows ? range.top : range.left;

const moveRange = (range: CellRange, change: LineMove): CellRange =>
  change.axis === LineAxis.Rows
    ? {
        ...range,
        top: range.top + change.count,
        bottom: Math.min(range.bottom + change.count, MAX_ROWS - 1),
      }
    : {
        ...range,
        left: range.left + change.count,
        right: Math.min(range.right + change.count, MAX_COLS - 1),
      };

const addDependent = (map: Map<number, Dependents>, cell: number, key: number): void => {
  const known = map.get(cell);

  if (known === undefined) {
    map.set(cell, key);
  } else if (typeof known === 'number') {
    map.set(cell, known === key ? key : [known, key]);
  } else if (known instanceof Set) {
    known.add(key);
  } else if (!known.includes(key)) {
    map.set(cell, known.length < SMALL_DEPENDENTS ? [...known, key] : new Set([...known, key]));
  }
};

const withoutKey = (known: readonly number[], key: number): Dependents | undefined => {
  const rest = known.reduce<number[]>((kept, member) => {
    if (member !== key) {
      kept.push(member);
    }
    return kept;
  }, []);

  return rest.length > 1 ? rest : rest[0];
};

const remainingAfter = (known: Dependents, key: number): Dependents | undefined => {
  if (typeof known === 'number') {
    return known === key ? undefined : known;
  }
  if (known instanceof Set) {
    known.delete(key);
    return known.size === 0 ? undefined : known;
  }
  return withoutKey(known, key);
};

const removeDependent = (map: Map<number, Dependents>, cell: number, key: number): void => {
  const known = map.get(cell);
  const left = known === undefined ? undefined : remainingAfter(known, key);

  if (left === undefined) {
    map.delete(cell);
  } else if (left !== known) {
    map.set(cell, left);
  }
};

const visitDependents = (known: Dependents | undefined, visit: (key: number) => void): void => {
  if (typeof known === 'number') {
    visit(known);
  } else {
    known?.forEach(visit);
  }
};

const removeFrom = <K, V>(map: Map<K, Set<V>>, key: K, value: V): void => {
  const known = map.get(key);

  known?.delete(value);
  if (known?.size !== 0) {
    return;
  }

  map.delete(key);
};

export const createDependencyGraph = (): DependencyGraph => {
  const singles = new Map<number, Map<number, Dependents>>();
  let version = 0;

  const singlesOf = (sheet: number): Map<number, Dependents> => {
    const known = singles.get(sheet);

    if (known !== undefined) {
      return known;
    }

    const created = new Map<number, Dependents>();

    singles.set(sheet, created);
    return created;
  };

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
      addDependent(
        singlesOf(precedent.sheet),
        cellIndex(precedent.range.top, precedent.range.left),
        key,
      );

      return;
    }
    const id = rangeId(precedent);
    const known = ranges.get(id);

    if (known !== undefined) {
      known.dependents.add(key);
      return;
    }

    const entry: RangeEntry = {
      sheet: precedent.sheet,
      range: { ...precedent.range },
      dependents: new Set([key]),
    };

    ranges.set(id, entry);
    place(entry, true);
  };

  const unlink = (key: number, precedent: Precedent): void => {
    if (single(precedent.range)) {
      removeDependent(
        singlesOf(precedent.sheet),
        cellIndex(precedent.range.top, precedent.range.left),
        key,
      );

      return;
    }
    const id = rangeId(precedent);
    const entry = ranges.get(id);

    entry?.dependents.delete(key);
    if (entry?.dependents.size !== 0) {
      return;
    }

    ranges.delete(id);
    place(entry, false);
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
      if (!containsCell(entry.range, row, col)) {
        return;
      }

      entry.dependents.forEach(visit);
    });
  };

  const shift = (sheet: number, change: LineMove): void => {
    const start = change.at + Math.max(-change.count, 0);
    const offset = change.axis === LineAxis.Rows ? change.count * MAX_COLS : change.count;

    const movesRange = (precedent: Precedent): boolean =>
      precedent.sheet === sheet &&
      firstLine(precedent.range, change.axis) >= start &&
      !coversAxis(precedent.range, change.axis);

    const cells = singles.get(sheet);
    const moved: (readonly [number, Dependents])[] = [];

    cells?.forEach((members, cell) => {
      if ((change.axis === LineAxis.Rows ? Math.floor(cell / MAX_COLS) : cell % MAX_COLS) < start) {
        return;
      }

      moved.push([cell, members]);
    });

    moved.forEach(([cell]) => cells?.delete(cell));
    moved.forEach(([cell, members]) => cells?.set(cell + offset, members));

    const moving: (readonly [string, RangeEntry])[] = [];

    ranges.forEach((entry, id) => {
      if (!movesRange(entry)) {
        return;
      }

      moving.push([id, entry]);
    });

    moving.forEach(([id, entry]) => {
      ranges.delete(id);
      place(entry, false);
    });

    moving.forEach(([, entry]) => {
      const shifted: RangeEntry = { ...entry, range: moveRange(entry.range, change) };
      const known = ranges.get(rangeId(shifted));

      if (known === undefined) {
        ranges.set(rangeId(shifted), shifted);
        place(shifted, true);
      } else {
        entry.dependents.forEach((key) => known.dependents.add(key));
      }
    });

    precedents.forEach((list) => {
      list.forEach((precedent) => {
        if (!movesRange(precedent)) {
          return;
        }

        shiftInPlace(precedent.range, change);
      });
    });
  };

  return {
    get version() {
      return version;
    },
    shift: (sheet, change) => {
      version += 1;
      shift(sheet, change);
    },
    set: (key, list) => {
      version += 1;
      remove(key);
      precedents.set(key, list);

      list.forEach((precedent) => {
        link(key, precedent);
      });
    },
    remove: (key) => {
      version += 1;
      remove(key);
    },
    precedentsOf: (key) => precedents.get(key) ?? [],
    forEachDependent: (sheet, row, col, visit) => {
      visitDependents(singles.get(sheet)?.get(cellIndex(row, col)), visit);

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

export const createPlanner = (
  seeds: Iterable<number>,
  graph: Pick<DependencyGraph, 'forEachDependent'>,
  locate: (key: number) => GraphPlace | undefined,
): RecalcPlanner => {
  const roots = [...seeds];
  const index = new Map<number, number>();
  const low = new Map<number, number>();
  const onStack = new Set<number>();
  const stack: number[] = [];
  const closed: number[] = [];
  const looped = new Set<number>();
  const cycles = new Set<number>();
  const frames: Frame[] = [];

  const open = (key: number): void => {
    const next: number[] = [];

    const place = locate(key);

    if (place !== undefined) {
      graph.forEachDependent(place.sheet, place.row, place.col, (dependent) => {
        next.push(dependent);
      });
    }

    index.set(key, index.size);
    low.set(key, index.size - 1);
    stack.push(key);
    onStack.add(key);
    frames.push({ key, next, at: 0 });
  };

  const close = (frame: Frame): void => {
    const own = low.get(frame.key) ?? 0;

    if (own === index.get(frame.key)) {
      const start = closed.length;

      for (let member = stack.pop(); member !== undefined; member = stack.pop()) {
        onStack.delete(member);
        closed.push(member);
        if (member === frame.key) {
          break;
        }
      }
      if (closed.length - start > 1 || looped.has(frame.key)) {
        closed.slice(start).forEach((member) => cycles.add(member));
      }
    }
    const parent = frames.at(-1);

    if (parent === undefined) {
      return;
    }

    low.set(parent.key, Math.min(low.get(parent.key) ?? 0, own));
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

  let root = 0;
  let steps = 0;

  const walk = (): void => {
    const frame = frames.at(-1);

    if (frame === undefined) {
      const seed = roots[root] ?? -1;

      root += 1;
      if (!index.has(seed)) {
        open(seed);
      }
    } else if (frame.at < frame.next.length) {
      advance(frame);
    } else {
      frames.pop();
      close(frame);
    }
  };

  const unfinished = (): boolean => frames.length > 0 || root < roots.length;

  return {
    advance: (overdue, minimum) => {
      const from = steps;

      while (unfinished()) {
        walk();
        steps += 1;
        if (steps - from >= minimum && steps % CHECK_STEPS === 0 && overdue()) {
          return undefined;
        }
      }
      return { order: closed.toReversed(), cycles };
    },
  };
};

export const planRecalc = (
  seeds: Iterable<number>,
  graph: Pick<DependencyGraph, 'forEachDependent'>,
  locate: (key: number) => GraphPlace | undefined,
): RecalcPlan => {
  const plan = createPlanner(seeds, graph, locate).advance(() => false, 0);

  return plan ?? { order: [], cycles: new Set() };
};
