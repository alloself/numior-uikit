import { describe, expect, it } from 'vitest';
import { createSizeIndex } from '../src';

const seeded = (seed: number): (() => number) => {
  let state = seed;

  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
};

describe('createSizeIndex', () => {
  it('answers offsets, sizes, totals and positions like a plain prefix sum after random updates', () => {
    const random = seeded(7);
    const count = 257;
    const index = createSizeIndex(count, 24);
    const sizes = Array.from({ length: count }, () => 24);

    for (let round = 0; round < 400; round += 1) {
      const at = Math.floor(random() * count);
      const size = 10 + Math.floor(random() * 90);
      sizes[at] = size;
      index.set(at, size);
    }
    const offsets = [0];

    for (const size of sizes) {
      offsets.push((offsets.at(-1) ?? 0) + size);
    }
    expect(index.total()).toBe(offsets[count]);

    for (let at = 0; at <= count; at += 1) {
      expect(index.offsetAt(at)).toBe(offsets[at]);
    }
    for (let probe = 0; probe < 300; probe += 1) {
      const position = Math.floor(random() * (index.total() + 50));

      const expected = Math.min(
        count - 1,
        offsets.findLastIndex((offset) => offset <= position),
      );

      expect(index.indexAt(position)).toBe(expected);
    }
    expect(index.indexAt(-5)).toBe(0);
    expect(index.sizeAt(3)).toBe(sizes[3]);
    expect(index.revision()).toBeGreaterThan(0);
  });

  it('grows and shrinks while keeping measured sizes and handles an empty index', () => {
    const index = createSizeIndex(3, 10);
    index.set(2, 30);
    index.resize(5);
    expect(index.count).toBe(5);
    expect(index.total()).toBe(70);
    expect(index.sizeAt(2)).toBe(30);
    expect(index.sizeAt(4)).toBe(10);
    index.resize(2);
    expect(index.total()).toBe(20);
    expect(index.offsetAt(9)).toBe(20);
    const empty = createSizeIndex(0, 10);
    expect(empty.total()).toBe(0);
    expect(empty.indexAt(100)).toBe(0);
    expect(empty.set(0, 5)).toBe(false);
  });
});
