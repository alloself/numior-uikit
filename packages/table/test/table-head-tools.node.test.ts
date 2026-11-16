import { describe, expect, it } from 'vite-plus/test';
import { headFrameOf, leastWidthOf, type HeadTools } from '../src/table/table-head-tools';

interface ToolCase {
  readonly name: string;
  readonly tools: Partial<HeadTools>;
  readonly least: number;
}

const NONE: HeadTools = {
  grip: false,
  sort: false,
  order: undefined,
  filter: false,
  menu: false,
  resizer: true,
  pin: undefined,
};

const MEDIUM = headFrameOf('md', false);

const CASES: readonly ToolCase[] = [
  { name: 'no tools', tools: {}, least: 24 },
  { name: 'grip', tools: { grip: true }, least: 44 },
  { name: 'sort', tools: { sort: true }, least: 52 },
  { name: 'filter', tools: { filter: true }, least: 49 },
  { name: 'menu', tools: { menu: true }, least: 49 },
  { name: 'grip and sort', tools: { grip: true, sort: true }, least: 72 },
  { name: 'grip and filter', tools: { grip: true, filter: true }, least: 69 },
  { name: 'grip and menu', tools: { grip: true, menu: true }, least: 69 },
  { name: 'sort and filter', tools: { sort: true, filter: true }, least: 77 },
  { name: 'sort and menu', tools: { sort: true, menu: true }, least: 77 },
  { name: 'filter and menu', tools: { filter: true, menu: true }, least: 77 },
  { name: 'grip, sort and filter', tools: { grip: true, sort: true, filter: true }, least: 97 },
  { name: 'grip, sort and menu', tools: { grip: true, sort: true, menu: true }, least: 97 },
  { name: 'grip, filter and menu', tools: { grip: true, filter: true, menu: true }, least: 97 },
  { name: 'sort, filter and menu', tools: { sort: true, filter: true, menu: true }, least: 105 },
  {
    name: 'every tool',
    tools: { grip: true, sort: true, filter: true, menu: true },
    least: 125,
  },
];

describe('leastWidthOf', () => {
  it.each(CASES)('fits a header with $name into $least px', ({ tools, least }) => {
    expect(leastWidthOf({ ...NONE, ...tools }, MEDIUM)).toBe(least);
  });

  it('drops the room of the width handle from a column that cannot be resized', () => {
    const tools = { ...NONE, grip: true, sort: true, menu: true };

    expect([
      leastWidthOf({ ...tools, resizer: false }, MEDIUM),
      leastWidthOf({ ...NONE, resizer: false }, MEDIUM),
    ]).toEqual([92, 24]);
  });

  it('adds the place of a sort key to the sort button and stops at its widest box', () => {
    const tools = { ...NONE, grip: true, sort: true, menu: true };

    expect([
      leastWidthOf({ ...tools, order: 2 }, MEDIUM),
      leastWidthOf({ ...tools, order: 12 }, MEDIUM),
      leastWidthOf({ ...tools, order: 1234 }, MEDIUM),
    ]).toEqual([105, 111, 121]);
  });

  it('follows the paddings of the table size and the lines of the grid', () => {
    const tools = { ...NONE, grip: true, sort: true, menu: true };

    expect([
      leastWidthOf(NONE, headFrameOf('sm', false)),
      leastWidthOf(NONE, headFrameOf('lg', false)),
      leastWidthOf(tools, headFrameOf('sm', true)),
      leastWidthOf(NONE, headFrameOf('md', true)),
    ]).toEqual([16, 32, 98, 25]);
  });

  it('adds the lines a pinned header cell draws at the edge of its pane', () => {
    const tools = { ...NONE, grip: true, sort: true, menu: true };

    expect([
      leastWidthOf({ ...tools, pin: 'start' }, MEDIUM),
      leastWidthOf({ ...tools, pin: 'end' }, MEDIUM),
      leastWidthOf({ ...tools, pin: 'start' }, headFrameOf('md', true)),
      leastWidthOf({ ...tools, pin: 'end' }, headFrameOf('md', true)),
    ]).toEqual([98, 98, 98, 99]);
  });

  it('keeps room for the width handle only beside the tool at its edge', () => {
    expect([
      leastWidthOf({ ...NONE, grip: true, sort: true }, MEDIUM),
      leastWidthOf({ ...NONE, sort: true, menu: true, pin: 'end' }, MEDIUM),
      leastWidthOf({ ...NONE, menu: true, pin: 'end' }, MEDIUM),
      leastWidthOf({ ...NONE, grip: true, pin: 'end' }, MEDIUM),
    ]).toEqual([72, 73, 45, 50]);
  });
});
