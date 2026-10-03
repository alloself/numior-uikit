import { afterEach, describe, expect, it } from 'vitest';
import type { NuiTableCommandSink, NuiTableEditEvent } from '../src';
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

afterEach(() => {
  for (const grid of mounted.splice(0)) {
    grid.unmount();
  }
});

describe('NuiTable command sink', () => {
  it('hands every edit to the sink and asks it to undo and redo', async () => {
    const rows = staff(20);
    const pushed: NuiTableEditEvent<Staff>[] = [];
    const calls: string[] = [];

    const commands: NuiTableCommandSink<Staff> = {
      push: (command) => {
        pushed.push(command);
      },
      undo: () => {
        calls.push('undo');
        return pushed.length;
      },
      redo: () => {
        calls.push('redo');
        return 0;
      },
    };

    const grid = mountStaff({ rows, props: { commands } });
    await grid.focusCell(1, 2);
    await grid.press('Delete');

    expect(pushed).toEqual([
      { kind: 'clear', changes: [{ row: rows[1], key: 'city', value: null, previous: 'Казань' }] },
    ]);

    await grid.press('z', { ctrl: true });
    expect(calls).toEqual(['undo']);
    expect(grid.announcement).toBe('Отменено 1 изменение');
    await grid.press('y', { ctrl: true });
    expect(calls).toEqual(['undo', 'redo']);
    expect(grid.announcement).toBe('Отменено 1 изменение');
    expect(grid.edits.map((event) => event.kind)).toEqual(['clear']);
  });
});
