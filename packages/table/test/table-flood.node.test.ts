import { describe, expect, it } from 'vite-plus/test';
import {
  spillsOf,
  type TableFloodLine,
  type TableFloodRun,
  type TableSpill,
} from '../src/table/table-flood';
import type { NuiTableAlign, TablePaneName } from '../src/table/table.types';

interface Cell {
  readonly pane: TablePaneName;
  readonly width: number;
  readonly text: string | undefined;
  readonly align: NuiTableAlign | undefined;
  readonly need: number;
}

const empty = (width: number, pane: TablePaneName = 'centre'): Cell => ({
  pane,
  width,
  text: '',
  align: undefined,
  need: 0,
});

const text = (
  width: number,
  need: number,
  align: NuiTableAlign = 'start',
  pane: TablePaneName = 'centre',
): Cell => ({ pane, width, text: 'текст', align, need });

const fixed = (width: number): Cell => ({
  pane: 'centre',
  width,
  text: '42',
  align: undefined,
  need: 0,
});

const merged = (width: number): Cell => ({
  pane: 'centre',
  width,
  text: undefined,
  align: undefined,
  need: 0,
});

const lineOf = (cells: readonly Cell[]): TableFloodLine => ({
  count: cells.length,
  paneAt: (col) => cells[col]?.pane,
  widthAt: (col) => cells[col]?.width ?? 0,
  textAt: (col) => cells[col]?.text,
  alignAt: (col) => cells[col]?.align,
  needAt: (col) => cells[col]?.need ?? 0,
});

const shown = (first: number, last: number, pane: TablePaneName = 'centre'): TableFloodRun => ({
  pane,
  first,
  last,
});

const spillsIn = (
  cells: readonly Cell[],
  runs: readonly TableFloodRun[] = [shown(0, cells.length - 1)],
): Record<number, TableSpill> => Object.fromEntries(spillsOf(lineOf(cells), runs));

describe('table text flood', () => {
  it('carries a start aligned text over the empty cells after it up to the first filled one', () => {
    expect(spillsIn([text(100, 400), empty(80), empty(90), fixed(60), empty(50)])).toEqual({
      0: { origin: 0, align: 'start', shift: 0, seam: true },
      1: { origin: 0, align: 'start', shift: -100, seam: true },
      2: { origin: 0, align: 'start', shift: -180, seam: false },
    });
  });

  it('carries an end aligned text over the empty cells before it', () => {
    expect(spillsIn([fixed(60), empty(80), empty(90), text(100, 250, 'end')])).toEqual({
      1: { origin: 3, align: 'end', shift: -190, seam: true },
      2: { origin: 3, align: 'end', shift: -100, seam: true },
      3: { origin: 3, align: 'end', shift: 0, seam: false },
    });
  });

  it('spreads a centred text to both sides around its own cell', () => {
    expect(
      spillsIn([empty(80), empty(80), text(100, 240, 'center'), empty(80), empty(80)]),
    ).toEqual({
      1: { origin: 2, align: 'center', shift: 180, seam: true },
      2: { origin: 2, align: 'center', shift: 0, seam: true },
      3: { origin: 2, align: 'center', shift: -180, seam: false },
    });
  });

  it('takes only as many empty cells as the text needs and none when it fits', () => {
    expect(Object.keys(spillsIn([text(100, 150), empty(80), empty(80)]))).toEqual(['0', '1']);
    expect(spillsIn([text(100, 100), empty(80)])).toEqual({});
  });

  it('stops at the edge of a pane, at a merged cell and at the row end', () => {
    const cells = [
      text(100, 900, 'start', 'start'),
      empty(80),
      text(100, 900),
      empty(80),
      merged(80),
      empty(80),
    ];

    expect(spillsIn(cells, [shown(0, 0, 'start'), shown(1, 5)])).toEqual({
      2: { origin: 2, align: 'start', shift: 0, seam: true },
      3: { origin: 2, align: 'start', shift: -100, seam: false },
    });

    expect(Object.keys(spillsIn([empty(80), text(100, 900)]))).toEqual([]);
  });

  it('gives the empty cells to the text on the left when two texts reach them', () => {
    const spills = spillsIn([text(100, 900), empty(80), empty(80), text(100, 900, 'end')]);

    expect(Object.values(spills).map((spill) => spill.origin)).toEqual([0, 0, 0]);
  });

  it('shows a text whose cell left the column window in the cells that are still shown', () => {
    const cells = [text(100, 400), empty(80), empty(80), empty(80), fixed(60)];

    expect(spillsIn(cells, [shown(2, 4)])[2]).toEqual({
      origin: 0,
      align: 'start',
      shift: -180,
      seam: true,
    });

    expect(spillsIn([empty(80), empty(80), text(100, 300, 'end')], [shown(0, 1)])[0]).toEqual({
      origin: 2,
      align: 'end',
      shift: -180,
      seam: true,
    });
  });

  it('does not look for a text past the flood reach and caps an unmeasured text there', () => {
    const wide = [text(100, 900), ...Array.from({ length: 6 }, () => empty(1000))];

    expect(spillsIn(wide, [shown(6, 6)])).toEqual({});

    expect(Object.keys(spillsIn([text(100, Number.POSITIVE_INFINITY), ...wide.slice(1)]))).toEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
    ]);
  });
});
