import { flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { installClipboard, type ClipboardStub } from '../../primitives/test/support/clipboard';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { applyStaffEdits, staff, STAFF_COLUMNS, type Staff } from './support/staff';

const mounted: TableDriver<Staff>[] = [];
let clipboard: ClipboardStub | undefined;

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

const range = (top: number, start: number, bottom: number, end: number) => ({
  from: { row: top, col: start },
  to: { row: bottom, col: end },
});

afterEach(() => {
  clipboard?.restore();
  clipboard = undefined;

  for (const grid of mounted.splice(0)) {
    grid.unmount();
  }
});

describe('NuiTable edits', () => {
  it('clears editable cells with Delete, keeps read-only ones and undoes and redoes the change', async () => {
    const rows = staff(20);
    const grid = mountStaff({ rows });
    await grid.settle();

    expect(grid.cellText(20, 3)).toBe('21 900');
    await grid.dragRange({ row: 1, col: 1 }, { row: 2, col: 3 });
    await grid.press('Delete');

    expect(grid.edits).toEqual([
      {
        kind: 'clear',
        changes: [
          { row: rows[1], key: 'city', value: null, previous: 'Казань' },
          { row: rows[1], key: 'salary', value: null, previous: 1010 },
          { row: rows[2], key: 'city', value: null, previous: 'Ереван' },
          { row: rows[2], key: 'salary', value: null, previous: 1020 },
        ],
      },
    ]);

    expect(grid.cellText(1, 1)).toBe('Сотрудник 1');
    expect(grid.cellText(1, 2)).toBe('');
    expect(grid.cellText(20, 3)).toBe('19 870');
    expect(grid.announcement).toBe('Очищены 4 ячейки');
    await grid.press('z', { ctrl: true });
    expect(grid.edits[1]?.kind).toBe('undo');

    expect(grid.edits[1]?.changes[0]).toEqual({
      row: rows[2],
      key: 'salary',
      value: 1020,
      previous: null,
    });

    expect(grid.cellText(1, 2)).toBe('Казань');
    expect(grid.cellText(20, 3)).toBe('21 900');
    expect(grid.announcement).toBe('Отменены 4 изменения');
    await grid.press('z', { ctrl: true, shift: true });
    expect(grid.edits[2]?.kind).toBe('redo');
    expect(grid.cellText(1, 2)).toBe('');
    expect(grid.announcement).toBe('Повторены 4 изменения');
    await grid.press('y', { ctrl: true });
    expect(grid.edits).toHaveLength(3);
  });

  it('cuts editable cells and refuses read-only cells and too many cells at once', async () => {
    clipboard = installClipboard({ api: 'granted' });
    const grid = mountStaff({ props: { copyLimit: 6 } });
    await grid.settle();

    await grid.dragRange({ row: 3, col: 2 }, { row: 4, col: 2 });
    await grid.press('x', { ctrl: true });
    await flushPromises();
    expect(clipboard.copies).toEqual(['Москва\nКазань']);
    expect(grid.edits.map((event) => event.kind)).toEqual(['cut']);
    expect(grid.cellText(3, 2)).toBe('');
    expect(grid.announcement).toBe('Вырезаны 2 ячейки');
    await grid.dragRange({ row: 5, col: 1 }, { row: 6, col: 1 });
    await grid.press('Delete');
    expect(grid.announcement).toBe('Эти ячейки нельзя изменить');
    await grid.press('a', { ctrl: true });
    await grid.press('Delete');
    expect(grid.announcement).toBe('Слишком много ячеек: 100, за раз можно изменить до 6');
    expect(grid.edits).toHaveLength(1);
  });

  it('pastes a block from the active cell, fills a selection, repeats a block and skips what does not fit', async () => {
    const rows = staff(20);
    const grid = mountStaff({ rows });
    await grid.focusCell(1, 2);

    await grid.paste('Самара\t1\u00a0500\r\nТула\tabc\r\n');

    expect(grid.edits).toEqual([
      {
        kind: 'paste',
        changes: [
          { row: rows[1], key: 'city', value: 'Самара', previous: 'Казань' },
          { row: rows[1], key: 'salary', value: 1500, previous: 1010 },
          { row: rows[2], key: 'city', value: 'Тула', previous: 'Ереван' },
        ],
      },
    ]);

    expect(grid.ranges).toEqual([range(1, 2, 2, 3)]);
    expect(grid.cellText(1, 3)).toBe('1\u00a0500');
    expect(grid.announcement).toBe('Вставлены 3 ячейки, пропущено: 1');
    await grid.dragRange({ row: 3, col: 2 }, { row: 5, col: 2 });
    await grid.paste('Сочи');
    expect([3, 4, 5].map((row) => grid.cellText(row, 2))).toEqual(['Сочи', 'Сочи', 'Сочи']);
    await grid.dragRange({ row: 2, col: 4 }, { row: 5, col: 4 });
    await grid.paste('нет\nда');
    expect([2, 3, 4, 5].map((row) => rows[row]?.remote)).toEqual([false, true, false, true]);
    await grid.dragRange({ row: 4, col: 1 }, { row: 4, col: 1 });
    await grid.paste('Кто-то');
    expect(grid.announcement).toBe('Вставлено 0 ячеек, пропущено: 1');
    expect(grid.edits).toHaveLength(3);
    await grid.press('z', { ctrl: true });
    expect([2, 3, 4, 5].map((row) => rows[row]?.remote)).toEqual([true, false, true, false]);
  });

  it('offers cut and clear in the cell menu and keeps the history across new rows by key', async () => {
    const rows = staff(20);
    const grid = mountStaff({ rows, props: { getKey: (row) => row.id } });
    await grid.settle();

    expect(await grid.openCellMenu(1, 2)).toBe(true);

    expect(grid.cellMenuLabels).toEqual([
      'Вырезать',
      'Копировать',
      'Копировать с заголовками',
      'Вставить',
      'Очистить',
    ]);

    expect(grid.cellMenuDisabled('Вставить')).toBe(true);

    await grid.chooseCellMenu('Очистить');

    expect(grid.edits).toEqual([
      { kind: 'clear', changes: [{ row: rows[1], key: 'city', value: null, previous: 'Казань' }] },
    ]);

    await grid.openCellMenu(1, 1);
    expect(grid.cellMenuDisabled('Вырезать')).toBe(true);
    expect(grid.cellMenuDisabled('Очистить')).toBe(true);
    await grid.closeCellMenu();

    const copies = rows.map((row) => ({ ...row }));

    await grid.setSource(copies);
    await grid.focusCell(3, 2);
    await grid.press('z', { ctrl: true });

    expect(grid.edits[1]).toEqual({
      kind: 'undo',
      changes: [{ row: copies[1], key: 'city', value: 'Казань', previous: null }],
    });
  });
});
