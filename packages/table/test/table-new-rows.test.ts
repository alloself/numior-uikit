import { afterEach, describe, expect, it } from 'vite-plus/test';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { staff, STAFF_COLUMNS, type Staff } from './support/staff';

const NEWCOMER: Staff = { id: 100, name: 'Новый', city: 'Тверь', salary: 1, remote: false };

const KEYED = { getKey: (row: Staff) => row.id };

const mounted: TableDriver<Staff>[] = [];

const mountStaff = (options: Partial<TableMountOptions<Staff>> = {}): TableDriver<Staff> => {
  const grid = TableDriver.mount<Staff>({
    columns: STAFF_COLUMNS,
    rows: staff(20),
    config: { locale: 'ru-RU' },
    width: 1200,
    ...options,
    props: { cellSelection: true, ...options.props },
  });

  mounted.push(grid);
  return grid;
};

afterEach(() => {
  for (const grid of mounted.splice(0)) {
    grid.unmount();
  }
});

describe('NuiTable given new rows', () => {
  it('keeps an open editor on its row with its draft, focus and caret when a row comes above', async () => {
    const rows = staff(20);
    const grid = mountStaff({ rows, props: KEYED });

    await grid.focusCell(3, 2);
    await grid.press('F2');
    await grid.typeInEditor('Тула');
    grid.placeEditorCaret(1, 3);
    await grid.setSource([NEWCOMER, ...rows]);

    expect(grid.editing).toEqual({ row: 4, col: 2 });
    expect(grid.editorValue).toBe('Тула');
    expect(grid.editorFocused).toBe(true);
    expect(grid.editorCaret).toEqual([1, 3]);

    await grid.press('Enter');

    expect(grid.edits).toEqual([
      { kind: 'edit', changes: [{ row: rows[3], key: 'city', value: 'Тула', previous: 'Москва' }] },
    ]);
  });

  it('finds the row of an open editor by its key among copies of every row', async () => {
    const rows = staff(20);
    const grid = mountStaff({ rows, props: KEYED });

    await grid.focusCell(3, 2);
    await grid.press('F2');
    await grid.typeInEditor('Тула');

    const copies = rows.slice(1).map((row) => ({ ...row }));

    await grid.setSource(copies);

    expect(grid.editing).toEqual({ row: 2, col: 2 });
    expect(grid.editorValue).toBe('Тула');

    await grid.press('Enter');

    expect(grid.edits).toEqual([
      {
        kind: 'edit',
        changes: [{ row: copies[2], key: 'city', value: 'Тула', previous: 'Москва' }],
      },
    ]);
  });

  it('writes an edit into the copy of its row that came in place of the row', async () => {
    const rows = staff(20);
    const grid = mountStaff({ rows, props: KEYED });

    await grid.focusCell(3, 2);
    await grid.press('F2');
    await grid.typeInEditor('Тула');

    const copies = rows.map((row) => ({ ...row }));

    await grid.setSource(copies);
    await grid.press('Enter');

    expect(grid.edits).toEqual([
      {
        kind: 'edit',
        changes: [{ row: copies[3], key: 'city', value: 'Тула', previous: 'Москва' }],
      },
    ]);
  });

  it('closes an open editor and says so when the new rows have no row of it', async () => {
    const rows = staff(20);
    const grid = mountStaff({ rows, props: KEYED });

    await grid.focusCell(3, 2);
    await grid.press('F2');
    await grid.typeInEditor('Тула');
    await grid.setSource(rows.filter((row) => row.id !== 3));

    expect(grid.editing).toBeUndefined();
    expect(grid.refusals).toEqual([{ row: rows[3], key: 'city', reason: 'row-gone' }]);
    expect(grid.focusedCell).toEqual({ row: 3, col: 2 });
    expect(grid.edits).toEqual([]);
  });

  it('follows the row object of an open editor in a table without a key', async () => {
    const rows = staff(20);
    const grid = mountStaff({ rows });

    await grid.focusCell(3, 2);
    await grid.press('F2');
    await grid.typeInEditor('Тула');
    await grid.setSource(rows.slice(1));

    expect(grid.editing).toEqual({ row: 2, col: 2 });
    expect(grid.editorValue).toBe('Тула');
  });

  it('keeps an open editor and the ranges when the owner hands an equal sort and filters again', async () => {
    const grid = mountStaff({
      props: KEYED,
      sort: [{ key: 'salary', direction: 'asc' }],
      filters: [{ kind: 'text', key: 'name', op: 'contains', value: 'Сотрудник' }],
    });

    await grid.settle();
    await grid.dragRange({ row: 5, col: 2 }, { row: 6, col: 3 });

    const ranges = grid.ranges;

    expect(await grid.startEdit('append')).toBe(true);

    await grid.typeInEditor('Тула');
    await grid.handViewAgain();

    expect(grid.editorValue).toBe('Тула');
    expect(grid.ranges).toEqual(ranges);
  });

  it('moves the active cell and the selected ranges with their rows', async () => {
    const rows = staff(20);
    const grid = mountStaff({ rows, props: KEYED });

    await grid.dragRange({ row: 2, col: 1 }, { row: 4, col: 2 });

    const active = grid.activeCell;

    await grid.setSource([NEWCOMER, ...rows]);

    expect(grid.ranges).toEqual([{ from: { row: 3, col: 1 }, to: { row: 5, col: 2 } }]);
    expect(grid.activeCell).toEqual({ row: (active?.row ?? 0) + 1, col: active?.col });

    await grid.setSource([NEWCOMER, ...rows.filter((row) => row.id !== 4)]);

    expect(grid.ranges).toEqual([]);
  });
});
