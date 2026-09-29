import { afterEach, describe, expect, it } from 'vitest';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { people, PEOPLE_COLUMNS, type Person } from './support/people';

const mounted: Array<{ unmount(): void }> = [];
const PINNED = people(902).slice(900);

const mountPeople = (options: Partial<TableMountOptions<Person>> = {}): TableDriver<Person> => {
  const grid = TableDriver.mount<Person>({
    columns: PEOPLE_COLUMNS,
    rows: people(100),
    config: { locale: 'ru-RU' },
    width: 2400,
    props: { pinnedRows: PINNED },
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

describe('NuiTable pinned rows', () => {
  it('keeps pinned rows under the header outside sorting, filters and pages', async () => {
    const grid = mountPeople({ props: { pinnedRows: PINNED, pagination: { pageSizes: [20] } } });
    await grid.settle();

    expect(grid.rowCount).toBe(23);
    expect(grid.rowPinned(0)).toBe(true);
    expect(grid.rowPinned(2)).toBe(false);
    expect(grid.cellText(0, 1)).toBe('Сотрудник 900');
    expect(grid.cellText(1, 1)).toBe('Сотрудник 901');
    expect(grid.cellText(2, 1)).toBe('Сотрудник 0');
    await grid.setSort([{ key: 'id', direction: 'desc' }]);

    expect(grid.cellText(0, 1)).toBe('Сотрудник 900');
    expect(grid.cellText(2, 1)).toBe('Сотрудник 99');
    await grid.setQuick('Сотрудник 4');
    expect(grid.rowCount).toBe(14);
    expect(grid.cellText(1, 1)).toBe('Сотрудник 901');
    await grid.setQuick('');
    await grid.nextPage();

    expect(grid.page).toBe(2);
    expect(grid.cellText(0, 1)).toBe('Сотрудник 900');
    expect(grid.cellText(2, 1)).toBe('Сотрудник 79');
  });

  it('walks from the header through the pinned rows into the body and selects pinned rows', async () => {
    const grid = mountPeople({ props: { pinnedRows: PINNED, selectable: 'multiple' } });
    await grid.settle();
    await grid.focusCell(-1, 2);
    await grid.press('ArrowDown');

    expect(grid.focusedCell).toEqual({ row: 0, col: 2 });
    await grid.press('ArrowDown');
    await grid.press('ArrowDown');
    expect(grid.focusedCell).toEqual({ row: 2, col: 2 });
    expect(grid.cellText(2, 2)).toBe('Сотрудник 0');
    await grid.press('End', { ctrl: true });
    expect(grid.focusedCell).toEqual({ row: 101, col: 18 });
    await grid.press('Home', { ctrl: true });
    expect(grid.focusedCell).toEqual({ row: 0, col: 0 });
    await grid.focusCell(1, 3);
    await grid.press(' ');

    expect(grid.selected.map((row) => row.id)).toEqual([901]);
    expect(grid.rowSelected(1)).toBe(true);
    await grid.checkAll();
    expect(grid.selected).toHaveLength(101);
    expect(grid.headerCheckbox?.checked).toBe(true);
    await grid.checkRow(0);
    expect(grid.selected).toHaveLength(102);
    await grid.clickRow(0, 2);
    expect(grid.clicks.map((row) => row.id)).toEqual([900]);
  });
});
