import { afterEach, describe, expect, it } from 'vite-plus/test';
import type { NuiTableColumn } from '../src';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { people, PEOPLE_COLUMNS, type Person } from './support/people';

const mounted: TableDriver<Person>[] = [];

const mountPeople = (options: Partial<TableMountOptions<Person>> = {}): TableDriver<Person> => {
  const grid = TableDriver.mount<Person>({
    columns: PEOPLE_COLUMNS,
    rows: people(50),
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

describe('NuiTable column widths', () => {
  it('drags the header handle, writes the width to the model and sizes the track', async () => {
    const grid = mountPeople();
    await grid.settle();

    expect(grid.trackWidth(1)).toBe('160px');
    expect(grid.resizer(1)).not.toBeNull();

    await grid.dragResizer(1, 60);
    expect(grid.widths).toEqual({ name: 220 });
    expect(grid.trackWidth(1)).toBe('220px');
    expect(grid.announcement).toBe('Ширина колонки «Имя»: 220 px');

    await grid.dragResizer(1, -100);
    expect(grid.widths).toEqual({ name: 120 });
  });

  it('keeps the width between minWidth and maxWidth and leaves locked columns without a handle', async () => {
    const grid = mountPeople({
      columns: PEOPLE_COLUMNS.map((column) => {
        switch (column.key) {
          case 'name':
            return { ...column, minWidth: 100, maxWidth: 240 };
          case 'city':
            return { ...column, resizable: false };
          default:
            return column;
        }
      }),
    });

    await grid.settle();
    await grid.dragResizer(1, 500);
    expect(grid.widths).toEqual({ name: 240 });

    await grid.dragResizer(1, -500);
    expect(grid.widths).toEqual({ name: 100 });
    expect(grid.resizer(2)).toBeNull();

    await grid.focusCell(-1, 2);
    await grid.press('ArrowRight', { alt: true });
    expect(grid.widths).toEqual({ name: 100 });
  });

  it('resizes from the keyboard on the header cell and resets the width from the column menu', async () => {
    const grid = mountPeople();
    await grid.focusCell(-1, 1);
    await grid.press('ArrowRight', { alt: true });
    expect(grid.widths).toEqual({ name: 170 });
    expect(grid.announcement).toBe('Ширина колонки «Имя»: 170 px');

    await grid.press('ArrowLeft', { alt: true });
    expect(grid.widths).toEqual({ name: 160 });

    await grid.press('ArrowLeft', { alt: true, shift: true });
    expect(grid.widths).toEqual({ name: 160 });
    expect(grid.focusedCell).toEqual({ row: -1, col: 1 });

    await grid.openColumnMenu(1);
    expect(grid.menuLabels).toContain('Сбросить ширину');

    await grid.chooseMenu('Сбросить ширину');
    expect(grid.widths).toEqual({});
    expect(grid.trackWidth(1)).toBe('160px');
    expect(grid.announcement).toBe('Ширина колонки «Имя» сброшена');
  });

  it('reports a new width once the drag ends, on each keyboard step and when the width is reset', async () => {
    const grid = mountPeople();

    await grid.settle();
    await grid.dragResizer(1, 60);
    await grid.dragResizer(1, 0);
    await grid.focusCell(-1, 1);
    await grid.press('ArrowRight', { alt: true });
    await grid.openColumnMenu(1);
    await grid.chooseMenu('Сбросить ширину');

    expect(grid.resizes).toEqual([
      [{ key: 'name', width: 220 }],
      [{ key: 'name', width: 230 }],
      [{ key: 'name', width: undefined }],
    ]);
  });

  it('resets the width by a double click on the header handle', async () => {
    const grid = mountPeople();

    await grid.settle();
    await grid.dragResizer(1, 60);
    await grid.resetResizer(1);

    expect(grid.widths).toEqual({});
    expect(grid.trackWidth(1)).toBe('160px');
    expect(grid.announcement).toBe('Ширина колонки «Имя» сброшена');
  });

  it('leaves a double click on the header handle to its owner when the owner takes it', async () => {
    const grid = mountPeople({
      onColumnFit: (event) => {
        event.preventDefault();
      },
    });

    await grid.settle();
    await grid.dragResizer(1, 60);
    await grid.resetResizer(1);

    expect([grid.fits, grid.widths, grid.resizes.length]).toEqual([['name'], { name: 220 }, 1]);
    expect(grid.announcement).not.toContain('сброшена');
  });

  it('stops sharing the free width through flex once a column was resized by hand', async () => {
    const grid = mountPeople({
      columns: PEOPLE_COLUMNS.map((column) =>
        column.key === 'name' ? { ...column, flex: 1 } : column,
      ),
      widths: { name: 300 },
    });

    await grid.settle();
    expect(grid.trackWidth(1)).toBe('300px');
    expect(grid.menuLabels).toEqual([]);
  });
});

const TOOL_COLUMNS: readonly NuiTableColumn<Person>[] = [
  { key: 'name', label: 'Имя', type: 'text', width: 10, value: (row) => row.name },
  {
    key: 'city',
    label: 'Город',
    type: 'text',
    width: 10,
    reorderable: false,
    value: (row) => row.city,
  },
  {
    key: 'salary',
    label: 'Оклад',
    type: 'number',
    width: 10,
    sortable: false,
    value: (row) => row.salary,
  },
  {
    key: 'hired',
    label: 'Нанят',
    type: 'date',
    width: 10,
    reorderable: false,
    sortable: false,
    value: (row) => row.hired,
  },
  {
    key: 'remote',
    label: 'Удалённо',
    type: 'boolean',
    width: 10,
    reorderable: false,
    sortable: false,
    resizable: false,
    value: (row) => row.remote,
  },
  {
    key: 'note',
    label: 'Заметка',
    type: 'text',
    width: 10,
    reorderable: false,
    sortable: false,
    filter: false,
    value: (row) => row.note,
  },
];

const trackWidths = (grid: TableDriver<Person>): (string | undefined)[] =>
  TOOL_COLUMNS.map((_, col) => grid.trackWidth(col));

describe('NuiTable least column width', () => {
  it('keeps every column as wide as the tools its header shows', async () => {
    const grid = mountPeople({ columns: TOOL_COLUMNS, width: 2000 });

    await grid.settle();

    expect(trackWidths(grid)).toEqual(['97px', '77px', '69px', '49px', '44px', '49px']);
  });

  it('counts the filter button instead of the menu when the table has no column menu', async () => {
    const grid = mountPeople({
      columns: TOOL_COLUMNS,
      width: 2000,
      props: { columnMenu: false },
    });

    await grid.settle();

    expect(trackWidths(grid)).toEqual(['97px', '77px', '69px', '49px', '44px', '24px']);
  });

  it('stops the handle and the keys at the least width of the column', async () => {
    const grid = mountPeople({ columns: TOOL_COLUMNS, width: 2000, widths: { name: 200 } });

    await grid.settle();
    await grid.dragResizer(0, -500);
    expect(grid.widths).toEqual({ name: 97 });

    await grid.focusCell(-1, 0);
    await grid.press('ArrowLeft', { alt: true });
    expect(grid.widths).toEqual({ name: 97 });
    expect(grid.trackWidth(0)).toBe('97px');
  });

  it('widens a column while its header shows a filter', async () => {
    const grid = mountPeople({
      columns: TOOL_COLUMNS,
      width: 2000,
      filters: [{ kind: 'text', key: 'name', op: 'contains', value: '1' }],
    });

    await grid.settle();

    expect(grid.trackWidth(0)).toBe('125px');
  });

  it('widens the sorted columns while their headers show the place of a sort key', async () => {
    const grid = mountPeople({ columns: TOOL_COLUMNS, width: 2000 });

    await grid.settle();

    await grid.setSort([
      { key: 'name', direction: 'asc' },
      { key: 'city', direction: 'desc' },
    ]);

    expect([grid.trackWidth(0), grid.trackWidth(1)]).toEqual(['105px', '85px']);
  });

  it('widens a column while the filter it opened from the menu is open', async () => {
    const grid = mountPeople({ columns: TOOL_COLUMNS, width: 2000 });

    await grid.settle();
    await grid.startFilter(1);

    expect(grid.trackWidth(1)).toBe('105px');
  });
});
