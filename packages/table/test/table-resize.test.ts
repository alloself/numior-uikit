import { afterEach, describe, expect, it } from 'vite-plus/test';
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
