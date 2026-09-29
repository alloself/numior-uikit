import { CHECK_INTERVAL, type SliceJob } from './slicer';

export type RadixLane =
  | {
      readonly kind: 'float';
      readonly keys: Float64Array;
      readonly nulls: Uint8Array;
      readonly descending: boolean;
    }
  | {
      readonly kind: 'rank';
      readonly keys: Uint32Array;
      readonly nulls: Uint8Array;
      readonly descending: boolean;
      readonly size: number;
    };

type Phase = 'gather' | 'count' | 'scatter';

interface RadixState {
  lane: number;
  digit: number;
  phase: Phase;
  position: number;
  done: number;
}

interface Buffers {
  hi: Uint32Array;
  lo: Uint32Array;
  idx: Uint32Array;
  nextHi: Uint32Array;
  nextLo: Uint32Array;
  nextIdx: Uint32Array;
}

const DIGIT_BITS = 16;
const BUCKETS = 1 << DIGIT_BITS;
const DIGIT_MASK = BUCKETS - 1;
const ALL_ONES = 0xff_ff_ff_ff;
const SIGN = 0x80_00_00_00;

const scratch = new Float64Array(1);
const words = new Uint32Array(scratch.buffer);
const LITTLE_ENDIAN = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
const LOW_WORD = LITTLE_ENDIAN ? 0 : 1;
const HIGH_WORD = LITTLE_ENDIAN ? 1 : 0;

const digitsOf = (lane: RadixLane): number => (lane.kind === 'rank' ? 2 : 4);

const digitAt = (buffers: Buffers, digit: number, position: number): number => {
  const word = digit < 2 ? (buffers.lo[position] ?? 0) : (buffers.hi[position] ?? 0);
  return digit % 2 === 0 ? word & DIGIT_MASK : word >>> DIGIT_BITS;
};

const writeFloat = (buffers: Buffers, at: number, value: number, descending: boolean): void => {
  scratch[0] = value === 0 ? 0 : value;
  const highWord = words[HIGH_WORD] ?? 0;
  const lowWord = words[LOW_WORD] ?? 0;
  const negative = (highWord & SIGN) !== 0;
  const high = negative ? ~highWord : highWord | SIGN;
  const low = negative ? ~lowWord : lowWord;

  buffers.hi[at] = (descending ? ~high : high) >>> 0;
  buffers.lo[at] = (descending ? ~low : low) >>> 0;
};

const writeKey = (lane: RadixLane, row: number, buffers: Buffers, at: number): void => {
  if (lane.nulls[row] === 1) {
    buffers.hi[at] = ALL_ONES;
    buffers.lo[at] = ALL_ONES;
  } else if (lane.kind === 'rank') {
    const rank = lane.keys[row] ?? 0;
    buffers.hi[at] = 0;
    buffers.lo[at] = lane.descending ? lane.size - 1 - rank : rank;
  } else {
    writeFloat(buffers, at, lane.keys[row] ?? 0, lane.descending);
  }
};

const offsetsFrom = (counts: Uint32Array): void => {
  let sum = 0;

  for (let bucket = 0; bucket < BUCKETS; bucket += 1) {
    const size = counts[bucket] ?? 0;
    counts[bucket] = sum;
    sum += size;
  }
};

export const createRadixSortJob = (indices: Uint32Array, lanes: readonly RadixLane[]): SliceJob => {
  const length = indices.length;
  const counts = new Uint32Array(BUCKETS);
  const total = Math.max(1, lanes.reduce((sum, lane) => sum + 1 + digitsOf(lane) * 2, 0) * length);

  const buffers: Buffers = {
    hi: new Uint32Array(length),
    lo: new Uint32Array(length),
    idx: indices.slice(),
    nextHi: new Uint32Array(length),
    nextLo: new Uint32Array(length),
    nextIdx: new Uint32Array(length),
  };

  const state: RadixState = {
    lane: lanes.length - 1,
    digit: 0,
    phase: 'gather',
    position: 0,
    done: 0,
  };

  const due = (deadline: number): boolean =>
    state.position % CHECK_INTERVAL === 0 && performance.now() >= deadline;

  const gather = (lane: RadixLane, deadline: number): boolean => {
    while (state.position < length) {
      writeKey(lane, buffers.idx[state.position] ?? 0, buffers, state.position);
      state.position += 1;

      if (due(deadline)) {
        return false;
      }
    }
    return true;
  };

  const count = (deadline: number): boolean => {
    while (state.position < length) {
      const bucket = digitAt(buffers, state.digit, state.position);
      counts[bucket] = (counts[bucket] ?? 0) + 1;
      state.position += 1;

      if (due(deadline)) {
        return false;
      }
    }
    return true;
  };

  const scatter = (deadline: number): boolean => {
    while (state.position < length) {
      const from = state.position;
      const bucket = digitAt(buffers, state.digit, from);
      const target = counts[bucket] ?? 0;
      counts[bucket] = target + 1;
      buffers.nextHi[target] = buffers.hi[from] ?? 0;
      buffers.nextLo[target] = buffers.lo[from] ?? 0;
      buffers.nextIdx[target] = buffers.idx[from] ?? 0;
      state.position += 1;

      if (due(deadline)) {
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

  const enter = (phase: Phase): void => {
    state.phase = phase;
    state.position = 0;

    if (phase === 'count') {
      counts.fill(0);
    }
  };

  const nextDigit = (lane: RadixLane, skipped: boolean): void => {
    state.done += skipped ? 2 : 1;
    state.digit += 1;

    if (state.digit < digitsOf(lane)) {
      enter('count');
      return;
    }
    state.lane -= 1;
    state.digit = 0;
    enter('gather');
  };

  const step = (lane: RadixLane, deadline: number): boolean => {
    switch (state.phase) {
      case 'gather':
        if (!gather(lane, deadline)) {
          return false;
        }
        state.done += 1;
        enter('count');
        return true;
      case 'count':
        if (!count(deadline)) {
          return false;
        }
        if (counts.includes(length)) {
          nextDigit(lane, true);
          return true;
        }
        state.done += 1;
        offsetsFrom(counts);
        enter('scatter');
        return true;
      case 'scatter':
        if (!scatter(deadline)) {
          return false;
        }
        swap();
        nextDigit(lane, false);
        return true;
    }
  };

  return {
    total: () => total,
    done: () => Math.min(total, state.done * length + state.position),
    work: (deadline) => {
      for (let lane = lanes[state.lane]; lane !== undefined; lane = lanes[state.lane]) {
        if (!step(lane, deadline)) {
          return false;
        }
      }
      indices.set(buffers.idx);
      return true;
    },
  };
};
