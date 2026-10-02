import { afterEach, describe, expect, it } from 'vitest';
import type { NuiTableColumn } from '../src';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { staff, STAFF_COLUMNS, type Staff } from './support/staff';

const mounted: Array<{ unmount(): void }> = [];

const UNSORTED: readonly NuiTableColumn<Staff>[] = STAFF_COLUMNS.map((column) =>
  column.key === 'id' ? column : { ...column, sortable: false },
);

const rowOf = (row: number): { from: object; to: object } => ({
  from: { row, col: 0 },
  to: { row, col: 4 },
});

const mountStaff = (options: Partial<TableMountOptions<Staff>> = {}): TableDriver<Staff> => {
  const grid = TableDriver.mount<Staff>({
    columns: UNSORTED,
    rows: staff(100),
    config: { locale: 'ru-RU' },
    width: 900,
    props: { rowHeaders: true },
    ...options,
  });

  mounted.push(grid);
  return grid;
};

afterEach(() => {
  for (const grid of mounted.splice(0)) {
    grid.unmount();
  }
});

describe('NuiTable row headers', () => {
  it('numbers the rows in a pinned header column whatever the order and the page', async () => {
    const grid = mountStaff({ props: { rowHeaders: true, pagination: { pageSizes: [20] } } });
    await grid.settle();

    expect(grid.colCount).toBe(6);
    expect(grid.headerTexts[0]).toBe('Номера строк');
    expect(grid.cellRole(0, 0)).toBe('rowheader');
    expect(grid.paneOf(0, 0)).toBe('start');
    expect(grid.cellText(0, 0)).toBe('1');
    expect(grid.cellText(5, 0)).toBe('6');
    await grid.setSort([{ key: 'id', direction: 'desc' }]);

    expect(grid.cellText(0, 1)).toBe('99');
    expect(grid.cellText(0, 0)).toBe('1');
    await grid.nextPage();
    expect(grid.cellText(0, 0)).toBe('21');
    expect(grid.cellText(0, 1)).toBe('79');
  });

  it('takes the label and the width of the row headers from the options', async () => {
    const grid = mountStaff({
      props: { rowHeaders: { label: (row, position) => `${position}:${row.id}`, width: 72 } },
      sort: [{ key: 'id', direction: 'desc' }],
    });

    await grid.settle();
    expect(grid.cellText(0, 0)).toBe('0:99');
    expect(grid.trackWidth(0)).toBe('72px');
    await grid.receive({ rowHeaders: true });
    expect(grid.cellText(0, 0)).toBe('1');
    expect(grid.trackWidth(0)).toBe('44px');
  });

  it('selects a whole row from its header and extends or adds rows with Shift and Ctrl', async () => {
    const grid = mountStaff();
    await grid.settle();
    await grid.clickCell(2, 0);

    expect(grid.ranges).toEqual([rowOf(2)]);
    expect(grid.focusedCell).toEqual({ row: 2, col: 1 });
    expect(grid.cellMarked(2, 0)).toBe(true);
    expect(grid.cellMarked(3, 0)).toBe(false);
    expect(grid.clicks).toEqual([]);
    await grid.clickCell(4, 0, { shift: true });

    expect(grid.ranges).toEqual([{ from: { row: 2, col: 0 }, to: { row: 4, col: 4 } }]);
    expect(grid.cellMarked(3, 0)).toBe(true);
    await grid.clickCell(7, 0, { ctrl: true });

    expect(grid.ranges).toEqual([{ from: { row: 2, col: 0 }, to: { row: 4, col: 4 } }, rowOf(7)]);
    expect(grid.announcement).toBe('Выделено строк: 1, колонок: 5');
    await grid.clickCell(3, 0, { ctrl: true });

    expect(grid.ranges).toEqual([rowOf(2), rowOf(4), rowOf(7)]);
    await grid.clickCell(5, 2);
    expect(grid.ranges).toEqual([]);
  });

  it('drags over the row headers and extends the rows from the keyboard without leaving the column', async () => {
    const grid = mountStaff();
    await grid.settle();
    await grid.focusCell(1, 3);
    await grid.dragRange({ row: 1, col: 0 }, { row: 3, col: 0 });

    expect(grid.ranges).toEqual([{ from: { row: 1, col: 0 }, to: { row: 3, col: 4 } }]);
    expect(grid.focusedCell).toEqual({ row: 1, col: 3 });
    await grid.press('ArrowDown', { shift: true });

    expect(grid.ranges).toEqual([{ from: { row: 1, col: 0 }, to: { row: 4, col: 4 } }]);
    expect(grid.scrollLeft).toBe(0);
  });

  it('selects a column from a header that does not sort and leaves sorting headers alone', async () => {
    const grid = mountStaff();
    await grid.settle();
    await grid.focusCell(5, 1);
    await grid.pressHeader(3);

    expect(grid.ranges).toEqual([{ from: { row: 0, col: 2 }, to: { row: 99, col: 2 } }]);
    expect(grid.focusedCell).toEqual({ row: 5, col: 3 });
    expect(grid.markedHeaders).toEqual([3]);
    expect(grid.scrollTop).toBe(0);
    await grid.pressHeader(5, { shift: true });

    expect(grid.ranges).toEqual([{ from: { row: 0, col: 2 }, to: { row: 99, col: 4 } }]);
    expect(grid.markedHeaders).toEqual([3, 4, 5]);
    await grid.press('ArrowLeft', { shift: true });

    expect(grid.ranges).toEqual([{ from: { row: 0, col: 2 }, to: { row: 99, col: 3 } }]);
    expect(grid.scrollTop).toBe(0);
    await grid.pressHeader(1);

    expect(grid.sort).toEqual([{ key: 'id', direction: 'asc' }]);
    expect(grid.ranges).toEqual([]);
  });

  it('drags over the headers to select several columns and takes everything from the corner', async () => {
    const grid = mountStaff();
    await grid.settle();
    await grid.dragHeaders(2, 4);

    expect(grid.ranges).toEqual([{ from: { row: 0, col: 1 }, to: { row: 99, col: 3 } }]);
    await grid.pressHeader(0);

    expect(grid.ranges).toEqual([{ from: { row: 0, col: 0 }, to: { row: 99, col: 4 } }]);
    expect(grid.announcement).toBe('Выделено строк: 100, колонок: 5');
    expect(grid.markedHeaders).toEqual([1, 2, 3, 4, 5]);
  });

  it('selects a row from the keyboard on its header and from a tap', async () => {
    const grid = mountStaff();
    await grid.settle();
    await grid.focusCell(3, 0);
    await grid.press(' ');

    expect(grid.ranges).toEqual([rowOf(3)]);
    expect(grid.focusedCell).toEqual({ row: 3, col: 0 });
    await grid.tapCell(6, 0);
    expect(grid.ranges).toEqual([rowOf(6)]);
    await grid.focusCell(-1, 4);
    await grid.press('Enter');
    expect(grid.ranges).toEqual([{ from: { row: 0, col: 3 }, to: { row: 99, col: 3 } }]);
  });

  it('scrolls a growing column selection along the columns only when the table has no window', async () => {
    const grid = mountStaff({ auto: true, width: 400 });
    await grid.settle();
    await grid.pressHeader(3);
    await grid.press('ArrowRight', { shift: true });

    expect(grid.ranges).toEqual([{ from: { row: 0, col: 2 }, to: { row: 99, col: 3 } }]);
    expect(grid.scrollLeft).toBe(144);
    expect(grid.scrollTop).toBe(0);
    await grid.press('ArrowRight', { shift: true });
    expect(grid.scrollLeft).toBe(244);
    await grid.press('ArrowLeft', { shift: true });
    await grid.press('ArrowLeft', { shift: true });

    expect(grid.ranges).toEqual([{ from: { row: 0, col: 2 }, to: { row: 99, col: 2 } }]);
    expect(grid.scrollLeft).toBe(240);
  });

  it('keeps headers out of the selection without row headers', async () => {
    const grid = mountStaff({ props: {} });
    await grid.settle();
    await grid.pressHeader(2);

    expect(grid.colCount).toBe(5);
    expect(grid.ranges).toEqual([]);
    expect(grid.markedHeaders).toEqual([]);
  });
});
