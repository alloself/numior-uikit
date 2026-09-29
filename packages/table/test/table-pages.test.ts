import { afterEach, describe, expect, it } from 'vitest';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { people, PEOPLE_COLUMNS, type Person } from './support/people';

const mounted: Array<{ unmount(): void }> = [];

const mountPeople = (options: Partial<TableMountOptions<Person>> = {}): TableDriver<Person> => {
  const grid = TableDriver.mount<Person>({
    columns: PEOPLE_COLUMNS,
    rows: people(45),
    config: { locale: 'ru-RU' },
    width: 2400,
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

describe('NuiTable pages', () => {
  it('pages the visible rows, clamps the page and keeps selection and keys inside the page', async () => {
    const grid = mountPeople({
      auto: true,
      props: { pagination: { pageSizes: [10, 20], showRange: true }, selectable: 'multiple' },
    });

    await grid.settle();
    expect(grid.paginated).toBe(true);
    expect(grid.rowCount).toBe(21);
    expect(grid.renderedRows).toHaveLength(20);
    expect(grid.cellText(0, 2)).toBe('Сотрудник 0');
    expect(grid.rangeText).toContain('45');
    await grid.nextPage();

    expect(grid.page).toBe(2);
    expect(grid.cellText(0, 2)).toBe('Сотрудник 20');
    await grid.checkAll();
    expect(grid.selected).toHaveLength(20);
    expect(grid.selected.map((row) => row.id)).toContain(20);
    await grid.nextPage();

    expect(grid.page).toBe(3);
    expect(grid.rowCount).toBe(6);
    expect(grid.headerCheckbox?.checked).toBe(false);
    await grid.focusCell(0, 2);
    await grid.press('End', { ctrl: true });
    expect(grid.focusedCell).toEqual({ row: 4, col: 18 });
    await grid.choosePageSize(10);

    expect(grid.pageSize).toBe(10);
    expect(grid.page).toBe(3);
    expect(grid.cellText(0, 2)).toBe('Сотрудник 20');
    await grid.setQuick('Сотрудник 4');

    expect(grid.page).toBe(1);
    expect(grid.rowCount).toBe(7);
    expect(grid.cellText(0, 2)).toBe('Сотрудник 4');
    expect(grid.cellText(5, 2)).toBe('Сотрудник 44');
  });

  it('renders the rows as one page in remote mode and hands the total to the pagination', async () => {
    const grid = mountPeople({
      rows: people(20),
      props: { pagination: { showRange: true }, remote: true, total: 500 },
    });

    await grid.settle();
    expect(grid.rowCount).toBe(21);
    expect(grid.rangeText).toContain('500');
    await grid.nextPage();

    expect(grid.page).toBe(2);
    expect(grid.cellText(0, 1)).toBe('Сотрудник 0');
    await grid.sortBy(3);

    expect(grid.sort).toEqual([{ key: 'salary', direction: 'asc' }]);
    expect(grid.cellText(0, 1)).toBe('Сотрудник 0');
    await grid.setQuick('нет такого');
    expect(grid.rowCount).toBe(21);
  });

  it('pages the flat list of group rows and their expanded children', async () => {
    const grid = mountPeople({
      rows: people(1000),
      groupBy: ['team'],
      expanded: ['["Данные"]'],
      props: { pagination: true },
    });

    await grid.settle();
    expect(grid.role).toBe('treegrid');
    expect(grid.rowCount).toBe(21);
    expect(grid.groupLabel(0)).toBe('Данные (333)');
    await grid.nextPage();

    expect(grid.groupLabel(0)).toBeUndefined();
    expect(grid.cellText(0, 1)).toMatch(/^Сотрудник \d+$/);
    await grid.setGroupBy([]);

    expect(grid.role).toBe('grid');
    expect(grid.page).toBe(2);
    expect(grid.cellText(0, 1)).toBe('Сотрудник 20');
  });
});
