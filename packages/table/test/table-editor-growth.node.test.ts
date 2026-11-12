import { describe, expect, it } from 'vite-plus/test';
import { grownSize, growthEdges } from '../src/table/table-editor-growth';

describe('table editor growth', () => {
  it('lists the column lines an editor can stop at, starting with its own cell', () => {
    expect(growthEdges(63, [64, 126, 64])).toEqual([63, 127, 253, 317]);
    expect(growthEdges(140, [])).toEqual([140]);
  });

  it('takes the first column line that holds the text', () => {
    const edges = growthEdges(63, [64, 126, 64]);

    expect(grownSize(edges, 70, 1000)).toBe(127);
    expect(grownSize(edges, 127, 1000)).toBe(127);
    expect(grownSize(edges, 128, 1000)).toBe(253);
  });

  it('keeps the width of the text itself past the last known column', () => {
    expect(grownSize(growthEdges(63, [64]), 400, 1000)).toBe(400);
  });

  it('stops at the room it is given and never shrinks below the cell', () => {
    const edges = growthEdges(63, [64, 126]);

    expect(grownSize(edges, 200, 180)).toBe(180);
    expect(grownSize(edges, 200, 40)).toBe(63);
  });
});
