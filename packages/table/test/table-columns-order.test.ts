import { afterEach, describe, expect, it } from 'vite-plus/test';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { people, PEOPLE_COLUMNS, type Person } from './support/people';

const mounted: TableDriver<Person>[] = [];

const mountPeople = (options: Partial<TableMountOptions<Person>> = {}): TableDriver<Person> => {
  const grid = TableDriver.mount<Person>({
    columns: PEOPLE_COLUMNS,
    rows: people(50),
    config: { locale: 'ru-RU' },
    width: 4000,
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

describe('NuiTable column order', () => {
  it('drags a header grip past a neighbour and keeps the key order in the model', async () => {
    const grid = mountPeople();
    await grid.settle();
    grid.layoutHeaders();

    expect(grid.headerTexts.slice(0, 4)).toEqual(['ID', 'Имя', 'Город', 'Оклад']);
    expect(grid.grip(1)).not.toBeNull();

    await grid.dragHeader(1, 2, 'after');
    expect(grid.columnOrder.slice(0, 4)).toEqual(['id', 'city', 'name', 'salary']);
    expect(grid.columnOrder).toHaveLength(18);
    expect(grid.headerTexts.slice(0, 4)).toEqual(['ID', 'Город', 'Имя', 'Оклад']);
    expect(grid.cellText(0, 1)).toBe('Москва');
    expect(grid.announcement).toBe('Колонка «Имя» перемещена на место 3 из 18');

    grid.layoutHeaders();
    await grid.dragHeader(2, 1, 'before');
    expect(grid.columnOrder.slice(0, 3)).toEqual(['id', 'name', 'city']);
  });

  it('moves a column with Alt+Shift and the arrow keys, follows it with the focus and stays inside the pane', async () => {
    const grid = mountPeople();
    await grid.focusCell(-1, 1);
    await grid.press('ArrowRight', { alt: true, shift: true });
    expect(grid.columnOrder.slice(0, 3)).toEqual(['id', 'city', 'name']);
    expect(grid.focusedCell).toEqual({ row: -1, col: 2 });

    await grid.press('ArrowLeft', { alt: true, shift: true });
    expect(grid.columnOrder.slice(0, 3)).toEqual(['id', 'name', 'city']);
    expect(grid.focusedCell).toEqual({ row: -1, col: 1 });

    await grid.press('ArrowLeft', { alt: true, shift: true });
    expect(grid.columnOrder.slice(0, 3)).toEqual(['id', 'name', 'city']);
    expect(grid.focusedCell).toEqual({ row: -1, col: 1 });
  });

  it('leaves locked columns and pinned panes alone', async () => {
    const grid = mountPeople({
      columns: PEOPLE_COLUMNS.map((column) =>
        column.key === 'city' ? { ...column, reorderable: false } : column,
      ),
    });

    await grid.settle();
    grid.layoutHeaders();
    expect(grid.grip(2)).toBeNull();

    await grid.focusCell(-1, 2);
    await grid.press('ArrowRight', { alt: true, shift: true });
    expect(grid.columnOrder).toEqual([]);

    await grid.dragHeader(1, 0, 'before');
    expect(grid.columnOrder).toEqual([]);
    expect(grid.headerTexts.slice(0, 3)).toEqual(['ID', 'Имя', 'Город']);
  });

  it('mirrors the keys in RTL', async () => {
    const grid = mountPeople({ dir: 'rtl' });
    await grid.focusCell(-1, 1);
    await grid.press('ArrowLeft', { alt: true, shift: true });
    expect(grid.columnOrder.slice(0, 3)).toEqual(['id', 'city', 'name']);
  });
});
