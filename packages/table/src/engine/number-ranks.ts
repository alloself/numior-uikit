import { CHECK_INTERVAL, type SliceJob } from './slicer';
import {
  createKeptRadixJob,
  createRadixSortJob,
  type KeptRadixJob,
  type SortedKeys,
} from './radix';
import { identityIndices } from './sort';

export interface NumberRanks {
  readonly ranks: Uint32Array;
  readonly size: number;
}

interface NumberKeys {
  readonly keys: Float64Array;
  readonly nulls: Uint8Array;
}

interface Assigning {
  readonly sorting: KeptRadixJob;
  readonly store: NumberKeys;
  readonly reversed: boolean;
}

interface PendingRanks {
  readonly sorting: KeptRadixJob;
  readonly descending: boolean;
}

const known = new WeakMap<Float64Array, NumberRanks>();

const pending = new WeakMap<Float64Array, PendingRanks>();

export const numberRanksOf = (store: NumberKeys): NumberRanks | undefined => known.get(store.keys);

const ALL_ONES = 0xff_ff_ff_ff;

const createAssignJob = ({ sorting, store, reversed }: Assigning): SliceJob => {
  const { keys, nulls } = store;
  const length = keys.length;
  const ranks = new Uint32Array(length);
  let position = 0;
  let flipped = 0;
  let rank = -1;
  let previousHi = -1;
  let previousLo = -1;

  const rankBlock = (sorted: SortedKeys, stop: number): void => {
    for (let at = position; at < stop; at += 1) {
      const hi = sorted.hi[at] ?? 0;
      const lo = sorted.lo[at] ?? 0;
      const row = sorted.idx[at] ?? 0;
      const present = hi !== ALL_ONES || lo !== ALL_ONES || nulls[row] !== 1;

      rank += present && (hi !== previousHi || lo !== previousLo) ? 1 : 0;
      previousHi = present ? hi : previousHi;
      previousLo = present ? lo : previousLo;
      ranks[row] = present ? rank : 0;
    }
  };

  const assign = (sorted: SortedKeys, deadline: number): boolean => {
    while (position < length) {
      const stop = Math.min(length, position + CHECK_INTERVAL);

      rankBlock(sorted, stop);
      position = stop;
      if (performance.now() >= deadline) {
        return false;
      }
    }
    return true;
  };

  const flip = (deadline: number): boolean => {
    while (flipped < length) {
      const stop = Math.min(length, flipped + CHECK_INTERVAL);

      for (let row = flipped; row < stop; row += 1) {
        ranks[row] = rank - (ranks[row] ?? 0);
      }
      flipped = stop;
      if (performance.now() >= deadline) {
        return false;
      }
    }
    return true;
  };

  return {
    total: () => length * (reversed ? 2 : 1),
    done: () => position + flipped,
    work: (deadline) => {
      const sorted = sorting.sorted();

      if (sorted === undefined) {
        return true;
      }
      if (!assign(sorted, deadline) || (reversed && !flip(deadline))) {
        return false;
      }
      sorted.release();
      known.set(keys, { ranks, size: rank + 1 });
      return true;
    },
  };
};

export const createThenJob = (first: SliceJob, next: () => SliceJob): SliceJob => {
  let second: SliceJob | undefined;

  return {
    total: () => first.total() + (second?.total() ?? first.total() / 2),
    done: () => first.done() + (second?.done() ?? 0),
    work: (deadline) => {
      if (second === undefined && !first.work(deadline)) {
        return false;
      }
      second ??= next();
      return second.work(deadline);
    },
  };
};

const sortedPending = (store: NumberKeys): PendingRanks | undefined => {
  const waiting = pending.get(store.keys);

  return waiting?.sorting.sorted() === undefined ? undefined : waiting;
};

export const hasPendingRanks = (store: NumberKeys): boolean => sortedPending(store) !== undefined;

export const createNumberRankJob = (store: NumberKeys): SliceJob => {
  const waiting = sortedPending(store);

  if (waiting !== undefined) {
    pending.delete(store.keys);
    return createAssignJob({ sorting: waiting.sorting, store, reversed: waiting.descending });
  }

  const sorting = createKeptRadixJob(
    identityIndices(store.keys.length),
    [{ kind: 'float', keys: store.keys, nulls: store.nulls, descending: false }],
    true,
  );

  return createThenJob(sorting, () => createAssignJob({ sorting, store, reversed: false }));
};

export const createRankingSortJob = (
  indices: Uint32Array,
  store: NumberKeys,
  descending: boolean,
): SliceJob => {
  const lane = { kind: 'float', keys: store.keys, nulls: store.nulls, descending } as const;

  if (indices.length !== store.keys.length) {
    return createRadixSortJob(indices, [lane]);
  }

  const sorting = createKeptRadixJob(indices, [lane], true);

  pending.set(store.keys, { sorting, descending });
  return sorting;
};
