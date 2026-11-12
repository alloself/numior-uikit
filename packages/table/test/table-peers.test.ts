import { afterEach, describe, expect, it } from 'vite-plus/test';
import { computed } from 'vue';
import PeerFrames from './fixtures/PeerFrames.vue';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { staff, STAFF_COLUMNS, type Staff } from './support/staff';

const mounted: Array<{ unmount(): void }> = [];

const mountStaff = (options: Partial<TableMountOptions<Staff>> = {}): TableDriver<Staff> => {
  const grid = TableDriver.mount<Staff>({
    columns: STAFF_COLUMNS,
    rows: staff(20),
    config: { locale: 'ru-RU' },
    width: 900,
    props: { getKey: (row: Staff) => row.id },
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

describe('NuiTable cell keys', () => {
  it('names a cell by its row key and column and finds it again after the rows are sorted', async () => {
    const grid = mountStaff();
    await grid.settle();

    expect(grid.keyOf({ row: 2, col: 1 })).toEqual({ row: 2, column: 'name' });
    expect(grid.positionOf({ row: 2, column: 'name' })).toEqual({ row: 2, col: 1 });

    await grid.setSort([{ key: 'id', direction: 'desc' }]);

    expect(grid.positionOf({ row: 2, column: 'name' })).toEqual({ row: 17, col: 1 });
    expect(grid.keyOf({ row: 0, col: 0 })).toEqual({ row: 19, column: 'id' });
  });

  it('lets a view that follows a cell by its key see the cell move when the rows are sorted', async () => {
    const grid = mountStaff();
    await grid.settle();

    const place = computed(() => grid.positionOf({ row: 2, column: 'name' }));
    const key = computed(() => grid.keyOf({ row: 0, col: 0 }));
    const before = [place.value, key.value];

    await grid.setSort([{ key: 'id', direction: 'desc' }]);

    expect(before).toEqual([
      { row: 2, col: 1 },
      { row: 0, column: 'id' },
    ]);

    expect([place.value, key.value]).toEqual([
      { row: 17, col: 1 },
      { row: 19, column: 'id' },
    ]);
  });

  it('finds no cell for a row or a column the view does not show', async () => {
    const grid = mountStaff();
    await grid.settle();

    expect(grid.positionOf({ row: 999, column: 'name' })).toBeUndefined();
    expect(grid.positionOf({ row: 2, column: 'missing' })).toBeUndefined();
    expect(grid.keyOf({ row: 20, col: 0 })).toBeUndefined();
    expect(grid.keyOf({ row: 0, col: 99 })).toBeUndefined();
  });
});

describe('NuiTablePeers', () => {
  it('frames the cell of each person with their name and turns the flag down on the first row', async () => {
    const grid = mountStaff({ slots: { overlay: PeerFrames } });
    await grid.settle();

    const anna = grid.rectOf({ from: { row: 3, col: 1 }, to: { row: 3, col: 1 } });
    const boris = grid.rectOf({ from: { row: 0, col: 0 }, to: { row: 0, col: 0 } });

    expect(grid.peerFrames).toEqual([
      {
        name: 'Anna',
        tone: '3',
        below: false,
        top: `${String(anna?.top)}px`,
        start: `${String(anna?.start)}px`,
        areas: 0,
      },
      {
        name: 'Boris',
        tone: '2',
        below: true,
        top: `${String(boris?.top)}px`,
        start: `${String(boris?.start)}px`,
        areas: 1,
      },
    ]);
  });
});
