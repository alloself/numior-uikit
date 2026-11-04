import { describe, expect, it } from 'vite-plus/test';
import { assignSlots } from '../src/virtual/slots';

describe('assignSlots', () => {
  it('gives fresh indices the lowest free slots and keeps the slots of indices that stay', () => {
    const first = assignSlots(new Map(), [10, 11, 12, 13]);

    expect([...first.entries()]).toEqual([
      [10, 0],
      [11, 1],
      [12, 2],
      [13, 3],
    ]);

    const moved = assignSlots(first, [12, 13, 14, 15]);
    expect(moved.get(12)).toBe(2);
    expect(moved.get(13)).toBe(3);
    expect(moved.get(14)).toBe(0);
    expect(moved.get(15)).toBe(1);

    const grown = assignSlots(moved, [11, 12, 13, 14, 15, 16]);
    expect([...grown.values()].toSorted((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(grown.get(14)).toBe(0);
    expect(grown.get(11)).toBe(4);
  });

  it('never hands one slot to two indices and never keeps a slot for an index that left', () => {
    let slots = assignSlots(new Map(), [0, 1, 2]);

    for (let start = 1; start < 50; start += 1) {
      slots = assignSlots(slots, [start, start + 1, start + 2, 500]);
      expect(new Set(slots.values()).size).toBe(4);
      expect(slots.has(start - 1)).toBe(false);
      expect(Math.max(...slots.values())).toBeLessThan(4);
    }

    expect(slots.get(500)).toBe(3);
  });
});
