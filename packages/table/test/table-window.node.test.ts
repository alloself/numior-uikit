import { describe, expect, it } from 'vitest';
import type { VirtualItem } from '@numior/primitives';
import { tableWindowFrame } from '../src/table/table-window';

const ROW = 40;

const itemsOf = (indices: readonly number[]): VirtualItem[] =>
  indices.map((index, slot) => ({
    index,
    slot,
    start: index * ROW,
    offset: index * ROW,
    size: ROW,
  }));

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from }, (_, offset) => from + offset);

describe('tableWindowFrame', () => {
  it('lays the window at its offset and lets it stick only past the rendered rows', () => {
    expect(
      tableWindowFrame({
        items: itemsOf(range(94, 113)),
        range: { start: 94, end: 113 },
        startSize: 94 * ROW,
        endSize: (1000 - 113) * ROW,
        viewport: 300,
        chrome: ROW,
      }),
    ).toEqual({ lead: 3760, rest: 35480, clampStart: -500, clampEnd: -500 });
  });

  it('keeps a held row above or below the window out of the viewport', () => {
    const above = tableWindowFrame({
      items: itemsOf([2, ...range(94, 113)]),
      range: { start: 94, end: 113 },
      startSize: 94 * ROW,
      endSize: (1000 - 113) * ROW,
      viewport: 300,
      chrome: ROW,
    });

    const below = tableWindowFrame({
      items: itemsOf([...range(94, 113), 700]),
      range: { start: 94, end: 113 },
      startSize: 94 * ROW,
      endSize: (1000 - 113) * ROW,
      viewport: 300,
      chrome: ROW,
    });

    expect(above).toEqual({ lead: 3720, rest: 35480, clampStart: -540, clampEnd: -500 });
    expect(below).toEqual({ lead: 3760, rest: 35440, clampStart: -500, clampEnd: -540 });
  });

  it('never pushes a table that fits its viewport', () => {
    expect(
      tableWindowFrame({
        items: itemsOf(range(0, 4)),
        range: { start: 0, end: 4 },
        startSize: 0,
        endSize: 0,
        viewport: 300,
        chrome: 2 * ROW,
      }),
    ).toEqual({ lead: 0, rest: 0, clampStart: 0, clampEnd: 0 });
  });
});
