import { afterEach, describe, expect, it } from 'vitest';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { applyStaffEdits, staff, STAFF_COLUMNS, type Staff } from './support/staff';

const mounted: TableDriver<Staff>[] = [];
const bars: HTMLInputElement[] = [];

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
    props: { cellSelection: true, ...options.props },
  });

  mounted.push(grid);
  return grid;
};

const formulaBar = (): HTMLInputElement => {
  const bar = document.createElement('input');

  document.body.append(bar);
  bars.push(bar);
  return bar;
};

afterEach(() => {
  for (const grid of mounted.splice(0)) {
    grid.unmount();
  }
  for (const bar of bars.splice(0)) {
    bar.remove();
  }
});

describe('NuiTable external editing', () => {
  it('reports the active cell and moves it from the model', async () => {
    const grid = mountStaff();
    await grid.focusCell(2, 1);

    expect(grid.activeModel).toEqual({ row: 2, col: 1 });
    await grid.press('ArrowRight');
    expect(grid.activeModel).toEqual({ row: 2, col: 2 });
    await grid.setActive({ row: 5, col: 3 });
    expect(grid.focusedCell).toEqual({ row: 5, col: 3 });
    await grid.setActive({ row: 99, col: 0 });
    expect(grid.activeModel).toEqual({ row: 5, col: 3 });
  });

  it('opens the editor without taking focus and shares the draft both ways', async () => {
    const rows = staff(20);
    const grid = mountStaff({ rows });
    const bar = formulaBar();
    await grid.focusCell(1, 2);
    await grid.focusOutside(bar);

    expect(await grid.startEdit('append', { focus: false })).toBe(true);
    expect(grid.editing).toEqual({ row: 1, col: 2 });
    expect(grid.editorFocused).toBe(false);
    expect(document.activeElement).toBe(bar);
    expect(grid.draftModel).toEqual({ row: 1, col: 2, key: 'city', value: 'Казань' });
    await grid.setDraft({ row: 4, col: 2, key: 'city', value: 'Сочи' });
    expect(grid.editorValue).toBe('Казань');
    await grid.setDraft({ row: 1, col: 2, key: 'city', value: 'Сочи' });
    expect(grid.editorValue).toBe('Сочи');
    await grid.typeInEditor('Тула');
    expect(grid.draftModel).toEqual({ row: 1, col: 2, key: 'city', value: 'Тула' });
    expect(await grid.commitEdit('down')).toBe(true);

    expect(grid.edits).toEqual([
      { kind: 'edit', changes: [{ row: rows[1], key: 'city', value: 'Тула', previous: 'Казань' }] },
    ]);

    expect(grid.draftModel).toBeUndefined();
    expect(grid.focusedCell).toEqual({ row: 2, col: 2 });
  });

  it('keeps a blank edit while focus visits the companion input and cancels back to the cell', async () => {
    const bar = formulaBar();
    const grid = mountStaff({ props: { keepEditing: (target) => target === bar } });
    await grid.focusCell(4, 2);

    expect(await grid.startEdit('replace')).toBe(true);
    expect(grid.editorFocused).toBe(true);
    expect(grid.editorValue).toBe('');
    expect(grid.draftModel).toEqual({ row: 4, col: 2, key: 'city', value: undefined });
    await grid.focusOutside(bar);
    expect(grid.editing).toEqual({ row: 4, col: 2 });
    await grid.cancelEdit();
    expect(grid.editing).toBeUndefined();
    expect(grid.edits).toEqual([]);
    expect(grid.focusedCell).toEqual({ row: 4, col: 2 });
    await grid.focusCell(0, 1);
    expect(await grid.startEdit('append')).toBe(false);
    expect(grid.announcement).toBe('Эту ячейку нельзя изменить');
  });

  it('commits an edit led from outside when a cell takes the focus', async () => {
    const rows = staff(20);
    const bar = formulaBar();
    const grid = mountStaff({ rows });
    await grid.focusCell(1, 2);
    await grid.focusOutside(bar);
    await grid.startEdit('append', { focus: false });
    await grid.setDraft({ row: 1, col: 2, key: 'city', value: 'Омск' });
    await grid.focusCell(6, 1);

    expect(grid.editing).toBeUndefined();

    expect(grid.edits).toEqual([
      { kind: 'edit', changes: [{ row: rows[1], key: 'city', value: 'Омск', previous: 'Казань' }] },
    ]);

    expect(grid.focusedCell).toEqual({ row: 6, col: 1 });
  });

  it('fills the selected cells of the same type with Ctrl+Enter', async () => {
    const rows = staff(20);
    const grid = mountStaff({ rows });
    await grid.dragRange({ row: 1, col: 2 }, { row: 3, col: 3 });
    await grid.press('F2');
    await grid.typeInEditor('Самара');
    await grid.press('Enter', { ctrl: true });

    expect(grid.edits).toEqual([
      {
        kind: 'edit',
        changes: [
          { row: rows[1], key: 'city', value: 'Самара', previous: 'Казань' },
          { row: rows[2], key: 'city', value: 'Самара', previous: 'Ереван' },
          { row: rows[3], key: 'city', value: 'Самара', previous: 'Москва' },
        ],
      },
    ]);

    expect(grid.announcement).toBe('Заполнены 3 ячейки, пропущено: 3');
    expect(grid.focusedCell).toEqual({ row: 1, col: 2 });
  });
});
