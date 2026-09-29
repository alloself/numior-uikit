import { describe, expect, it } from 'vitest';
import {
  createRadixSortJob,
  createSortJob,
  identityIndices,
  type RadixLane,
  type SliceJob,
} from '../src/engine';
import { mulberry32 } from '../bench/dataset';

const finish = (job: SliceJob): number[] => {
  const progress: number[] = [];

  while (!job.work(performance.now() - 1)) {
    progress.push(job.done());
  }

  expect(progress.every((done, index) => index === 0 || done >= (progress[index - 1] ?? 0))).toBe(
    true,
  );

  return progress;
};

const sorted = (length: number, lanes: readonly RadixLane[]): number[] => {
  const indices = identityIndices(length);
  finish(createRadixSortJob(indices, lanes));
  return Array.from(indices);
};

const orderKey = (lane: RadixLane, index: number): number => {
  const key = lane.keys[index] ?? 0;

  if (lane.nulls[index] === 1) {
    return Number.POSITIVE_INFINITY;
  }
  return lane.descending ? -key : key;
};

const compareRows = (lanes: readonly RadixLane[], a: number, b: number): number => {
  for (const lane of lanes) {
    const keyA = orderKey(lane, a);
    const keyB = orderKey(lane, b);

    if (keyA !== keyB) {
      return keyA < keyB ? -1 : 1;
    }
  }
  return 0;
};

const merged = (length: number, lanes: readonly RadixLane[]): number[] => {
  const indices = identityIndices(length);

  const job = createSortJob(indices, (a, b) => compareRows(lanes, a, b));

  while (!job.work(Number.POSITIVE_INFINITY)) {
    expect(job.done()).toBeLessThanOrEqual(job.total());
  }
  return Array.from(indices);
};

describe('createRadixSortJob', () => {
  it('orders floats both ways with missing values last, zero signs merged and ties stable', () => {
    const keys = new Float64Array([3, -1.5, 0, -0, Infinity, -Infinity, 2.25, 3, 0]);
    const nulls = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 1]);

    expect(sorted(9, [{ kind: 'float', keys, nulls, descending: false }])).toEqual([
      5, 1, 2, 3, 6, 0, 7, 4, 8,
    ]);

    expect(sorted(9, [{ kind: 'float', keys, nulls, descending: true }])).toEqual([
      4, 0, 7, 6, 2, 3, 1, 5, 8,
    ]);
  });

  it('orders dictionary ranks both ways with missing values last', () => {
    const keys = new Uint32Array([2, 0, 1, 0, 2, 0]);
    const nulls = new Uint8Array([0, 0, 0, 0, 0, 1]);

    expect(sorted(6, [{ kind: 'rank', keys, nulls, descending: false, size: 3 }])).toEqual([
      1, 3, 2, 0, 4, 5,
    ]);

    expect(sorted(6, [{ kind: 'rank', keys, nulls, descending: true, size: 3 }])).toEqual([
      0, 4, 2, 1, 3, 5,
    ]);
  });

  it('matches the stable merge sort on random multi-key data across many slices', () => {
    const random = mulberry32(11);
    const length = 60_000;
    const size = 40_000;
    const ranks = new Uint32Array(length);
    const rankNulls = new Uint8Array(length);
    const amounts = new Float64Array(length);
    const amountNulls = new Uint8Array(length);

    for (let index = 0; index < length; index += 1) {
      ranks[index] = Math.floor(random() * size);
      rankNulls[index] = random() < 0.05 ? 1 : 0;
      amounts[index] = Math.round((random() - 0.4) * 1e6) / 100;
      amountNulls[index] = random() < 0.1 ? 1 : 0;
    }

    const lanes: RadixLane[] = [
      { kind: 'rank', keys: ranks, nulls: rankNulls, descending: true, size },
      { kind: 'float', keys: amounts, nulls: amountNulls, descending: false },
    ];

    expect(sorted(length, lanes)).toEqual(merged(length, lanes));
    expect(sorted(length, lanes.toReversed())).toEqual(merged(length, lanes.toReversed()));
  });

  it('keeps every slice near its budget and reports the whole job as done', () => {
    const random = mulberry32(5);
    const length = 400_000;
    const keys = Float64Array.from({ length }, () => random() * 1e9);
    const nulls = new Uint8Array(length);
    const indices = identityIndices(length);
    const job = createRadixSortJob(indices, [{ kind: 'float', keys, nulls, descending: false }]);
    let longest = 0;
    let finished = false;

    while (!finished) {
      const started = performance.now();
      finished = job.work(started + 4);
      longest = Math.max(longest, performance.now() - started);
    }
    expect(longest).toBeLessThanOrEqual(16);
    expect(job.done()).toBe(job.total());

    const ordered = Array.from(indices, (index) => keys[index] ?? 0);
    expect(ordered.every((key, at) => at === 0 || key >= (ordered[at - 1] ?? 0))).toBe(true);
  });
});
