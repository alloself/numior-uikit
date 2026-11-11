import { afterEach, describe, expect, it } from 'vite-plus/test';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { applyStaffEdits, staff, STAFF_COLUMNS, type Staff } from './support/staff';

const STAFF_WIDTHS = [80, 160, 140, 120, 100];

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

  it('moves the focus into a cell from outside the table', async () => {
    const grid = mountStaff();
    const bar = formulaBar();
    await grid.focusCell(1, 1);
    await grid.focusOutside(bar);

    expect(await grid.focusCellByRef({ row: 6, col: 2 })).toBe(true);
    expect(grid.focusedCell).toEqual({ row: 6, col: 2 });
    expect(grid.activeModel).toEqual({ row: 6, col: 2 });

    await grid.focusOutside(bar);

    expect(await grid.focusCellByRef({ row: 40, col: 0 })).toBe(false);
    expect(document.activeElement).toBe(bar);
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

  it('carries an open editor to another row with its draft, focus and caret', async () => {
    const rows = staff(20);
    const grid = mountStaff({ rows });
    await grid.focusCell(1, 2);
    await grid.press('F2');
    await grid.typeInEditor('Тула');
    grid.placeEditorCaret(1, 3);

    expect(await grid.moveActive({ row: 3, col: 2 })).toBe(true);

    expect(grid.editing).toEqual({ row: 3, col: 2 });
    expect(grid.editorValue).toBe('Тула');
    expect(grid.editorFocused).toBe(true);
    expect(grid.editorCaret).toEqual([1, 3]);
    expect(grid.draftModel).toEqual({ row: 3, col: 2, key: 'city', value: 'Тула' });
    expect(grid.activeModel).toEqual({ row: 3, col: 2 });

    await grid.press('Enter');

    expect(grid.edits).toEqual([
      { kind: 'edit', changes: [{ row: rows[3], key: 'city', value: 'Тула', previous: 'Москва' }] },
    ]);
  });

  it('carries an editor driven from outside without taking the focus', async () => {
    const grid = mountStaff();
    const bar = formulaBar();
    await grid.focusCell(1, 2);
    await grid.focusOutside(bar);
    await grid.startEdit('append', { focus: false });
    await grid.setDraft({ row: 1, col: 2, key: 'city', value: 'Тула' });

    expect(await grid.moveActive({ row: 4, col: 2 })).toBe(true);

    expect(grid.editing).toEqual({ row: 4, col: 2 });
    expect(grid.editorValue).toBe('Тула');
    expect(document.activeElement).toBe(bar);
  });

  it('moves the active cell without an editor and keeps the focus where it was', async () => {
    const grid = mountStaff();
    const bar = formulaBar();
    await grid.focusCell(2, 1);

    expect(await grid.moveActive({ row: 5, col: 1 })).toBe(true);
    expect(grid.focusedCell).toEqual({ row: 5, col: 1 });

    await grid.focusOutside(bar);

    expect(await grid.moveActive({ row: 7, col: 1 })).toBe(true);
    expect(grid.activeModel).toEqual({ row: 7, col: 1 });
    expect(document.activeElement).toBe(bar);
    expect(await grid.moveActive({ row: 40, col: 1 })).toBe(false);
  });

  it('keeps the editor where it is when the new cell cannot be edited', async () => {
    const grid = mountStaff();
    await grid.focusCell(1, 2);
    await grid.press('F2');
    await grid.typeInEditor('Тула');

    expect(await grid.moveActive({ row: 3, col: 0 })).toBe(false);

    expect(grid.editing).toEqual({ row: 1, col: 2 });
    expect(grid.editorValue).toBe('Тула');
  });

  it('lets the editor grow past its cell only when the table asks for it', async () => {
    const fixed = mountStaff();
    await fixed.focusCell(1, 2);
    await fixed.press('F2');

    expect(fixed.editorGrows).toBe(false);

    const growing = mountStaff({ props: { growEditor: true } });
    await growing.focusCell(1, 2);
    await growing.press('F2');

    expect(growing.editorGrows).toBe(true);
    expect(growing.editorValue).toBe('Казань');
  });

  it('grows the editor to the next column line once the text stops fitting and back when it fits', async () => {
    const grid = mountStaff({ props: { growEditor: true } });
    await grid.focusCell(1, 2);
    await grid.press('F2');
    grid.layEditorOut({ widths: STAFF_WIDTHS, visible: 660, glyph: 10 });

    await grid.typeInEditor('Тула');

    expect(grid.editorSize).toBeUndefined();
    expect(grid.editorLifted).toBe(false);

    await grid.typeInEditor('Набережные Челны');

    expect(grid.editorSize).toBe(260);
    expect(grid.editorLifted).toBe(true);

    await grid.typeInEditor('Петропавловск-Камчатский, улица');

    expect(grid.editorSize).toBe(360);

    await grid.typeInEditor('Уфа');

    expect(grid.editorSize).toBeUndefined();
    expect(grid.editorLifted).toBe(false);
  });

  it('stops the growing editor at the edge of the visible area', async () => {
    const grid = mountStaff({ props: { growEditor: true } });
    await grid.focusCell(1, 2);
    await grid.press('F2');
    grid.layEditorOut({ widths: STAFF_WIDTHS, visible: 540, glyph: 10 });

    await grid.typeInEditor('Петропавловск-Камчатский, улица Ленинская');

    expect(grid.editorSize).toBe(300);
  });

  it('grows the editor of an end-aligned cell back over the columns before it', async () => {
    const grid = mountStaff({
      columns: STAFF_COLUMNS.map((column) =>
        column.key === 'city' ? { ...column, align: 'end' } : column,
      ),
      props: { growEditor: true },
    });

    await grid.focusCell(1, 2);
    await grid.press('F2');
    grid.layEditorOut({ widths: STAFF_WIDTHS, visible: 660, glyph: 10 });

    await grid.typeInEditor('Набережные Челны');

    expect(grid.editorSize).toBe(300);

    await grid.typeInEditor('Петропавловск-Камчатский, улица');

    expect(grid.editorSize).toBe(380);
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
