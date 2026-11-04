import { afterEach, describe, expect, it } from 'vite-plus/test';
import type { NuiTableColumn } from '../src';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { people, PEOPLE_COLUMNS, type Person } from './support/people';

const mounted: Array<{ unmount(): void }> = [];

const COLUMNS: readonly NuiTableColumn<Person>[] = PEOPLE_COLUMNS.map((column) =>
  column.key === 'id' ? { ...column, hideable: false } : column,
);

const mountPeople = (options: Partial<TableMountOptions<Person>> = {}): TableDriver<Person> => {
  const grid = TableDriver.mount<Person>({
    columns: COLUMNS,
    rows: people(1000),
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

describe('NuiTable column menu', () => {
  it('lists sorting, filter, grouping, pinning and visibility and sorts from the menu', async () => {
    const grid = mountPeople();
    await grid.settle();
    await grid.openColumnMenu(2);

    expect(grid.menuExpanded(2)).toBe(true);

    expect(grid.menuLabels).toEqual([
      'Сортировать по возрастанию',
      'Сортировать по убыванию',
      'Снять сортировку',
      'Фильтр…',
      'Группировать по колонке',
      'В начале',
      'Не закреплять',
      'В конце',
      'Скрыть колонку',
      'Колонки',
    ]);

    expect(grid.menuItemState('Снять сортировку')).toBe('true');
    expect(grid.menuItemState('Не закреплять')).toBe('true');

    await grid.chooseMenuAndSettle('Сортировать по убыванию');

    expect(grid.sort).toEqual([{ key: 'city', direction: 'desc' }]);
    expect(grid.menuExpanded(2)).toBe(false);
    expect(grid.announcement).toBe('Сортировка по колонке «Город» по убыванию');
  });

  it('pins and hides columns, keeps focus on the header and brings a column back from the list', async () => {
    const grid = mountPeople();
    await grid.focusCell(-1, 2);
    await grid.openColumnMenu(2);
    await grid.chooseMenu('В начале');

    expect(grid.headerTexts.slice(0, 3)).toEqual(['ID', 'Город', 'Имя']);
    expect(grid.pins).toEqual({ city: 'start' });
    expect(grid.focusedCell).toEqual({ row: -1, col: 1 });
    expect(grid.announcement).toBe('Колонка «Город» закреплена в начале');

    await grid.openColumnMenu(1);
    await grid.chooseMenu('Скрыть колонку');

    expect(grid.headerTexts.slice(0, 3)).toEqual(['ID', 'Имя', 'Оклад']);
    expect(grid.hidden).toEqual(['city']);
    expect(grid.focusedCell).toEqual({ row: -1, col: 1 });
    expect(grid.announcement).toBe('Колонка «Город» скрыта');

    await grid.openColumnMenu(1);
    await grid.chooseMenu('Колонки');

    expect(grid.menuItemState('Город')).toBe('false');
    expect(grid.menuItemState('ID')).toBe('true');

    await grid.chooseMenu('Город');
    expect(grid.headerTexts.slice(0, 3)).toEqual(['ID', 'Город', 'Имя']);
    expect(grid.announcement).toBe('Колонка «Город» показана');
    expect(grid.menuExpanded(2)).toBe(true);
    expect(grid.focusedCell).toBeUndefined();

    await grid.chooseMenu('Имя');

    expect(grid.headerTexts.slice(0, 3)).toEqual(['ID', 'Город', 'Оклад']);
    expect(grid.hidden).toEqual(['name']);
    expect(grid.menuExpanded(2)).toBe(false);
    expect(grid.focusedCell).toEqual({ row: -1, col: 2 });

    await grid.openColumnMenu(0);
    expect(grid.menuItemState('Скрыть колонку')).toBe('true');
  });

  it('leaves hidden columns out of the quick filter', async () => {
    const grid = mountPeople({ hidden: ['city'] });
    await grid.setQuick('казань');

    expect(grid.emptyText).toBe('Нет строк для показа');

    await grid.openColumnMenu(1);
    await grid.chooseMenu('Колонки');
    await grid.chooseMenuAndSettle('Город');

    expect(grid.hidden).toEqual([]);
    expect(grid.rowCount).toBe(251);
    expect(grid.cellText(0, 2)).toBe('Казань');
  });

  it('groups by a column from the menu and removes the grouping again', async () => {
    const grid = mountPeople();
    await grid.openColumnMenu(17);
    await grid.chooseMenuAndSettle('Группировать по колонке');

    expect(grid.role).toBe('treegrid');
    expect(grid.groupLabel(0)).toBe('Данные (333)');

    await grid.openColumnMenu(17);
    await grid.chooseMenuAndSettle('Убрать из группировки');
    expect(grid.role).toBe('grid');
  });

  it('puts entries of the app before its own and hands them the header cell', async () => {
    const anchors: string[] = [];

    const grid = mountPeople({
      props: {
        columnMenu: ({ column, anchor }) => {
          anchors.push(anchor.tagName);
          return [
            { key: 'rename', label: `Переименовать ${column.label}`, onSelect: () => undefined },
          ];
        },
      },
    });

    await grid.settle();
    await grid.openColumnMenu(1);

    expect(grid.menuLabels.slice(0, 2)).toEqual([
      'Переименовать Имя',
      'Сортировать по возрастанию',
    ]);

    expect(anchors.at(-1)).toBe('TH');
  });

  it('drops the menu buttons and keeps Alt+ArrowDown on the filter when the menu is off', async () => {
    const grid = mountPeople({ props: { columnMenu: false } });
    await grid.settle();

    expect(grid.menuLabels).toEqual([]);

    await grid.openColumnMenu(2);
    expect(grid.menuExpanded(2)).toBe(false);

    await grid.focusCell(-1, 1);
    await grid.press('ArrowDown', { alt: true });
    expect(grid.filterTitle).toBe('Фильтр: Имя');
  });
});
