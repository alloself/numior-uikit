import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import type { NuiTableColumn } from '../src';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { people, PEOPLE_COLUMNS, type Person } from './support/people';

const mounted: Array<{ unmount(): void }> = [];

const mountPeople = (options: Partial<TableMountOptions<Person>> = {}): TableDriver<Person> => {
  const grid = TableDriver.mount<Person>({
    columns: PEOPLE_COLUMNS,
    rows: people(1000),
    config: { locale: 'ru-RU' },
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

const readsOnSort = async (afterPause: boolean): Promise<number> => {
  let reads = 0;

  const columns = PEOPLE_COLUMNS.map((column): NuiTableColumn<Person> =>
    column.key === 'city' && column.type === 'text'
      ? {
          ...column,
          value: (row) => {
            reads += 1;
            return row.city;
          },
        }
      : column,
  );

  const grid = mountPeople({ columns });

  if (afterPause) {
    await vi.waitFor(() => {
      expect(reads).toBeGreaterThanOrEqual(1000);
    });

    await grid.idle();
  }

  const before = reads;

  await grid.sortBy(2);
  return reads - before;
};

describe('NuiTable sorting', () => {
  it('cycles a header through ascending, descending and none, marks it and announces it', async () => {
    const grid = mountPeople();
    await grid.settle();
    expect(grid.sortable(3)).toBe(true);

    await grid.sortBy(3);

    expect(grid.sort).toEqual([{ key: 'salary', direction: 'asc' }]);
    expect(grid.ariaSort(3)).toBe('ascending');
    expect(grid.cellText(0, 0)).toBe('0');
    expect(grid.announcement).toBe('Сортировка по колонке «Оклад» по возрастанию');
    expect(grid.progressReports).toBeGreaterThan(0);

    await grid.sortBy(3);
    expect(grid.ariaSort(3)).toBe('descending');
    expect(grid.cellText(0, 0)).toBe('998');
    expect(grid.announcement).toBe('Сортировка по колонке «Оклад» по убыванию');

    await grid.sortBy(3);
    expect(grid.sort).toEqual([]);
    expect(grid.ariaSort(3)).toBeUndefined();
    expect(grid.cellText(0, 0)).toBe('0');
    expect(grid.announcement).toBe('Сортировка снята');
    expect(grid.settledRuns).toBe(3);
    expect(grid.busy).toBe(false);
  });

  it('adds keys with Shift, numbers them and keeps aria-sort on the first key', async () => {
    const grid = mountPeople();
    await grid.sortBy(2);
    await grid.sortBy(3, { shift: true });

    expect(grid.sort).toEqual([
      { key: 'city', direction: 'asc' },
      { key: 'salary', direction: 'asc' },
    ]);

    expect(grid.sortOrders).toEqual(['1', '2']);
    expect(grid.ariaSort(2)).toBe('ascending');
    expect(grid.ariaSort(3)).toBeUndefined();
    expect(grid.cellText(0, 0)).toBe('3');

    await grid.sortBy(3, { shift: true });
    expect(grid.cellText(0, 0)).toBe('995');

    await grid.sortBy(2, { shift: true });
    expect(grid.cellText(0, 0)).toBe('996');

    await grid.sortBy(1);
    expect(grid.sort).toEqual([{ key: 'name', direction: 'asc' }]);
    expect(grid.sortOrders).toEqual([]);
  });

  it('sorts from the keyboard on a header cell', async () => {
    const grid = mountPeople();
    await grid.focusCell(0, 3);
    await grid.press('ArrowUp');
    expect(grid.focusedCell).toEqual({ row: -1, col: 3 });

    await grid.pressAndSettle('Enter');
    expect(grid.sort).toEqual([{ key: 'salary', direction: 'asc' }]);

    await grid.pressAndSettle(' ');
    expect(grid.sort).toEqual([{ key: 'salary', direction: 'desc' }]);

    await grid.pressAndSettle('Enter', { shift: true });
    expect(grid.sort).toEqual([]);
    expect(grid.focusedCell).toEqual({ row: -1, col: 3 });
  });

  it('sorts at mount from the model, leaves unsortable columns still and follows outside changes', async () => {
    const columns = PEOPLE_COLUMNS.map((column) =>
      column.key === 'name' ? { ...column, sortable: false } : column,
    );

    const grid = mountPeople({ columns, sort: [{ key: 'salary', direction: 'desc' }] });
    await grid.settle();
    expect(grid.cellText(0, 0)).toBe('998');
    expect(grid.sortable(1)).toBe(false);

    await grid.clickHeader(1);
    expect(grid.sort).toEqual([{ key: 'salary', direction: 'desc' }]);

    await grid.setSort([{ key: 'id', direction: 'desc' }]);
    expect(grid.cellText(0, 0)).toBe('999');

    await grid.setSource(people(10));
    expect(grid.cellText(0, 0)).toBe('9');
    expect(grid.rowCount).toBe(11);
  });

  it('builds column keys after a pause so a later first sort does not read every row', async () => {
    expect(await readsOnSort(true)).toBeLessThan(1000);
    expect(await readsOnSort(false)).toBeGreaterThanOrEqual(1000);
  });

  it('holds the idle key building back while the user keeps typing', async () => {
    let reads = 0;

    const columns = PEOPLE_COLUMNS.map((column): NuiTableColumn<Person> =>
      column.key === 'city' && column.type === 'text'
        ? {
            ...column,
            value: (row) => {
              reads += 1;
              return row.city;
            },
          }
        : column,
    );

    const grid = mountPeople({ columns });

    for (let press = 0; press < 6; press += 1) {
      await grid.pressOnPage('Shift');
      await grid.idle();
    }

    expect(reads).toBeLessThan(1000);

    await vi.waitFor(() => {
      expect(reads).toBeGreaterThanOrEqual(1000);
    });
  });

  it('leaves columns that can neither be sorted nor filtered out of the idle key building', async () => {
    let reads = 0;

    const columns = PEOPLE_COLUMNS.map((column): NuiTableColumn<Person> =>
      column.key === 'city' && column.type === 'text'
        ? {
            ...column,
            sortable: false,
            filter: false,
            value: (row) => {
              reads += 1;
              return row.city;
            },
          }
        : column,
    );

    const grid = mountPeople({ columns });

    await grid.idle();
    await grid.idle();

    expect(reads).toBeLessThan(1000);
    expect(grid.sortable(2)).toBe(false);
  });
});
