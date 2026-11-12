import { afterEach, describe, expect, it } from 'vite-plus/test';
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

const withSet = (key: string): Partial<TableMountOptions<Person>> => ({
  columns: PEOPLE_COLUMNS.map((column) =>
    column.key === key ? { ...column, filter: 'set' } : column,
  ),
});

const JANUARY_2020 = {
  kind: 'date',
  key: 'hired',
  from: Date.UTC(2020, 0, 1),
  to: Date.UTC(2020, 0, 31, 23, 59, 59, 999),
} as const;

afterEach(() => {
  for (const grid of mounted.splice(0)) {
    grid.unmount();
  }
});

describe('NuiTable filters', () => {
  it('filters a text column from the header popover, marks the column and announces the count', async () => {
    const grid = mountPeople();
    await grid.settle();
    expect(grid.filterActive(1)).toBe(false);

    await grid.openFilter(1);

    expect(grid.filterTitle).toBe('Фильтр: Имя');
    expect(grid.filterExpanded(1)).toBe(true);
    expect(grid.filterFocused).toBe(true);

    await grid.typeInFilter('Значение', '99');
    await grid.applyFilter();

    expect(grid.filters).toEqual([{ kind: 'text', key: 'name', op: 'contains', value: '99' }]);
    expect(grid.rowCount).toBe(20);
    expect(grid.cellText(0, 1)).toBe('Сотрудник 99');
    expect(grid.filterActive(1)).toBe(true);
    expect(grid.filterExpanded(1)).toBe(false);
    expect(grid.announcement).toBe('Показано 19 строк');
    expect(grid.focusedCell).toEqual({ row: -1, col: 1 });
  });

  it('keeps blanks out of a number range, restores the draft on reopen and resets it', async () => {
    const grid = mountPeople();
    await grid.openFilter(3);
    await grid.typeInFilter('От', '1000000');
    await grid.typeInFilter('До', '1012345');
    await grid.applyFilter();

    expect(grid.filters).toEqual([
      { kind: 'number', key: 'salary', min: 1_000_000, max: 1_012_345 },
    ]);

    expect(grid.rowCount).toBe(10);
    expect(grid.announcement).toBe('Показано 9 строк');

    await grid.openFilter(3);
    expect(grid.filterValue('От')).toBe('1\u00a0000\u00a0000');

    await grid.resetFilter();

    expect(grid.filters).toEqual([]);
    expect(grid.rowCount).toBe(1001);
    expect(grid.filterActive(3)).toBe(false);
    expect(grid.announcement).toBe('Показано 1 000 строк');
  });

  it('lists the distinct values of a column in their format and filters by the chosen ones with blanks', async () => {
    const grid = mountPeople({
      columns: PEOPLE_COLUMNS.map((column) =>
        column.type === 'boolean'
          ? { ...column, format: (value: boolean) => (value ? 'Удалённо' : 'В офисе') }
          : column,
      ),
    });

    await grid.openFilter(5);
    expect(grid.filterValueLabels).toEqual(['В офисе', 'Удалённо', '(пусто)']);
    expect(grid.filterSearchable).toBe(false);

    await grid.chooseValue('Удалённо');
    await grid.applyFilter();
    expect(grid.filters).toEqual([{ kind: 'set', key: 'remote', values: [true] }]);
    expect(grid.rowCount).toBe(335);
    expect(grid.cellText(1, 0)).toBe('3');

    await grid.openFilter(5);
    await grid.chooseValue('(пусто)');
    await grid.applyFilter();

    expect(grid.filters).toEqual([{ kind: 'set', key: 'remote', values: [true, null] }]);
    expect(grid.rowCount).toBe(668);
    expect(grid.announcement).toBe('Показано 667 строк');
  });

  it('keeps the rows of unlisted values when all listed values of a long column are chosen', async () => {
    const grid = mountPeople(withSet('name'));

    await grid.openFilter(1);

    expect(grid.filterValueLabels).toHaveLength(100);

    await grid.chooseAllValues();
    await grid.applyFilter();

    expect(grid.filters).toEqual([]);
    expect(grid.rowCount).toBe(1001);
    expect(grid.announcement).toBe(`Показано ${(1000).toLocaleString('ru-RU')} строк`);
  });

  it('hides only the unchecked value of a long column and shows the same choice when the filter opens again', async () => {
    const grid = mountPeople(withSet('name'));

    await grid.openFilter(1);
    await grid.chooseAllValues();
    await grid.chooseValue('Сотрудник 0');

    expect(grid.filterAllState).toBe('some');

    await grid.applyFilter();

    expect(grid.filters).toEqual([
      { kind: 'set', key: 'name', values: ['Сотрудник 0'], exclude: true },
    ]);

    expect(grid.rowCount).toBe(1000);

    await grid.openFilter(1);

    expect(grid.filterChosenLabels).toHaveLength(99);
    expect(grid.filterChosenLabels).not.toContain('Сотрудник 0');

    await grid.chooseValue('Сотрудник 0');

    expect(grid.filterAllState).toBe('all');

    await grid.applyFilter();

    expect(grid.filters).toEqual([]);
    expect(grid.rowCount).toBe(1001);
  });

  it('finds a value beyond the listed ones by search and keeps what was chosen before the search', async () => {
    const grid = mountPeople(withSet('name'));

    await grid.openFilter(1);

    expect(grid.filterSearchable).toBe(true);
    expect(grid.filterNote).toBe('Показаны только первые значения. Остальные найдёт поиск.');

    await grid.chooseValue('Сотрудник 0');
    await grid.searchFilterValues('НИК 99');

    expect(grid.filterValueLabels).toHaveLength(11);
    expect(grid.filterValueLabels).toContain('Сотрудник 995');
    expect(grid.filterNote).toBeUndefined();

    await grid.chooseValue('Сотрудник 995');
    await grid.searchFilterValues('');

    expect(grid.filterValueLabels).toHaveLength(100);
    expect(grid.filterChosenLabels).toEqual(['Сотрудник 0']);

    await grid.applyFilter();

    expect(grid.filters).toEqual([
      { kind: 'set', key: 'name', values: ['Сотрудник 0', 'Сотрудник 995'] },
    ]);

    expect(grid.rowCount).toBe(3);
  });

  it('chooses and drops only the found values when a search is on', async () => {
    const grid = mountPeople(withSet('name'));

    await grid.openFilter(1);
    await grid.searchFilterValues('ник 99');
    await grid.chooseAllValues();

    expect(grid.filterAllState).toBe('all');
    expect(grid.filterChosenLabels).toHaveLength(11);

    await grid.applyFilter();

    expect(grid.rowCount).toBe(12);

    await grid.openFilter(1);
    await grid.searchFilterValues('ник 990');

    expect(grid.filterValueLabels).toEqual(['Сотрудник 990']);
    expect(grid.filterAllState).toBe('all');

    await grid.chooseAllValues();

    expect(grid.filterAllState).toBe('none');

    await grid.applyFilter();

    expect(grid.rowCount).toBe(11);
  });

  it('says that nothing matches and finds the blank marker and formatted values by their labels', async () => {
    const grid = mountPeople(withSet('salary'));

    await grid.openFilter(3);

    expect(grid.filterValueLabels).toHaveLength(101);
    expect(grid.filterValueLabels.at(-1)).toBe('(пусто)');

    await grid.searchFilterValues('zzz');

    expect(grid.filterValueLabels).toEqual([]);
    expect(grid.filterNote).toBe('Совпадений нет');
    expect(grid.filterAllState).toBeUndefined();

    await grid.searchFilterValues('1\u00a0001\u00a0234');

    expect(grid.filterValueLabels).toEqual(['1\u00a0001\u00a0234,5']);

    await grid.searchFilterValues('ПУС');

    expect(grid.filterValueLabels).toEqual(['(пусто)']);

    await grid.chooseValue('(пусто)');
    await grid.applyFilter();

    expect(grid.filters).toEqual([{ kind: 'set', key: 'salary', values: [null] }]);
    expect(grid.rowCount).toBe(201);
  });

  it('honours the column filter option and opens the popover through the column menu from the keyboard', async () => {
    const grid = mountPeople({
      columns: PEOPLE_COLUMNS.map((column) => {
        switch (column.key) {
          case 'city':
            return { ...column, filter: 'set' };
          case 'salary':
            return { ...column, filter: false };
          default:
            return column;
        }
      }),
    });

    await grid.settle();
    expect(grid.filterButton(3)).toBeNull();

    await grid.focusCell(-1, 2);
    await grid.press('ArrowDown', { alt: true });
    expect(grid.focusedMenuItem).toBe('Сортировать по возрастанию');

    await grid.chooseMenu('Фильтр…');

    expect(grid.filterTitle).toBe('Фильтр: Город');
    expect(grid.filterFocused).toBe(true);

    await grid.dismissFilter();
    expect(grid.filterExpanded(2)).toBe(false);
    expect(grid.focusedCell).toEqual({ row: -1, col: 2 });

    await grid.openFilter(2);

    expect(grid.filterValueLabels).toEqual(['Ереван', 'Казань', 'Москва', '(пусто)']);

    await grid.chooseValue('Ереван');
    await grid.applyFilter();
    expect(grid.rowCount).toBe(251);

    await grid.focusCell(-1, 3);
    await grid.press('ArrowDown', { alt: true });
    expect(grid.filterExpanded(2)).toBe(false);
    expect(grid.menuExpanded(3)).toBe(true);
    expect(grid.menuLabels).not.toContain('Фильтр…');
    expect(grid.focusedMenuItem).toBe('Сортировать по возрастанию');
  });

  it('combines the quick filter with column filters from the model and reads dates by whole days', async () => {
    const grid = mountPeople({ filters: [JANUARY_2020] });
    await grid.settle();

    expect(grid.rowCount).toBe(73);
    expect(grid.filterActive(4)).toBe(true);

    await grid.setQuick('казань');
    expect(grid.rowCount).toBe(1);
    expect(grid.emptyText).toBe('Нет строк для показа');
    expect(grid.announcement).toBe('Показано 0 строк');

    await grid.openFilter(4);
    await grid.resetFilter();

    expect(grid.filters).toEqual([]);
    expect(grid.rowCount).toBe(251);
    expect(grid.cellText(0, 2)).toBe('Казань');
    expect(grid.announcement).toBe('Показано 250 строк');
  });

  it('announces the count in the grid language', async () => {
    const grid = mountPeople({ config: { locale: 'en-US' } });
    await grid.setQuick('заметка 12');

    expect(grid.rowCount).toBe(12);
    expect(grid.announcement).toBe('11 rows shown');
  });
});
