import { afterEach, describe, expect, it } from 'vite-plus/test';
import type { NuiTableEdgeDirection, NuiTableNextEdge, TableCellPosition } from '../src';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { people, PEOPLE_COLUMNS, type Person } from './support/people';

const mounted: Array<{ unmount(): void }> = [];
const LAST_ROW = 999;
const LAST_COL = 17;

const mountPeople = (options: Partial<TableMountOptions<Person>> = {}): TableDriver<Person> => {
  const grid = TableDriver.mount<Person>({
    columns: PEOPLE_COLUMNS,
    rows: people(1000),
    config: { locale: 'ru-RU' },
    width: 900,
    ...options,
    props: { cellSelection: true, ...options.props },
  });

  mounted.push(grid);
  return grid;
};

afterEach(() => {
  for (const grid of mounted.splice(0)) {
    grid.unmount();
  }
});

describe('NuiTable edges', () => {
  it('jumps to the edges of the table with Ctrl and the arrows', async () => {
    const grid = mountPeople();
    await grid.settle();
    await grid.focusCell(3, 1);
    await grid.press('ArrowDown', { ctrl: true });

    expect(grid.focusedCell).toEqual({ row: LAST_ROW, col: 1 });

    await grid.press('ArrowRight', { ctrl: true });
    expect(grid.focusedCell).toEqual({ row: LAST_ROW, col: LAST_COL });

    await grid.press('ArrowUp', { ctrl: true });
    expect(grid.focusedCell).toEqual({ row: 0, col: LAST_COL });

    await grid.press('ArrowLeft', { ctrl: true });
    expect(grid.focusedCell).toEqual({ row: 0, col: 0 });

    await grid.focusCell(-1, 2);
    await grid.press('ArrowUp', { ctrl: true });
    expect(grid.focusedCell).toEqual({ row: -1, col: 2 });

    await grid.press('ArrowDown', { ctrl: true });
    expect(grid.focusedCell).toEqual({ row: LAST_ROW, col: 2 });

    await grid.scrollToRow(0);
    await grid.focusCell(2, 2);
    await grid.press('ArrowDown', { ctrl: true, shift: true });

    expect(grid.ranges).toEqual([{ from: { row: 2, col: 2 }, to: { row: LAST_ROW, col: 2 } }]);
  });

  it('asks nextEdge for the edge of the data in data positions and keeps the answer in bounds', async () => {
    const asked: Array<[TableCellPosition, NuiTableEdgeDirection]> = [];

    const nextEdge: NuiTableNextEdge = (from, direction) => {
      asked.push([from, direction]);
      return direction === 'down' ? { row: from.row + 10, col: from.col } : from;
    };

    const grid = mountPeople({ props: { selectable: 'multiple', nextEdge } });
    await grid.settle();
    await grid.focusCell(3, 2);
    await grid.press('ArrowDown', { ctrl: true });

    expect(asked).toEqual([[{ row: 3, col: 1 }, 'down']]);
    expect(grid.focusedCell).toEqual({ row: 13, col: 2 });

    await grid.press('ArrowDown', { ctrl: true, shift: true });

    expect(grid.ranges).toEqual([{ from: { row: 13, col: 1 }, to: { row: 23, col: 1 } }]);

    await grid.press('Escape');
    await grid.scrollToRow(995);
    await grid.focusCell(995, 2);
    await grid.press('ArrowDown', { ctrl: true });
    expect(grid.focusedCell).toEqual({ row: LAST_ROW, col: 2 });

    await grid.focusCell(LAST_ROW, 0);
    await grid.press('ArrowUp', { ctrl: true });
    expect(grid.focusedCell).toEqual({ row: 0, col: 0 });
    expect(asked).toHaveLength(3);
  });
});
