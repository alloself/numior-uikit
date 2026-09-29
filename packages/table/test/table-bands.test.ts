import { afterEach, describe, expect, it } from 'vitest';
import type { NuiTableColumn, NuiTableColumnDef } from '../src';
import { TableDriver } from './drivers/table';
import { people, PEOPLE_COLUMNS, type Person } from './support/people';

const mounted: Array<{ unmount(): void }> = [];

const columnOf = (key: string): NuiTableColumn<Person> => {
  const column = PEOPLE_COLUMNS.find((candidate) => candidate.key === key);

  if (column === undefined) {
    throw new Error(`No people column ${key}`);
  }
  return column;
};

const GROUPED: readonly NuiTableColumnDef<Person>[] = [
  columnOf('id'),
  { key: 'person', label: 'Сотрудник', children: [columnOf('name'), columnOf('city')] },
  {
    key: 'work',
    label: 'Работа',
    children: [
      columnOf('salary'),
      columnOf('hired'),
      { key: 'mode', label: 'Формат', children: [columnOf('remote'), columnOf('note')] },
    ],
  },
  ...PEOPLE_COLUMNS.filter((column) => column.key.startsWith('m')),
  { key: 'org', label: 'Организация', children: [columnOf('team')] },
];

afterEach(() => {
  for (const grid of mounted.splice(0)) {
    grid.unmount();
  }
});

describe('NuiTable header groups', () => {
  it('stacks group bands over the column headers and offsets the data rows', async () => {
    const grid = TableDriver.mount<Person>({
      columns: GROUPED,
      rows: people(1000),
      config: { locale: 'ru-RU' },
      width: 2400,
    });

    mounted.push(grid);
    await grid.settle();

    expect(grid.bands).toEqual([
      ['Сотрудник:2+2', 'Работа:4+4', 'Организация:18+1'],
      ['Формат:6+2'],
    ]);

    expect(grid.bandSpans(0)).toEqual([1, 2, 4, 11, 1]);
    expect(grid.bandSpans(1)).toEqual([1, 4, 2, 11, 1]);

    expect(grid.headerTexts.slice(0, 8)).toEqual([
      'ID',
      'Имя',
      'Город',
      'Оклад',
      'Нанят',
      'Удалённо',
      'Заметка',
      'M1',
    ]);

    expect(grid.rowCount).toBe(1003);
    expect(grid.cellText(0, 1)).toBe('Сотрудник 0');
    await grid.clickBand('Работа');
    expect(grid.sort).toEqual([]);
    await grid.sortBy(3);
    expect(grid.sort).toEqual([{ key: 'salary', direction: 'asc' }]);
    await grid.focusCell(0, 2);
    expect(grid.focusedCell).toEqual({ row: 0, col: 2 });
    await grid.press('ArrowUp');
    expect(grid.focusedCell).toEqual({ row: -1, col: 2 });
    await grid.press('ArrowUp');
    expect(grid.focusedCell).toEqual({ row: -1, col: 2 });
  });

  it('splits a band at the pinned pane edge', async () => {
    const grid = TableDriver.mount<Person>({
      columns: [
        {
          key: 'all',
          label: 'Всё',
          children: [columnOf('id'), columnOf('name'), columnOf('team')],
        },
      ],
      rows: people(10),
      config: { locale: 'ru-RU' },
    });

    mounted.push(grid);
    await grid.settle();
    expect(grid.bands).toEqual([['Всё:1+1', 'Всё:2+1', 'Всё:3+1']]);
  });
});
