import { flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { RemoteStaff } from './support/remote';
import { staff, STAFF_COLUMNS, type Staff } from './support/staff';

const mounted: Array<{ unmount(): void }> = [];
const SIZABLE = { rowHeaders: { resizable: true }, getKey: (row: Staff) => row.id };

const mountStaff = (options: Partial<TableMountOptions<Staff>> = {}): TableDriver<Staff> => {
  const grid = TableDriver.mount<Staff>({
    columns: STAFF_COLUMNS,
    rows: staff(100),
    config: { locale: 'ru-RU' },
    width: 900,
    props: SIZABLE,
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

describe('NuiTable row resize', () => {
  it('sizes rows from the heights model by their keys and counts them in the scroll height', async () => {
    const grid = mountStaff({ rowHeights: { 2: 80, 97: 60 } });
    await grid.settle();

    expect(grid.rowHeight(2)).toBe('80px');
    expect(grid.rowBodySize(2)).toEqual(['79px', '']);
    expect(grid.rowHeight(1)).toBe('');
    expect(grid.canvasHeight).toBe(4060);
    await grid.setSort([{ key: 'id', direction: 'desc' }]);

    expect(grid.cellText(2, 1)).toBe('97');
    expect(grid.rowHeight(2)).toBe('60px');
    expect(grid.canvasHeight).toBe(4060);
    await grid.scrollToRow(97);
    expect(grid.cellText(97, 1)).toBe('2');
    expect(grid.rowHeight(97)).toBe('80px');
  });

  it('drags the bottom edge of a row header to resize the row and announces the height', async () => {
    const grid = mountStaff();
    await grid.settle();
    expect(grid.canvasHeight).toBe(4000);
    await grid.dragRowResizer(1, 24);

    expect(grid.rowHeights).toEqual({ 1: 64 });
    expect(grid.rowHeight(1)).toBe('64px');
    expect(grid.announcement).toBe('Высота строки 2: 64 px');
    expect(grid.ranges).toEqual([]);
    expect(grid.canvasHeight).toBe(4024);
    await grid.dragRowResizer(1, -200);

    expect(grid.rowHeights).toEqual({ 1: 20 });
    expect(grid.canvasHeight).toBe(3980);
    expect(grid.announcement).toBe('Высота строки 2: 20 px');
  });

  it('resizes a row from the keyboard on its header and resets it on a double click', async () => {
    const grid = mountStaff();
    await grid.settle();
    await grid.focusCell(3, 0);
    await grid.press('ArrowDown', { alt: true });
    await grid.press('ArrowDown', { alt: true });

    expect(grid.rowHeights).toEqual({ 3: 56 });
    expect(grid.announcement).toBe('Высота строки 4: 56 px');
    await grid.press('ArrowUp', { alt: true });
    expect(grid.rowHeights).toEqual({ 3: 48 });
    await grid.focusCell(3, 2);
    await grid.press('ArrowDown', { alt: true });
    expect(grid.rowHeights).toEqual({ 3: 48 });
    await grid.resetRowHeight(3);

    expect(grid.rowHeights).toEqual({});
    expect(grid.rowHeight(3)).toBe('');
    expect(grid.announcement).toBe('Высота строки 4 сброшена');
  });

  it('treats the height as a minimum when rows size themselves', async () => {
    const grid = mountStaff({ auto: true, rowHeights: { 2: 80 } });
    await grid.settle();

    expect(grid.rowHeight(2)).toBe('80px');
    expect(grid.rowBodySize(2)).toEqual(['', '79px']);
  });

  it('shows no resize handle without the option and ignores the model with a source', async () => {
    const plain = mountStaff({ props: { rowHeaders: true } });
    await plain.settle();
    expect(plain.rowResizer(1)).toBeNull();
    const remote = new RemoteStaff(40);

    const served = mountStaff({
      rows: [],
      props: { ...SIZABLE, source: remote.source },
      rowHeights: { 1: 80 },
    });

    await served.settle();
    remote.answer();
    await flushPromises();

    expect(served.cellText(1, 2)).toBe('Сотрудник 1');
    expect(served.rowHeight(1)).toBe('');
    expect(served.rowResizer(1)).toBeNull();
  });
});
