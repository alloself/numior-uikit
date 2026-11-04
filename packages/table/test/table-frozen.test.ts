import { afterEach, describe, expect, it } from 'vite-plus/test';
import type { NuiTableRange } from '../src';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { staff, STAFF_COLUMNS, type Staff } from './support/staff';

const mounted: Array<{ unmount(): void }> = [];

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from }, (_, offset) => from + offset);

const BLOCK: NuiTableRange = { from: { row: 1, col: 1 }, to: { row: 2, col: 2 } };

const mountStaff = (options: Partial<TableMountOptions<Staff>> = {}): TableDriver<Staff> => {
  const grid = TableDriver.mount<Staff>({
    columns: STAFF_COLUMNS,
    rows: staff(100),
    config: { locale: 'ru-RU' },
    width: 900,
    ...options,
    props: { frozenRows: 2, getKey: (row) => row.id, ...options.props },
  });

  mounted.push(grid);
  return grid;
};

afterEach(() => {
  for (const grid of mounted.splice(0)) {
    grid.unmount();
  }
});

describe('NuiTable frozen rows', () => {
  it('keeps the first rows under the header and windows the rest below them', async () => {
    const grid = mountStaff();
    await grid.settle();

    expect(grid.renderedRows).toEqual(range(0, 13));
    expect(grid.rowFrozen(0)).toBe('calc(var(--_head-size) + 0px)');
    expect(grid.rowFrozen(1)).toBe('calc(var(--_head-size) + 40px)');
    expect(grid.rowFrozen(2)).toBeUndefined();
    expect(grid.frozenSize).toBe('80px');

    await grid.scroll({ top: 2000 });

    expect(grid.renderedRows).toEqual([0, 1, ...range(46, 63)]);
    expect(grid.cellText(1, 1)).toBe('Сотрудник 1');

    expect(grid.windowFrame).toEqual({
      lead: '1760px',
      rest: '1480px',
      clampStart: '-540px',
      clampEnd: '-540px',
    });
  });

  it('reveals a row at the edge of the frozen ones and pages by the room below them', async () => {
    const grid = mountStaff();
    await grid.scroll({ top: 2000 });
    await grid.focusCell(1, 1);

    expect(grid.scrollTop).toBe(2000);

    await grid.press('ArrowDown');
    expect(grid.focusedCell).toEqual({ row: 2, col: 1 });
    expect(grid.scrollTop).toBe(0);

    await grid.press('PageDown');
    expect(grid.focusedCell).toEqual({ row: 6, col: 1 });
    expect(grid.scrollTop).toBe(60);

    await grid.scrollToRow(50);
    expect(grid.scrollTop).toBe(1920);

    await grid.press('Home', { ctrl: true });
    expect(grid.focusedCell).toEqual({ row: 0, col: 0 });
    expect(grid.scrollTop).toBe(1920);
  });

  it('follows the heights of frozen rows and splits a merge at their edge', async () => {
    const grid = mountStaff({ props: { merges: [BLOCK] }, rowHeights: { 0: 60 } });
    await grid.settle();

    expect(grid.rowFrozen(1)).toBe('calc(var(--_head-size) + 60px)');
    expect(grid.frozenSize).toBe('100px');
    expect(grid.cellSpan(1, 1)).toEqual([1, 2, 2]);
    expect(grid.mergeMarks(1, 1)).toEqual(['tall', 'cut-bottom']);
    expect(grid.cellSpan(2, 1)).toEqual([1, 2, 2]);
    expect(grid.mergeMarks(2, 1)).toEqual(['tall', 'cut-top']);
    expect(grid.cellText(2, 1)).toBe('Сотрудник 1');

    await grid.receive({ frozenRows: 0 });
    expect(grid.cellSpan(1, 1)).toEqual([2, 2, 2]);
    expect(grid.cell(2, 1)).toBeNull();
    expect(grid.frozenSize).toBe('0px');
  });

  it('freezes nothing without a row window, while rows load or under groups', async () => {
    const flow = mountStaff({ auto: true, rows: staff(8) });
    await flow.settle();

    expect(flow.rowFrozen(0)).toBeUndefined();
    expect(flow.frozenSize).toBe('0px');

    const grid = mountStaff({ props: { frozenRows: 200 } });
    await grid.settle();

    expect(grid.renderedRows).toEqual(range(0, 100));

    await grid.receive({ frozenRows: 1, loading: true });
    expect(grid.frozenSize).toBe('0px');

    await grid.receive({ frozenRows: 1, loading: false });
    expect(grid.rowFrozen(0)).toBe('calc(var(--_head-size) + 0px)');

    await grid.setGroupBy(['city']);
    expect(grid.rowFrozen(0)).toBeUndefined();
    expect(grid.frozenSize).toBe('0px');
  });
});
