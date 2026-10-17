import { describe, expect, it } from 'vite-plus/test';
import { draggedShare, pullOf } from '../src/blocks/image/image-size';

const side = { sign: 1, lift: 0, ratio: 2 };

const bottomCorner = { sign: 1, lift: 1, ratio: 2 };

describe('image size', () => {
  it('turns a side pull into width and ignores the vertical move', () => {
    expect(pullOf(side, 30, 200)).toBe(30);
    expect(pullOf({ ...side, sign: -1 }, 30, 0)).toBe(-30);
  });

  it('follows the axis a corner was pulled further along, keeping the proportions', () => {
    expect(pullOf(bottomCorner, 10, 40)).toBe(80);
    expect(pullOf(bottomCorner, 90, 40)).toBe(90);
    expect(pullOf({ ...bottomCorner, lift: -1 }, 0, 40)).toBe(-80);
  });

  it('keeps a dragged width within a fifth and the whole line, twice as fast when centred', () => {
    expect(draggedShare(300, 60, 600, false)).toBe(0.6);
    expect(draggedShare(300, 60, 600, true)).toBe(0.7);
    expect(draggedShare(300, -400, 600, false)).toBe(0.2);
    expect(draggedShare(300, 900, 600, false)).toBe(1);
  });
});
