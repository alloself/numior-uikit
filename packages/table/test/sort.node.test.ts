import { describe, expect, it } from 'vite-plus/test';
import { createSortJob, identityIndices } from '../src/engine';
import { mulberry32 } from '../bench/dataset';

const BUDGET_MS = 4;
const FRAME_MS = 16;

const keysOf = (count: number, seed: number, range: number): Float64Array => {
  const random = mulberry32(seed);
  const keys = new Float64Array(count);

  for (let index = 0; index < count; index += 1) {
    keys[index] = Math.floor(random() * range);
  }
  return keys;
};

const expectedOrder = (keys: Float64Array): number[] =>
  Array.from(identityIndices(keys.length)).toSorted(
    (a, b) => (keys[a] ?? 0) - (keys[b] ?? 0) || a - b,
  );

const runInSlices = (job: { work(deadline: number): boolean; done(): number }): number[] => {
  const seen: number[] = [];

  while (!job.work(performance.now() - 1)) {
    seen.push(job.done());
  }
  return seen;
};

describe('createSortJob', () => {
  it('sorts stably across many resumed slices and reports monotonic progress', () => {
    const keys = keysOf(20_000, 7, 50);
    const indices = identityIndices(keys.length);
    const job = createSortJob(indices, (a, b) => (keys[a] ?? 0) - (keys[b] ?? 0));
    const progress = runInSlices(job);

    expect(Array.from(indices)).toEqual(expectedOrder(keys));
    expect(progress.length).toBeGreaterThan(10);

    expect(
      progress.every((value, index) => index === 0 || value >= (progress[index - 1] ?? 0)),
    ).toBe(true);

    expect(job.done()).toBe(job.total());
  });

  it('finishes a tiny or already sorted input in one call', () => {
    const single = identityIndices(1);
    expect(createSortJob(single, () => 0).work(performance.now() + 5)).toBe(true);
    const keys = new Float64Array([1, 2, 3, 4]);
    const indices = identityIndices(4);

    expect(createSortJob(indices, (a, b) => (keys[a] ?? 0) - (keys[b] ?? 0)).work(Infinity)).toBe(
      true,
    );

    expect(Array.from(indices)).toEqual([0, 1, 2, 3]);
  });

  it('keeps every work slice near its budget on a large input', () => {
    const keys = keysOf(300_000, 3, 1_000_000);
    const indices = identityIndices(keys.length);
    const job = createSortJob(indices, (a, b) => (keys[a] ?? 0) - (keys[b] ?? 0));
    const laps: number[] = [];
    let finished = false;

    while (!finished) {
      const started = performance.now();
      finished = job.work(started + BUDGET_MS);
      laps.push(performance.now() - started);
    }

    expect(laps.length).toBeGreaterThan(2);

    expect(laps.reduce((count, lap) => count + Number(lap > FRAME_MS - BUDGET_MS), 0)).toBeLessThan(
      laps.length / 2,
    );

    expect(Array.from(indices)).toEqual(expectedOrder(keys));
  });
});
