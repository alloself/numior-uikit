import { afterEach, describe, expect, it } from 'vite-plus/test';
import { required } from '@numior/forms';
import type { NuiTableColumn } from '../src';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { applyStaffEdits, staff, STAFF_COLUMNS, type Staff } from './support/staff';

const mounted: TableDriver<Staff>[] = [];

const mountStaff = (options: Partial<TableMountOptions<Staff>> = {}): TableDriver<Staff> => {
  const grid = TableDriver.mount<Staff>({
    columns: STAFF_COLUMNS,
    rows: staff(20),
    config: { locale: 'ru-RU' },
    width: 1200,
    onEdit: (event) => {
      applyStaffEdits(event.changes);
    },
    ...options,
  });

  mounted.push(grid);
  return grid;
};

const withRequiredCity: readonly NuiTableColumn<Staff>[] = STAFF_COLUMNS.map((column) =>
  column.key === 'city' && column.type === 'text' ? { ...column, rules: [required()] } : column,
);

const HIRED: NuiTableColumn<Staff> = {
  key: 'hired',
  label: 'Принят',
  type: 'date',
  width: 140,
  editable: true,
  value: (row) => Date.UTC(2026, 0, row.id + 1),
};

afterEach(() => {
  for (const grid of mounted.splice(0)) {
    grid.unmount();
  }
});

describe('NuiTable cell editing', () => {
  it('opens a text editor with Enter, commits with Enter, moves down and undoes the edit', async () => {
    const rows = staff(20);
    const grid = mountStaff({ rows });
    await grid.focusCell(1, 2);

    await grid.press('Enter');
    expect(grid.editing).toEqual({ row: 1, col: 2 });
    expect(grid.editorValue).toBe('Казань');
    expect(grid.editorLabel).toBe('Город');
    expect(grid.editorFocused).toBe(true);
    await grid.typeInEditor('Самара');
    await grid.press('Enter');

    expect(grid.edits).toEqual([
      {
        kind: 'edit',
        changes: [{ row: rows[1], key: 'city', value: 'Самара', previous: 'Казань' }],
      },
    ]);

    expect(grid.editing).toBeUndefined();
    expect(grid.cellText(1, 2)).toBe('Самара');
    expect(grid.focusedCell).toEqual({ row: 2, col: 2 });
    await grid.press('z', { ctrl: true });
    expect(grid.cellText(1, 2)).toBe('Казань');
    await grid.press('F2');
    await grid.press('Enter', { shift: true });
    expect(grid.focusedCell).toEqual({ row: 1, col: 2 });
    await grid.press('F2');
    await grid.press('Tab', { shift: true });
    expect(grid.focusedCell).toEqual({ row: 1, col: 1 });
    expect(grid.edits).toHaveLength(2);
  });

  it('starts editing by typing, commits with Tab and cancels with Escape', async () => {
    const rows = staff(20);
    const grid = mountStaff({ rows });
    await grid.focusCell(3, 2);

    await grid.press('Т');
    expect(grid.editorValue).toBe('Т');
    await grid.typeInEditor('Тула');
    await grid.press('Tab');
    expect(grid.cellText(3, 2)).toBe('Тула');
    expect(grid.focusedCell).toEqual({ row: 3, col: 3 });
    await grid.press('7');
    expect(grid.editorValue).toBe('7');
    await grid.press('Enter');

    expect(grid.edits.at(-1)).toEqual({
      kind: 'edit',
      changes: [{ row: rows[3], key: 'salary', value: 7, previous: 1030 }],
    });

    await grid.focusCell(5, 3);
    await grid.press('x');
    expect(grid.editorValue).toBe('1\u00a0050');
    await grid.typeInEditor('2000');
    await grid.press('Escape');
    expect(grid.editing).toBeUndefined();
    expect(grid.cellText(5, 3)).toBe('1\u00a0050');
    expect(grid.focusedCell).toEqual({ row: 5, col: 3 });
    await grid.press('F2');
    await grid.setSort([{ key: 'salary', direction: 'desc' }]);
    expect(grid.editing).toBeUndefined();
    expect(grid.focusedCell).toEqual({ row: 5, col: 3 });
    expect(grid.edits).toHaveLength(2);
  });

  it('keeps a value that breaks a rule in the editor with its error and discards it on blur', async () => {
    const grid = mountStaff({ columns: withRequiredCity });
    await grid.focusCell(1, 2);

    await grid.press('Enter');
    await grid.typeInEditor('');
    await grid.press('Enter');
    expect(grid.editing).toEqual({ row: 1, col: 2 });
    expect(grid.editorError).toBe('Заполните поле');
    expect(grid.announcement).toBe('Заполните поле');
    await grid.typeInEditor('Омск');
    expect(grid.editorError).toBeUndefined();
    await grid.typeInEditor(' ');
    expect(grid.editorError).toBe('Заполните поле');
    await grid.clickCell(6, 1);
    expect(grid.editing).toBeUndefined();
    expect(grid.edits).toEqual([]);
    expect(grid.cellText(1, 2)).toBe('Казань');
    expect(grid.announcement).toBe('Правка отменена: Заполните поле');
  });

  it('commits on a click elsewhere and keeps clicks inside the editor away from rows and ranges', async () => {
    const rows = staff(20);
    const grid = mountStaff({ rows });
    await grid.doubleClickCell(4, 2);

    expect(grid.editing).toEqual({ row: 4, col: 2 });
    await grid.clickEditor();
    expect(grid.clicks).toEqual([rows[4]]);
    expect(grid.ranges).toEqual([]);
    expect(grid.editorFocused).toBe(true);
    await grid.typeInEditor('Сочи');
    await grid.clickCell(8, 1);
    expect(grid.editing).toBeUndefined();
    expect(grid.cellText(4, 2)).toBe('Сочи');
    expect(grid.focusedCell).toEqual({ row: 8, col: 1 });
  });

  it('toggles booleans, refuses read-only cells and opens editors on a double tap', async () => {
    const rows = staff(20);
    const grid = mountStaff({ rows });
    await grid.focusCell(2, 4);

    await grid.press('Enter');

    expect(grid.edits.at(-1)?.changes).toEqual([
      { row: rows[2], key: 'remote', value: false, previous: true },
    ]);

    expect(grid.cellText(2, 4)).toBe('Нет');
    await grid.doubleClickCell(2, 4);
    expect(grid.cellText(2, 4)).toBe('Да');
    await grid.focusCell(2, 1);
    await grid.press('F2');
    expect(grid.announcement).toBe('Эту ячейку нельзя изменить');
    expect(grid.editing).toBeUndefined();
    await grid.focusCell(0, 3);
    await grid.press('7');
    expect(grid.editing).toBeUndefined();
    await grid.doubleTapCell(6, 3);
    expect(grid.editing).toEqual({ row: 6, col: 3 });
    expect(grid.editorValue).toBe('1\u00a0060');
  });

  it('edits dates in a date picker and checks pasted and cleared values against the rules', async () => {
    const rows = staff(20);

    const grid = mountStaff({
      rows,
      columns: [...withRequiredCity, HIRED],
      onEdit: () => undefined,
    });

    await grid.focusCell(2, 5);
    await grid.press('F2');
    expect(grid.editorValue).toBe('03.01.2026');
    await grid.typeInEditor('15.03.2026');
    await grid.press('Enter');

    expect(grid.edits.at(-1)).toEqual({
      kind: 'edit',
      changes: [
        {
          row: rows[2],
          key: 'hired',
          value: new Date(Date.UTC(2026, 2, 15)),
          previous: Date.UTC(2026, 0, 3),
        },
      ],
    });

    await grid.focusCell(4, 2);
    await grid.press('Delete');
    expect(grid.announcement).toBe('Очищено 0 ячеек, пропущено: 1');
    await grid.paste('\tабв');
    expect(grid.announcement).toBe('Вставлено 0 ячеек, пропущено: 2');
    expect(grid.edits).toHaveLength(1);
  });
});
