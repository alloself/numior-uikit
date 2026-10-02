import { describe, expect, it } from 'vitest';
import {
  floodOf,
  floodRow,
  type TableFloodCells,
  type TableFloodRow,
} from '../src/table/table-flood';
import { paintOf } from '../src/table/table-paint';
import type { NuiTableAlign, TableCellPaint, TablePaneName } from '../src/table/table.types';

interface Cell {
  readonly pane: TablePaneName | undefined;
  readonly width: number;
  readonly text: string;
}

const cell = (pane: TablePaneName | undefined, width: number, text = ''): Cell => ({
  pane,
  width,
  text,
});

const cellsOf = (row: readonly Cell[]): TableFloodCells => ({
  count: row.length,
  paneAt: (index) => row[index]?.pane,
  widthAt: (index) => row[index]?.width ?? 0,
  freeAt: (index) => row[index]?.text === '',
});

const ROW = [
  cell('start', 80, 'Итого'),
  cell('centre', 120, 'Длинная подпись'),
  cell('centre', 100),
  cell('centre', 90),
  cell('centre', 110, '42'),
  cell('centre', 70),
  cell(undefined, 60),
  cell('centre', 50),
  cell('end', 40),
];

const KEYS = 'abcdefghi';

const rowOf = (
  row: readonly Cell[],
  aligns: Readonly<Record<number, NuiTableAlign>> = {},
): TableFloodRow => ({
  ...cellsOf(row),
  keyAt: (index) => KEYS[index],
  alignAt: (index) => aligns[index] ?? 'start',
  flowsAt: (index) => (row[index]?.text ?? '') !== '',
});

const paintsOf = (keys: string): Map<string, TableCellPaint> =>
  new Map(
    [...keys].flatMap((key) => {
      const paint = paintOf({ overflow: true });

      return paint === undefined ? [] : [[key, paint]];
    }),
  );

const marksOf = (paint: TableCellPaint | undefined): unknown[] =>
  (paint?.class ?? []).filter((mark) => typeof mark === 'string');

describe('table text flood', () => {
  it('carries a start aligned text over the empty cells after it up to the first filled one', () => {
    expect(floodOf(cellsOf(ROW), 1, 'start')).toEqual({ first: 1, last: 3, width: 310 });
  });

  it('carries an end aligned text over the empty cells before it', () => {
    expect(floodOf(cellsOf(ROW), 4, 'end')).toEqual({ first: 2, last: 4, width: 300 });
  });

  it('stops at the edge of a pane, at a cell that is not a data cell and at the row end', () => {
    expect(floodOf(cellsOf(ROW), 0, 'start')).toBeUndefined();
    expect(floodOf(cellsOf(ROW), 4, 'start')).toEqual({ first: 4, last: 5, width: 180 });
    expect(floodOf(cellsOf(ROW), 7, 'start')).toBeUndefined();
    expect(floodOf(cellsOf(ROW), 8, 'start')).toBeUndefined();
    expect(floodOf(cellsOf(ROW), 1, 'end')).toBeUndefined();
  });

  it('leaves a centred text inside its cell', () => {
    expect(floodOf(cellsOf(ROW), 1, 'center')).toBeUndefined();
  });

  it('widens the text of an overflowing cell and removes the lines it crosses', () => {
    const painted = floodRow(paintsOf('b'), rowOf(ROW));

    expect(marksOf(painted.get('b'))).toEqual([
      'nui-table__cell--overflow',
      'nui-table__cell--seamless',
    ]);

    expect(painted.get('b')?.style).toEqual({ '--_over-w': '310px' });
    expect(marksOf(painted.get('c'))).toEqual(['nui-table__cell--seamless']);
    expect(painted.get('d')).toBeUndefined();
    expect(painted.get('e')).toBeUndefined();
  });

  it('gives the empty cells to the first text that reaches them', () => {
    const painted = floodRow(paintsOf('be'), rowOf(ROW, { 4: 'end' }));

    expect(painted.get('b')?.style).toEqual({ '--_over-w': '310px' });
    expect(marksOf(painted.get('e'))).toEqual([]);
    expect(painted.get('e')?.style).toEqual({});
  });

  it('keeps an empty or pinned cell and a cell without the option as they are', () => {
    const paints = paintsOf('ac');
    const painted = floodRow(paints, rowOf(ROW));

    expect(painted.get('a')).toBe(paints.get('a'));
    expect(painted.get('c')).toBe(paints.get('c'));
    expect(floodRow(new Map(), rowOf(ROW)).size).toBe(0);
  });
});
