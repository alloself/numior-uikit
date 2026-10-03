import { afterEach, describe, expect, it } from 'vitest';
import { h, type VNode } from 'vue';
import type { NuiTableOverlaySlot, NuiTableRange } from '../src';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { staff, STAFF_COLUMNS, type Staff } from './support/staff';

const mounted: Array<{ unmount(): void }> = [];

const range = (top: number, start: number, bottom: number, end: number): NuiTableRange => ({
  from: { row: top, col: start },
  to: { row: bottom, col: end },
});

const MARKED: readonly NuiTableRange[] = [range(1, 1, 2, 2), range(5, 0, 5, 4)];

const marks = ({ rectOf }: NuiTableOverlaySlot): VNode[] =>
  MARKED.flatMap((marked, index) => {
    const rect = rectOf(marked);

    return rect === undefined
      ? []
      : [
          h('div', {
            key: index,
            style: {
              insetBlockStart: `${rect.top}px`,
              insetInlineStart: `${rect.start}px`,
              inlineSize: `${rect.width}px`,
              blockSize: `${rect.height}px`,
            },
          }),
        ];
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
    const grid = mountStaff({ slots: { overlay: marks } });
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

  it('follows the row heights model', async () => {
    const grid = mountStaff({ slots: { overlay: marks }, rowHeights: { 0: 60 } });
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
});
