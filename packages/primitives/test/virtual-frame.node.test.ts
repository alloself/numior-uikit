import { describe, expect, it } from 'vitest';
import { virtualFrameOf, type VirtualFrameItem } from '../src/virtual/frame';

const ROW = 40;

const itemsOf = (indices: readonly number[]): VirtualFrameItem[] =>
  indices.map((index) => ({ index, size: ROW }));

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from }, (_, offset) => from + offset);

const WINDOW = {
  range: { start: 94, end: 113 },
  startSize: 94 * ROW,
  endSize: (1000 - 113) * ROW,
  viewport: 300,
  inset: ROW,
};

describe('virtualFrameOf', () => {
  it('lays the window at its offset and lets it stick only past the rendered rows', () => {
    expect(virtualFrameOf({ ...WINDOW, items: itemsOf(range(94, 113)) })).toEqual({
      lead: 3760,
      rest: 35480,
      clampStart: -500,
      clampEnd: -500,
    });
  });

  it('keeps a held row above or below the window out of the viewport', () => {
    const above = virtualFrameOf({ ...WINDOW, items: itemsOf([2, ...range(94, 113)]) });
    const below = virtualFrameOf({ ...WINDOW, items: itemsOf([...range(94, 113), 700]) });

    expect(above).toEqual({ lead: 3720, rest: 35480, clampStart: -540, clampEnd: -500 });
    expect(below).toEqual({ lead: 3760, rest: 35440, clampStart: -500, clampEnd: -540 });
  });

  it('lays the window under frozen rows and stops it at their lower edge', () => {
    const frozen = virtualFrameOf({
      ...WINDOW,
      frozen: 2,
      items: itemsOf([0, 1, ...range(94, 113)]),
    });

    expect(frozen).toEqual({ lead: 3680, rest: 35480, clampStart: -580, clampEnd: -580 });

    expect(
      virtualFrameOf({ ...WINDOW, frozen: 2, items: itemsOf([0, 1, 40, ...range(94, 113), 700]) }),
    ).toEqual({ lead: 3640, rest: 35440, clampStart: -620, clampEnd: -620 });
  });

  it('never pushes rows that fit their viewport', () => {
    expect(
      virtualFrameOf({
        items: itemsOf(range(0, 4)),
        range: { start: 0, end: 4 },
        startSize: 0,
        endSize: 0,
        viewport: 300,
        inset: 2 * ROW,
      }),
    ).toEqual({ lead: 0, rest: 0, clampStart: 0, clampEnd: 0 });
  });
});
