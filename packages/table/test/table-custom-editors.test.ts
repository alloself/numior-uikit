import { afterEach, describe, expect, it } from 'vite-plus/test';
import { isString } from '@numior/primitives';
import { NuiCombobox, NuiSelect, type NuiOption } from '@numior/vue';
import { kitControls } from '@numior/vue/controls';
import { tableEditor, type NuiTableColumn, type NuiTableControlEditor } from '../src';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { applyStaffEdits, staff, STAFF_COLUMNS, type Staff } from './support/staff';

const mounted: TableDriver<Staff>[] = [];

const CITY_OPTIONS: NuiOption<string>[] = [
  { value: 'Москва', label: 'Москва' },
  { value: 'Казань', label: 'Казань' },
  { value: 'Ереван', label: 'Ереван' },
  { value: 'Самара', label: 'Самара' },
];

const HIRED: NuiTableColumn<Staff> = {
  key: 'hired',
  label: 'Принят',
  type: 'date',
  width: 140,
  editable: true,
  editor: 'calendar',
  value: (row) => Date.UTC(2026, 0, row.id + 1),
};

const withEditors = (
  editors: Readonly<Record<string, NuiTableControlEditor | string>>,
): NuiTableColumn<Staff>[] =>
  STAFF_COLUMNS.map((column) => {
    const editor = editors[column.key];

    return editor === undefined ? column : { ...column, editor };
  });

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

describe('NuiTable custom editors', () => {
  it('opens a typed select editor with its list and saves the picked option at once', async () => {
    const rows = staff(20);

    const columns = STAFF_COLUMNS.map((column) =>
      column.key === 'city' && column.type === 'text'
        ? {
            ...column,
            editor: tableEditor(NuiSelect, isString, { props: { options: CITY_OPTIONS } }),
          }
        : column,
    );

    const grid = mountStaff({ rows, columns });
    await grid.focusCell(1, 2);

    await grid.press('Enter');
    expect(grid.editing).toEqual({ row: 1, col: 2 });
    expect(grid.editorExpanded).toBe('true');
    expect(grid.editorOptions).toEqual(['Москва', 'Казань', 'Ереван', 'Самара']);
    await grid.pickInEditor('Самара');

    expect(grid.edits).toEqual([
      {
        kind: 'edit',
        changes: [{ row: rows[1], key: 'city', value: 'Самара', previous: 'Казань' }],
      },
    ]);

    expect(grid.editing).toBeUndefined();
    expect(grid.cellText(1, 2)).toBe('Самара');
    expect(grid.focusedCell).toEqual({ row: 1, col: 2 });
  });

  it('saves a value typed into a combobox editor that takes new values as one edit', async () => {
    const rows = staff(20);

    const columns = STAFF_COLUMNS.map((column) =>
      column.key === 'city' && column.type === 'text'
        ? {
            ...column,
            editor: tableEditor(NuiCombobox, isString, {
              props: { options: CITY_OPTIONS, customValue: (text: string) => text },
            }),
          }
        : column,
    );

    const grid = mountStaff({ rows, columns });
    await grid.focusCell(1, 2);

    await grid.press('Enter');
    await grid.typeInEditor('Тверь');
    await grid.press('Enter');

    expect(grid.edits).toEqual([
      {
        kind: 'edit',
        changes: [{ row: rows[1], key: 'city', value: 'Тверь', previous: 'Казань' }],
      },
    ]);

    expect(grid.cellText(1, 2)).toBe('Тверь');
  });

  it('takes registry controls from the config and refuses unknown controls, wrong props and values', async () => {
    const rows = staff(20);

    const grid = mountStaff({
      rows,
      config: { locale: 'ru-RU', controls: kitControls },
      columns: [
        ...withEditors({
          city: { control: 'select', props: { options: CITY_OPTIONS } },
          salary: { control: 'number', props: { steppers: 'нет' } },
          remote: 'text',
        }),
        HIRED,
      ],
    });

    await grid.doubleClickCell(2, 2);
    await grid.pickInEditor('Москва');
    expect(grid.cellText(2, 2)).toBe('Москва');
    await grid.focusCell(3, 3);
    await grid.press('F2');
    expect(grid.editing).toBeUndefined();
    expect(grid.announcement).toBe('Эту ячейку нельзя изменить');
    await grid.focusCell(4, 4);
    await grid.press('Enter');
    await grid.focusCell(4, 5);
    await grid.press('Enter');

    expect(grid.refusals).toEqual([
      { row: rows[3], key: 'salary', reason: 'props' },
      { row: rows[4], key: 'remote', reason: 'value' },
      { row: rows[4], key: 'hired', reason: 'control' },
    ]);

    expect(grid.edits).toHaveLength(1);
  });

  it('prefers the registry prop and edits a boolean column in its editor instead of toggling', async () => {
    const rows = staff(20);

    const grid = mountStaff({
      rows,
      props: { controls: kitControls },
      columns: withEditors({ remote: 'switch' }),
    });

    await grid.focusCell(2, 4);
    await grid.press('Enter');
    expect(grid.editing).toEqual({ row: 2, col: 4 });
    await grid.clickEditor();
    await grid.press('Enter');

    expect(grid.edits).toEqual([
      {
        kind: 'edit',
        changes: [{ row: rows[2], key: 'remote', value: false, previous: true }],
      },
    ]);

    expect(grid.focusedCell).toEqual({ row: 3, col: 4 });
  });
});
