import { afterEach, describe, expect, it } from 'vite-plus/test';
import { h } from 'vue';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { people, PEOPLE_COLUMNS, type Person } from './support/people';

const mounted: Array<{ unmount(): void }> = [];

const mountPeople = (options: Partial<TableMountOptions<Person>> = {}): TableDriver<Person> => {
  const grid = TableDriver.mount<Person>({
    columns: PEOPLE_COLUMNS,
    rows: people(1000),
    config: { locale: 'ru-RU' },
    width: 2400,
    props: { selectable: 'multiple' },
    ...options,
  });

  mounted.push(grid);
  return grid;
};

const idsOf = (rows: readonly Person[]): number[] => rows.map((row) => row.id);

afterEach(() => {
  for (const grid of mounted.splice(0)) {
    grid.unmount();
  }
});

describe('NuiTable selection', () => {
  it('selects rows through checkboxes, Space and a tri-state header over the rows in view', async () => {
    const grid = mountPeople();
    await grid.settle();

    expect(grid.colCount).toBe(19);
    expect(grid.multiselectable).toBe(true);
    expect(grid.headerCheckbox).toEqual({ checked: false, indeterminate: false, disabled: false });
    expect(grid.selectAllLabel).toBe('Выбрать все строки');
    expect(grid.selectLabel(0)).toBe('Выбрать строку');
    await grid.checkRow(0);

    expect(idsOf(grid.selected)).toEqual([0]);
    expect(grid.rowSelected(0)).toBe(true);
    expect(grid.rowSelected(1)).toBe(false);
    expect(grid.rowChecked(0)).toBe(true);
    expect(grid.headerCheckbox?.indeterminate).toBe(true);
    await grid.focusCell(1, 3);
    await grid.press(' ');
    expect(idsOf(grid.selected)).toEqual([0, 1]);
    await grid.press(' ');
    expect(idsOf(grid.selected)).toEqual([0]);
    expect(grid.focusedCell).toEqual({ row: 1, col: 3 });
    await grid.checkAll();

    expect(grid.selected).toHaveLength(1000);
    expect(grid.headerCheckbox?.checked).toBe(true);
    await grid.checkAll();
    expect(grid.selected).toEqual([]);
    await grid.setQuick('казань');
    expect(grid.rowCount).toBe(251);
    await grid.focusCell(-1, 0);
    await grid.press(' ');

    expect(grid.selected).toHaveLength(250);
    expect(grid.headerCheckbox?.checked).toBe(true);
    await grid.setQuick('');
    expect(grid.headerCheckbox).toEqual({ checked: false, indeterminate: true, disabled: false });
    await grid.setGroupBy(['team']);

    expect(grid.role).toBe('treegrid');
    expect(grid.rowSelected(0)).toBe(undefined);
    await grid.focusCell(0, 2);
    await grid.press(' ');
    expect(grid.expanded).toHaveLength(1);
    expect(grid.selected).toHaveLength(250);
  });

  it('selects one row at a time and reports clicks outside the checkbox', async () => {
    const grid = mountPeople({ props: { selectable: 'single', cellSelection: false } });
    await grid.settle();

    expect(grid.multiselectable).toBe(false);
    expect(grid.headerCheckbox).toBeUndefined();
    await grid.checkRow(2);
    await grid.checkRow(5);
    expect(idsOf(grid.selected)).toEqual([5]);
    await grid.checkRow(5);
    expect(grid.selected).toEqual([]);
    await grid.clickRow(3, 2);
    await grid.clickRow(4, 0);

    expect(idsOf(grid.clicks)).toEqual([3]);
    expect(grid.selected).toEqual([]);
  });

  it('shows skeleton rows or the loading slot while loading and disables the header checkbox', async () => {
    const grid = mountPeople({ props: { selectable: 'multiple', loading: true } });
    await grid.settle();

    expect(grid.busy).toBe(true);
    expect(grid.skeletonRows).toBe(7);
    expect(grid.cellText(0, 1)).toBeUndefined();
    expect(grid.rowCount).toBe(1);
    expect(grid.headerCheckbox?.disabled).toBe(true);
    await grid.receive({ loading: false });

    expect(grid.busy).toBe(false);
    expect(grid.skeletonRows).toBe(0);
    expect(grid.headerCheckbox?.disabled).toBe(false);

    const custom = mountPeople({
      props: { loading: true, loadingRows: 2 },
      slots: { loading: () => [h('em', 'Загрузка…')] },
    });

    await custom.settle();
    expect(custom.skeletonRows).toBe(0);
    expect(custom.emptyText).toBe('Загрузка…');

    const few = mountPeople({ props: { loading: true, loadingRows: 3 } });

    await few.settle();
    expect(few.skeletonRows).toBe(3);
  });

  it('stripes rows by position and names the grid by its caption', async () => {
    const grid = mountPeople({ props: { striped: true, caption: 'Сотрудники' } });
    await grid.settle();

    expect(grid.captionText).toBe('Сотрудники');
    expect(grid.labelledBy).toBe(grid.captionId);
    expect(grid.label).toBeUndefined();
    expect(grid.rowOdd(0)).toBe(false);
    expect(grid.rowOdd(1)).toBe(true);
    await grid.scroll({ top: 4000 });
    expect(grid.rowOdd(101)).toBe(true);
  });
});
