import { afterEach, describe, expect, it } from 'vite-plus/test';
import type { NuiTableRange } from '../src';
import RangeMarks from './fixtures/RangeMarks.vue';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { staff, STAFF_COLUMNS, type Staff } from './support/staff';

const mounted: Array<{ unmount(): void }> = [];

const range = (top: number, start: number, bottom: number, end: number): NuiTableRange => ({
  from: { row: top, col: start },
  to: { row: bottom, col: end },
});

const mountStaff = (options: Partial<TableMountOptions<Staff>> = {}): TableDriver<Staff> => {
  const grid = TableDriver.mount<Staff>({
    columns: STAFF_COLUMNS,
    rows: staff(1000),
    config: { locale: 'ru-RU' },
    width: 900,
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

describe('NuiTable overlay', () => {
  it('lays the overlay over the cells it names and keeps it in canvas coordinates', async () => {
    const grid = mountStaff({ slots: { overlay: RangeMarks } });
    await grid.settle();

    expect(grid.overlayMarks).toEqual([
      { top: '80px', start: '80px', width: '300px', height: '80px' },
      { top: '240px', start: '0px', width: '600px', height: '40px' },
    ]);

    await grid.scroll({ top: 4000 });

    expect(grid.overlayMarks[0]).toEqual({
      top: '80px',
      start: '80px',
      width: '300px',
      height: '80px',
    });

    expect(grid.rectOf(range(0, 0, 0, 9))).toBeUndefined();
    expect(grid.rectOf(range(1000, 0, 1000, 0))).toBeUndefined();

    expect(grid.rectOf(range(999, 4, 999, 4))).toEqual({
      top: 40_000,
      start: 500,
      width: 100,
      height: 40,
    });
  });

  it('splits the overlay into panes over frozen rows and pinned columns', async () => {
    const grid = mountStaff({
      slots: { overlay: RangeMarks },
      pins: { id: 'start' },
      props: { frozenRows: 2 },
    });

    await grid.settle();

    expect(grid.paneMarks).toEqual([
      'body 80px 80px',
      'body 240px 0px',
      'start 240px 0px',
      'top 80px 80px',
    ]);

    await grid.receive({ frozenRows: 0 });

    expect(grid.paneMarks).toEqual(['body 80px 80px', 'body 240px 0px', 'start 240px 0px']);
  });

  it('follows the row heights model', async () => {
    const grid = mountStaff({ slots: { overlay: RangeMarks }, rowHeights: { 0: 60 } });
    await grid.settle();

    expect(grid.overlayMarks[0]).toEqual({
      top: '100px',
      start: '80px',
      width: '300px',
      height: '80px',
    });

    await grid.setRowHeights({ 0: 60, 2: 100 });

    expect(grid.overlayMarks[0]).toEqual({
      top: '100px',
      start: '80px',
      width: '300px',
      height: '140px',
    });
  });

  it('follows the row heights model in a table that grows with its rows', async () => {
    const grid = mountStaff({
      slots: { overlay: RangeMarks },
      rows: staff(20),
      rowHeights: { 0: 60 },
      auto: true,
    });

    await grid.settle();

    expect(grid.overlayMarks[0]).toEqual({
      top: '100px',
      start: '80px',
      width: '300px',
      height: '80px',
    });
  });

  it('reports the rendered window and finds the data cell under a point', async () => {
    const grid = mountStaff();
    await grid.settle();

    expect(grid.windows.at(-1)).toEqual({
      rows: { start: 0, end: 13 },
      cols: { start: 0, end: 5 },
    });

    await grid.scroll({ top: 4000 });

    expect(grid.windows.at(-1)).toEqual({
      rows: { start: 94, end: 113 },
      cols: { start: 0, end: 5 },
    });

    expect(grid.cellAtPoint(102, 2)).toEqual({ row: 102, col: 2 });
    expect(grid.cellAtPoint(-1, 2)).toBeUndefined();
  });

  it('finds the nearest body cell when a drag leaves the viewport and scrolls at its edge', async () => {
    const grid = mountStaff();
    await grid.settle();

    expect(grid.pointNear(-50, 5000)).toEqual({ x: 1, y: 299 });
    expect(grid.pointNear(5000, -50)).toEqual({ x: 899, y: 41 });

    expect(grid.followEdge(450, 295)).toEqual({ scrollTop: 8, steps: 1 });
    expect(grid.followEdge(450, 150)).toEqual({ scrollTop: 8, steps: 0 });
  });

  it('reports where the viewport is scrolled', async () => {
    const grid = mountStaff();

    await grid.settle();
    await grid.scroll({ top: 120, left: 30 });

    expect(grid.scrollPosition).toEqual({ top: 120, left: 30 });
  });

  it('moves the focus to a cell without scrolling to it on request', async () => {
    const grid = mountStaff();

    await grid.settle();
    await grid.focusCellAt({ row: 200, col: 0 }, false);

    expect([grid.activeCell, grid.scrollTop]).toEqual([{ row: 200, col: 0 }, 0]);

    await grid.focusCellAt({ row: 201, col: 0 }, true);

    expect(grid.scrollTop).toBeGreaterThan(0);
  });
});
