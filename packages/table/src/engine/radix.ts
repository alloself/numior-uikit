import { CHECK_INTERVAL, type SliceJob } from './slicer';
import { RadixGroupKind, RadixLaneKind } from './engine.types';

export type RadixLane =
  | {
      readonly kind: typeof RadixLaneKind.Float;
      readonly keys: Float64Array;
      readonly nulls: Uint8Array;
      readonly descending: boolean;
    }
  | {
      readonly kind: typeof RadixLaneKind.Rank;
      readonly keys: Uint32Array;
      readonly nulls: Uint8Array;
      readonly descending: boolean;
      readonly size: number;
    };

type RankLane = Extract<RadixLane, { readonly kind: 'rank' }>;

type FloatLane = Extract<RadixLane, { readonly kind: 'float' }>;

type Group =
  | { readonly kind: typeof RadixGroupKind.Float; readonly lane: FloatLane }
  | {
      readonly kind: typeof RadixGroupKind.Packed;
      readonly lanes: readonly Packed[];
      readonly bits: number;
    };

interface Packed {
  readonly lane: RankLane;
  readonly shift: number;
}

interface Buffers {
  hi: Uint32Array;
  lo: Uint32Array;
  idx: Uint32Array;
  nextHi: Uint32Array;
  nextLo: Uint32Array;
  nextIdx: Uint32Array;
}

interface Layout {
  readonly digits: number;
  readonly width: number;
  readonly bits: number;
}

interface RadixState {
  group: number;
  digit: number;
  gathering: boolean;
  position: number;
  done: number;
}

export interface SortedKeys {
  readonly hi: Uint32Array;
  readonly lo: Uint32Array;
  readonly idx: Uint32Array;
  release(): void;
}

export interface KeptRadixJob extends SliceJob {
  sorted(): SortedKeys | undefined;
}

const MAX_DIGIT_BITS = 16;
const WORD_BITS = 32;
const GROUP_BITS = 64;
const ALL_ONES = 0xff_ff_ff_ff;
const SIGN = 0x80_00_00_00;
const POOLED = 2;

const scratch = new Float64Array(1);
const words = new Uint32Array(scratch.buffer);
const LITTLE_ENDIAN = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
const LOW_WORD = LITTLE_ENDIAN ? 0 : 1;
const HIGH_WORD = LITTLE_ENDIAN ? 1 : 0;

const pools = new Map<number, Buffers[]>();

const bitsFor = (value: number): number => (value <= 0 ? 1 : WORD_BITS - Math.clz32(value));

const buffersFor = (length: number): Buffers =>
  pools.get(length)?.pop() ?? {
    hi: new Uint32Array(length),
    lo: new Uint32Array(length),
    idx: new Uint32Array(length),
    nextHi: new Uint32Array(length),
    nextLo: new Uint32Array(length),
    nextIdx: new Uint32Array(length),
  };

const release = (length: number, buffers: Buffers): void => {
  const pool = pools.get(length) ?? [];

  if (pool.length < POOLED) {
    pool.push(buffers);
  }
  pools.set(length, pool);
};

const groupsOf = (lanes: readonly RadixLane[]): Group[] =>
  lanes.reduce<{ groups: Group[]; open: RankLane[] }>(
    (state, lane, index) => {
      const close = (): void => {
        if (state.open.length > 0) {
          const bits = state.open.map((item) => bitsFor(item.size));
          let shift = bits.reduce((sum, item) => sum + item, 0);
          const total = shift;

          state.groups.push({
            kind: 'packed',
            bits: total,
            lanes: state.open.map((item, at) => {
              shift -= bits[at] ?? 0;
              return { lane: item, shift };
            }),
          });

          state.open = [];
        }
      };

      if (lane.kind === RadixLaneKind.Float) {
        close();
        state.groups.push({ kind: 'float', lane });
      } else {
        const used = state.open.reduce((sum, item) => sum + bitsFor(item.size), 0);

        if (used + bitsFor(lane.size) > GROUP_BITS) {
          close();
        }
        state.open.push(lane);
      }
      if (index === lanes.length - 1) {
        close();
      }
      return state;
    },
    { groups: [], open: [] },
  ).groups;

const layoutOf = (group: Group): Layout => {
  const bits = group.kind === RadixGroupKind.Float ? GROUP_BITS : group.bits;
  const digits = Math.max(1, Math.ceil(bits / MAX_DIGIT_BITS));

  return { digits, width: Math.ceil(bits / digits), bits };
};

const digitOf = (hi: number, lo: number, start: number, mask: number): number => {
  if (start >= WORD_BITS) {
    return (hi >>> (start - WORD_BITS)) & mask;
  }
  return ((lo >>> start) | (start === 0 ? 0 : hi << (WORD_BITS - start))) & mask;
};

const floatKey = (buffers: Buffers, at: number, value: number, descending: boolean): void => {
  scratch[0] = value === 0 ? 0 : value;

  const highWord = words[HIGH_WORD] ?? 0;
  const lowWord = words[LOW_WORD] ?? 0;
  const negative = (highWord & SIGN) !== 0;
  const high = negative ? ~highWord : highWord | SIGN;
  const low = negative ? ~lowWord : lowWord;

  buffers.hi[at] = descending ? ~high : high;
  buffers.lo[at] = descending ? ~low : low;
};

const packedKey = (buffers: Buffers, at: number, lanes: readonly Packed[], row: number): void => {
  let hi = 0;
  let lo = 0;

  for (const { lane, shift } of lanes) {
    const rank = lane.keys[row] ?? 0;
    const value = lane.nulls[row] === 1 ? lane.size : lane.descending ? lane.size - 1 - rank : rank;

    if (shift >= WORD_BITS) {
      hi |= value << (shift - WORD_BITS);
    } else {
      lo |= value << shift;
      hi |= shift === 0 ? 0 : value >>> (WORD_BITS - shift);
    }
  }
  buffers.hi[at] = hi;
  buffers.lo[at] = lo;
};

const writeKey = (group: Group, buffers: Buffers, at: number): void => {
  const row = buffers.idx[at] ?? 0;

  if (group.kind === RadixGroupKind.Packed) {
    packedKey(buffers, at, group.lanes, row);
  } else if (group.lane.nulls[row] === 1) {
    buffers.hi[at] = ALL_ONES;
    buffers.lo[at] = ALL_ONES;
  } else {
    floatKey(buffers, at, group.lane.keys[row] ?? 0, group.lane.descending);
  }
};

const offsetsFrom = (counts: Uint32Array, from: number, size: number): void => {
  let sum = 0;

  for (let bucket = from; bucket < from + size; bucket += 1) {
    const count = counts[bucket] ?? 0;

    counts[bucket] = sum;
    sum += count;
  }
};

const single = (counts: Uint32Array, from: number, size: number, length: number): boolean => {
  for (let bucket = from; bucket < from + size; bucket += 1) {
    const count = counts[bucket] ?? 0;

    if (count !== 0) {
      return count === length;
    }
  }
  return true;
};

export const createRadixSortJob = (indices: Uint32Array, lanes: readonly RadixLane[]): SliceJob =>
  createKeptRadixJob(indices, lanes, false);

export const createKeptRadixJob = (
  indices: Uint32Array,
  lanes: readonly RadixLane[],
  keep: boolean,
): KeptRadixJob => {
  const length = indices.length;
  const groups = groupsOf(lanes);
  const layouts = groups.map(layoutOf);
  const buckets = 1 << Math.max(...layouts.map((layout) => layout.width), 1);
  const counts = new Uint32Array(buckets * Math.max(...layouts.map((layout) => layout.digits), 1));
  const total = Math.max(1, layouts.reduce((sum, layout) => sum + 1 + layout.digits, 0) * length);
  const buffers = buffersFor(length);

  const state: RadixState = {
    group: groups.length - 1,
    digit: 0,
    gathering: true,
    position: 0,
    done: 0,
  };

  buffers.idx.set(indices);

  const gather = (group: Group, layout: Layout, deadline: number): boolean => {
    const mask = (1 << layout.width) - 1;

    while (state.position < length) {
      const stop = Math.min(length, state.position + CHECK_INTERVAL);

      for (let at = state.position; at < stop; at += 1) {
        writeKey(group, buffers, at);

        const hi = buffers.hi[at] ?? 0;
        const lo = buffers.lo[at] ?? 0;

        for (let digit = 0; digit < layout.digits; digit += 1) {
          const bucket = digit * buckets + digitOf(hi, lo, digit * layout.width, mask);

          counts[bucket] = (counts[bucket] ?? 0) + 1;
        }
      }
      state.position = stop;
      if (performance.now() >= deadline) {
        return false;
      }
    }
    return true;
  };

  const scatter = (layout: Layout, deadline: number): boolean => {
    const mask = (1 << layout.width) - 1;
    const start = state.digit * layout.width;
    const base = state.digit * buckets;

    while (state.position < length) {
      const stop = Math.min(length, state.position + CHECK_INTERVAL);

      for (let from = state.position; from < stop; from += 1) {
        const hi = buffers.hi[from] ?? 0;
        const lo = buffers.lo[from] ?? 0;
        const bucket = base + digitOf(hi, lo, start, mask);
        const target = counts[bucket] ?? 0;

        counts[bucket] = target + 1;
        buffers.nextHi[target] = hi;
        buffers.nextLo[target] = lo;
        buffers.nextIdx[target] = buffers.idx[from] ?? 0;
      }
      state.position = stop;
      if (performance.now() >= deadline) {
        return false;
      }
    }
    return true;
  };

  const swap = (): void => {
    [buffers.hi, buffers.nextHi] = [buffers.nextHi, buffers.hi];
    [buffers.lo, buffers.nextLo] = [buffers.nextLo, buffers.lo];
    [buffers.idx, buffers.nextIdx] = [buffers.nextIdx, buffers.idx];
  };

  const advance = (layout: Layout): void => {
    state.position = 0;
    state.digit += 1;
    while (state.digit < layout.digits && single(counts, state.digit * buckets, buckets, length)) {
      state.done += length;
      state.digit += 1;
    }
    if (state.digit < layout.digits) {
      offsetsFrom(counts, state.digit * buckets, buckets);
    }
  };

  const step = (group: Group, layout: Layout, deadline: number): boolean => {
    if (state.gathering) {
      if (!gather(group, layout, deadline)) {
        return false;
      }
      state.done += length;
      state.gathering = false;
      state.digit = -1;
      advance(layout);
      return true;
    }
    if (state.digit < layout.digits) {
      if (!scatter(layout, deadline)) {
        return false;
      }
      state.done += length;
      swap();
      advance(layout);
      return true;
    }
    state.group -= 1;
    state.gathering = true;
    state.position = 0;
    counts.fill(0);
    return true;
  };

  let finished = false;

  return {
    total: () => total,
    done: () => (finished ? total : Math.min(total, state.done + state.position)),
    work: (deadline) => {
      if (finished) {
        return true;
      }
      for (let group = groups[state.group]; group !== undefined; group = groups[state.group]) {
        if (!step(group, layouts[state.group] ?? layoutOf(group), deadline)) {
          return false;
        }
      }
      indices.set(buffers.idx);
      if (!keep) {
        release(length, buffers);
      }
      finished = true;
      return true;
    },
    sorted: () =>
      finished && keep
        ? {
            hi: buffers.hi,
            lo: buffers.lo,
            idx: buffers.idx,
            release: () => {
              release(length, buffers);
            },
          }
        : undefined,
  };
};
