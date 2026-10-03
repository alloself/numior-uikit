import { afterEach, describe, expect, it } from 'vitest';
import type { NuiTableDraft, NuiTableRange } from '../src';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { applyStaffEdits, staff, STAFF_COLUMNS, type Staff } from './support/staff';

const mounted: TableDriver<Staff>[] = [];

const formula = (draft: NuiTableDraft): boolean =>
  typeof draft.value === 'string' && draft.value.startsWith('=');

const mountStaff = (options: Partial<TableMountOptions<Staff>> = {}): TableDriver<Staff> => {
  const grid = TableDriver.mount<Staff>({
    columns: STAFF_COLUMNS,
    rows: staff(20),
    config: { locale: 'ru-RU' },
    width: 1200,
    props: { picking: formula },
    onEdit: (event) => {
      applyStaffEdits(event.changes);
    },
    ...options,
  });

  mounted.push(grid);
  return grid;
};

const span = (top: number, start: number, bottom: number, end: number): NuiTableRange => ({
  from: { row: top, col: start },
  to: { row: bottom, col: end },
});

afterEach(() => {
  for (const grid of mounted.splice(0)) {
    grid.unmount();
  }
});

describe('NuiTable reference picking', () => {
  it('picks cells by pointer and arrows while the draft waits for a reference', async () => {
    const grid = mountStaff();
    await grid.focusCell(1, 2);
    await grid.press('F2');
    await grid.typeInEditor('=SUM(');
    await grid.dragRange({ row: 3, col: 1 }, { row: 4, col: 2 });
    await grid.press('ArrowDown');
    await grid.press('ArrowLeft', { shift: true });
    await grid.typeInEditor('=SUM(B4)+');
    await grid.press('ArrowUp');

    expect(grid.picks).toEqual([
      span(3, 1, 3, 1),
      span(3, 1, 4, 2),
      span(5, 2, 5, 2),
      span(5, 2, 5, 1),
      span(0, 2, 0, 2),
    ]);

    expect(grid.editing).toEqual({ row: 1, col: 2 });
    expect(grid.editorFocused).toBe(true);
    expect(grid.ranges).toEqual([]);
    expect(grid.edits).toEqual([]);
    await grid.typeInEditor('Самара');
    await grid.press('ArrowDown');
    expect(grid.picks).toHaveLength(5);
    expect(grid.editing).toEqual({ row: 1, col: 2 });
  });

  it('picks a tapped cell, leaves the edited cell alone and commits the formula', async () => {
    const rows = staff(20);
    const grid = mountStaff({ rows });
    await grid.focusCell(1, 2);
    await grid.press('F2');
    await grid.typeInEditor('=');
    await grid.tapCell(6, 3);
    await grid.tapCell(1, 2);

    expect(grid.picks).toEqual([span(6, 3, 6, 3)]);
    expect(grid.editing).toEqual({ row: 1, col: 2 });
    await grid.press('Enter');

    expect(grid.edits).toEqual([
      { kind: 'edit', changes: [{ row: rows[1], key: 'city', value: '=', previous: 'Казань' }] },
    ]);
  });
});
