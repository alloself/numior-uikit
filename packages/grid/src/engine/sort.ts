import { CHECK_INTERVAL, type SliceJob } from './slicer';

export type IndexCompare = (a: number, b: number) => number;

const passesFor = (length: number): number => {
  let passes = 0;

  for (let width = 1; width < length; width *= 2) {
    passes += 1;
  }
  return passes;
};

export const identityIndices = (length: number): Uint32Array => {
  const indices = new Uint32Array(length);

  for (let index = 0; index < length; index += 1) {
    indices[index] = index;
  }
  return indices;
};

export const createSortJob = (indices: Uint32Array, compare: IndexCompare): SliceJob => {
  const length = indices.length;
  const total = Math.max(1, passesFor(length) * length);
  let source: Uint32Array = indices;
  let target: Uint32Array = new Uint32Array(length);
  let width = 1;
  let start = 0;
  let left = 0;
  let right = 0;
  let out = 0;
  let inRun = false;
  let merged = 0;
  let finished = length <= 1;

  const passPending = (): boolean => start < length;

  const finish = (): void => {
    if (source !== indices) {
      indices.set(source);
    }
    finished = true;
  };

  const mergeRun = (deadline: number): boolean => {
    const middle = Math.min(start + width, length);
    const end = Math.min(start + 2 * width, length);

    if (!inRun) {
      left = start;
      right = middle;
      out = start;
      inRun = true;
    }

    while (out < end) {
      const takeLeft =
        left < middle && (right >= end || compare(source[left] ?? 0, source[right] ?? 0) <= 0);

      if (takeLeft) {
        target[out] = source[left] ?? 0;
        left += 1;
      } else {
        target[out] = source[right] ?? 0;
        right += 1;
      }
      out += 1;
      merged += 1;

      if (merged % CHECK_INTERVAL === 0 && performance.now() >= deadline) {
        return false;
      }
    }
    start = end;
    inRun = false;
    return true;
  };

  return {
    total: () => total,
    done: () => Math.min(merged, total),
    work: (deadline) => {
      if (finished) {
        return true;
      }
      while (width < length) {
        while (passPending()) {
          if (!mergeRun(deadline)) {
            return false;
          }
        }
        const swap = source;
        source = target;
        target = swap;
        width *= 2;
        start = 0;
      }
      finish();
      return true;
    },
  };
};
