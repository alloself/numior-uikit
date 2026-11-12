import { shallowRef } from 'vue';

export type VirtualSize = readonly [index: number, size: number];

export interface SizeIndex {
  readonly count: number;
  readonly estimate: number;
  revision(): number;
  sizeAt(index: number): number;
  offsetAt(index: number): number;
  indexAt(position: number): number;
  total(): number;
  set(index: number, size: number): boolean;
  resize(count: number): void;
}

const lowestBit = (value: number): number => value & -value;

export const createSizeIndex = (
  count: number,
  estimate: number,
  known: Iterable<VirtualSize> = [],
): SizeIndex => {
  let length = Math.max(0, Math.floor(count));
  let sizes = new Float64Array(length).fill(estimate);
  let tree = new Float64Array(length + 1);
  const version = shallowRef(0);

  for (const [index, size] of known) {
    if (index < 0 || index >= length) {
      continue;
    }

    sizes[index] = size;
  }

  const rebuild = (): void => {
    tree = new Float64Array(length + 1);

    for (let index = 0; index < length; index += 1) {
      const node = index + 1;
      tree[node] = (tree[node] ?? 0) + (sizes[index] ?? 0);
      const parent = node + lowestBit(node);

      if (parent > length) {
        continue;
      }

      tree[parent] = (tree[parent] ?? 0) + (tree[node] ?? 0);
    }
  };

  const add = (index: number, delta: number): void => {
    for (let node = index + 1; node <= length; node += lowestBit(node)) {
      tree[node] = (tree[node] ?? 0) + delta;
    }
  };

  const prefix = (index: number): number => {
    let sum = 0;

    for (let node = index; node > 0; node -= lowestBit(node)) {
      sum += tree[node] ?? 0;
    }
    return sum;
  };

  const highestPower = (): number => {
    let power = 1;

    while (power * 2 <= length) {
      power *= 2;
    }
    return power;
  };

  rebuild();

  return {
    get count() {
      return length;
    },
    estimate,
    revision: () => version.value,
    sizeAt: (index) => sizes[index] ?? 0,
    offsetAt: (index) => prefix(Math.min(Math.max(0, index), length)),
    indexAt: (position) => {
      if (length === 0) {
        return 0;
      }
      let node = 0;
      let remaining = Math.max(0, position);

      for (let step = highestPower(); step > 0; step = Math.floor(step / 2)) {
        const candidate = node + step;

        if (candidate > length || (tree[candidate] ?? 0) > remaining) {
          continue;
        }

        node = candidate;
        remaining -= tree[candidate] ?? 0;
      }
      return Math.min(node, length - 1);
    },
    total: () => prefix(length),
    set: (index, size) => {
      if (index < 0 || index >= length) {
        return false;
      }
      const delta = size - (sizes[index] ?? 0);

      if (delta === 0) {
        return false;
      }
      sizes[index] = size;
      add(index, delta);
      version.value += 1;
      return true;
    },
    resize: (next) => {
      const target = Math.max(0, Math.floor(next));

      if (target === length) {
        return;
      }
      const kept = new Float64Array(target).fill(estimate);
      kept.set(sizes.subarray(0, Math.min(length, target)));
      sizes = kept;
      length = target;
      rebuild();
      version.value += 1;
    },
  };
};
