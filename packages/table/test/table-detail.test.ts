import { flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { h, type VNode } from 'vue';
import { installClipboard, type ClipboardStub } from '../../primitives/test/support/clipboard';
import { NuiTable, type NuiTableDetailSlot } from '../src';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { RemoteStaff } from './support/remote';
import { staff, STAFF_COLUMNS, type Staff } from './support/staff';

const mounted: Array<{ unmount(): void }> = [];
let clipboard: ClipboardStub | undefined;

const dossier = ({ row }: NuiTableDetailSlot<Staff>): VNode[] => [
  h('p', `Досье: ${row.name}`),
  h('button', { type: 'button' }, 'Открыть досье'),
  h('input', { 'aria-label': 'Заметка' }),
];

const reports = ({ row }: NuiTableDetailSlot<Staff>): VNode[] => [
  h(NuiTable<Staff>, {
    columns: STAFF_COLUMNS,
    rows: staff(3),
    getKey: (report: Staff) => report.id,
    cellSelection: true,
    label: `Подчинённые: ${row.name}`,
  }),
];

const mountStaff = (options: Partial<TableMountOptions<Staff>> = {}): TableDriver<Staff> => {
  const grid = TableDriver.mount<Staff>({
    columns: STAFF_COLUMNS,
    rows: staff(6),
    config: { locale: 'ru-RU' },
    auto: true,
    slots: { detail: dossier },
    ...options,
    props: { cellSelection: true, getKey: (row) => row.id, ...options.props },
  });

  mounted.push(grid);
  return grid;
};

afterEach(() => {
  for (const grid of mounted.splice(0)) {
    grid.unmount();
  }
  clipboard?.restore();
  clipboard = undefined;
});

describe('NuiTable detail rows', () => {
  it('opens a detail under a row from its toggle and keeps it in the expanded model', async () => {
    const grid = mountStaff();
    await grid.settle();

    expect(grid.role).toBe('treegrid');
    expect(grid.rowCount).toBe(8);
    expect(grid.rowLevel(0)).toBe('1');
    expect(grid.rowExpanded(0)).toBe('false');
    expect(grid.details).toEqual([]);
    await grid.toggleRow(1);

    expect(grid.expanded).toEqual([1]);
    expect(grid.focusedCell).toBeUndefined();
    expect(grid.activeCell).toEqual({ row: 0, col: 0 });
    expect(grid.ranges).toEqual([]);
    expect(grid.rowExpanded(1)).toBe('true');
    expect(grid.details).toEqual([2]);
    expect(grid.detailText(2)).toBe('Досье: Сотрудник 1');
    expect(grid.rowLevel(2)).toBe('2');
    expect(grid.detailSpan(2)).toBe('5');
    expect(grid.rowCount).toBe(9);
    expect(grid.cellText(3, 1)).toBe('Сотрудник 2');
    expect(grid.announcement).toBe('Строка «1» развёрнута');
    await grid.toggleRow(1);

    expect(grid.expanded).toEqual([]);
    expect(grid.details).toEqual([]);
    expect(grid.rowCount).toBe(8);
  });

  it('gives no toggle to the rows the table has no detail for', async () => {
    const grid = mountStaff({ props: { hasDetail: (row) => row.id !== 2 } });
    await grid.settle();

    expect(grid.rowExpanded(1)).toBe('false');
    expect(grid.rowExpanded(2)).toBeUndefined();
    await grid.toggleRow(2);
    await grid.focusCell(2, 0);
    await grid.press('Enter');
    expect(grid.expanded).toEqual([]);
    expect(grid.details).toEqual([]);
  });

  it('opens the detail from the keyboard and walks through it keeping the column', async () => {
    const grid = mountStaff();
    await grid.focusCell(1, 0);
    await grid.press('Enter');

    expect(grid.details).toEqual([2]);
    await grid.focusCell(1, 2);
    await grid.press('ArrowDown');
    expect(grid.focusedCell).toEqual({ row: 2, col: 0 });
    await grid.press('ArrowDown');
    expect(grid.focusedCell).toEqual({ row: 3, col: 2 });
    await grid.press('ArrowUp');
    await grid.press('ArrowUp');
    expect(grid.focusedCell).toEqual({ row: 1, col: 2 });
  });

  it('moves the cursor to the detail on focus inside it and leaves its events alone', async () => {
    const grid = mountStaff({ expanded: [1] });
    await grid.focusCell(0, 2);
    await grid.clickInDetail(2, 'Открыть досье');

    expect(grid.clicks).toEqual([]);
    expect(grid.editing).toBeUndefined();
    expect(grid.activeCell).toEqual({ row: 2, col: 0 });
    await grid.focusInDetail(2, 'Заметка');
    await grid.press('ArrowDown');
    expect(grid.activeCell).toEqual({ row: 2, col: 0 });
    await grid.paste('Казань');
    expect(grid.edits).toEqual([]);
    expect(await grid.openDetailMenu(2, 'Заметка')).toBe(false);
  });

  it('leaves the keys, clicks and ranges of a nested table to that table', async () => {
    const grid = mountStaff({ expanded: [1], slots: { detail: reports } });
    await grid.settle();
    await grid.focusCell(4, 1);
    await grid.focusNestedCell(2, { row: 0, col: 1 });

    expect(grid.nestedFocusedCell(2)).toEqual({ row: 0, col: 1 });
    expect(grid.activeCell).toEqual({ row: 2, col: 0 });
    await grid.press('ArrowDown');

    expect(grid.nestedFocusedCell(2)).toEqual({ row: 1, col: 1 });
    expect(grid.activeCell).toEqual({ row: 2, col: 0 });
    expect(grid.focusedCell).toBeUndefined();
    await grid.clickNestedCell(2, { row: 2, col: 2 }, { shift: true });

    expect(grid.nestedRangedCells(2)).toBe(4);
    expect(grid.ranges).toEqual([]);
    expect(grid.clicks).toEqual([]);
    await grid.focusCell(4, 1);
    expect(grid.focusedCell).toEqual({ row: 4, col: 1 });
    await grid.press('ArrowDown');
    expect(grid.focusedCell).toEqual({ row: 5, col: 1 });
    expect(grid.nestedActiveCell(2)).toEqual({ row: 2, col: 2 });
  });

  it('keeps the stripes of the rows when a detail opens between them', async () => {
    const grid = mountStaff({ props: { striped: true } });
    await grid.settle();

    expect([0, 1, 2, 3].map((position) => grid.rowOdd(position))).toEqual([
      false,
      true,
      false,
      true,
    ]);

    await grid.toggleRow(0);

    expect([0, 1, 2, 3, 4].map((position) => grid.rowOdd(position))).toEqual([
      false,
      false,
      true,
      false,
      true,
    ]);
  });

  it('copies a block across a detail without the detail', async () => {
    clipboard = installClipboard({ api: 'granted' });
    const grid = mountStaff({ expanded: [1] });

    await grid.focusCell(1, 1);
    await grid.press('ArrowDown', { shift: true });
    await grid.press('ArrowDown', { shift: true });

    expect(grid.ranges).toEqual([{ from: { row: 1, col: 1 }, to: { row: 3, col: 1 } }]);
    await grid.press('c', { ctrl: true });
    await grid.settle();
    expect(clipboard.copies).toEqual(['Сотрудник 1\nСотрудник 2']);
  });

  it('sizes the row window by an estimate and then by the measured detail', async () => {
    const grid = mountStaff({ rows: staff(1000), auto: false, expanded: [1] });
    await grid.settle();

    expect(grid.rowCount).toBe(1003);
    expect(grid.renderedRows).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);

    expect(grid.windowFrame).toEqual({
      lead: '0px',
      rest: '39680px',
      clampStart: '-260px',
      clampEnd: '-260px',
    });

    await grid.measureRows({ 2: 250 });

    expect(grid.windowFrame).toEqual({
      lead: '0px',
      rest: '39680px',
      clampStart: '-350px',
      clampEnd: '-350px',
    });

    await grid.scrollToRow(999);
    expect(grid.scrollTop).toBe(40_030);
  });

  it('keeps the first visible row in place when a detail above it is measured', async () => {
    const grid = mountStaff({ rows: staff(1000), auto: false, expanded: [1] });
    await grid.scroll({ top: 400 });

    expect(grid.renderedRows).toContain(2);
    await grid.measureRows({ 2: 250 });
    expect(grid.scrollTop).toBe(490);
    await grid.measureRows({ 2: 250 });
    expect(grid.scrollTop).toBe(490);
  });

  it('keeps the details off the page slots so a page holds the same rows', async () => {
    const grid = mountStaff({
      rows: staff(12),
      pageSize: 5,
      props: { pagination: true },
      expanded: [1, 7],
    });

    await grid.settle();

    expect(grid.rangeText).toBe('1–5 из 12');
    expect(grid.renderedRows).toEqual([0, 1, 2, 3, 4, 5]);
    expect(grid.details).toEqual([2]);
    expect(grid.cellText(5, 1)).toBe('Сотрудник 4');
    await grid.nextPage();

    expect(grid.rangeText).toBe('6–10 из 12');
    expect(grid.cellText(0, 1)).toBe('Сотрудник 5');
    expect(grid.details).toEqual([3]);
    expect(grid.detailText(3)).toBe('Досье: Сотрудник 7');
    expect(grid.renderedRows).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('opens a detail under a row that came from a source', async () => {
    const remote = new RemoteStaff(1000);

    const grid = mountStaff({
      rows: [],
      auto: false,
      width: 1200,
      props: { source: remote.source },
    });

    await grid.settle();
    remote.answer();
    await flushPromises();
    await grid.toggleRow(1);

    expect(grid.expanded).toEqual([1]);
    expect(grid.details).toEqual([2]);
    expect(grid.detailText(2)).toBe('Досье: Сотрудник 1');
    expect(grid.cellText(3, 1)).toBe('Сотрудник 2');
    expect(grid.rowCount).toBe(1003);
    expect(remote.requests).toHaveLength(1);
  });

  it('drags a row past an open detail and keeps a row over its own detail in place', async () => {
    const rows = staff(6);
    const grid = mountStaff({ rows, props: { rowDrag: true }, expanded: [0] });
    await grid.settle();

    expect(grid.details).toEqual([1]);
    await grid.grabRow(3);
    await grid.moveRowTo(2, 'before');
    await grid.dropRow();

    expect(grid.reorders).toEqual([
      { row: rows[2], from: 2, to: 1, parent: undefined, toParent: undefined },
    ]);

    await grid.grabRow(0);
    await grid.moveRowTo(1, 'after');
    await grid.dropRow();
    expect(grid.reorders).toHaveLength(1);
  });

  it('turns details off for tree rows', async () => {
    const grid = mountStaff({ props: { getChildren: () => undefined }, expanded: [1] });
    await grid.settle();

    expect(grid.details).toEqual([]);
    expect(grid.rowExpanded(1)).toBeUndefined();
  });
});
