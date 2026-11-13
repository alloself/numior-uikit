import { afterEach, describe, expect, it } from 'vite-plus/test';
import { TableDriver } from './drivers/table';
import { watchPointerListenerAdds, type ListenerAdds } from './support/listener-adds';
import { staff, STAFF_COLUMNS, type Staff } from './support/staff';

const mounted: TableDriver<Staff>[] = [];
const watched: ListenerAdds[] = [];

const mountStaff = (): TableDriver<Staff> => {
  const grid = TableDriver.mount<Staff>({
    columns: STAFF_COLUMNS,
    rows: staff(100),
    config: { locale: 'ru-RU' },
    width: 900,
    props: { rowHeaders: { resizable: true }, rowDrag: true, getKey: (row: Staff) => row.id },
  });

  mounted.push(grid);
  return grid;
};

afterEach(() => {
  for (const adds of watched.splice(0)) {
    adds.restore();
  }

  for (const grid of mounted.splice(0)) {
    grid.unmount();
  }
});

describe('NuiTable handles', () => {
  it('scrolls rows with their handles into view without adding pointer listeners', async () => {
    const grid = mountStaff();
    await grid.settle();
    const adds = watchPointerListenerAdds();
    watched.push(adds);

    await grid.scrollToRow(80);
    await grid.settle();

    expect(grid.renderedRows).toContain(80);
    expect(grid.rowResizer(80)).not.toBeNull();
    expect(grid.rowGrip(80)).not.toBeNull();
    expect(adds.types()).toEqual([]);
  });

  it('resizes a row that scrolled into view by its handle', async () => {
    const grid = mountStaff();
    await grid.settle();
    await grid.scrollToRow(80);
    await grid.settle();

    await grid.dragRowResizer(80, 24);

    expect(grid.rowHeights).toEqual({ 80: 64 });
  });
});
