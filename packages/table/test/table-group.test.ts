import { flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { installClipboard, type ClipboardStub } from '../../primitives/test/support/clipboard';
import type { NuiTableColumn } from '../src';
import BoldTotal from './fixtures/BoldTotal.vue';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { people, PEOPLE_COLUMNS, type Person } from './support/people';

const mounted: Array<{ unmount(): void }> = [];

let clipboard: ClipboardStub | undefined;

const TOTALS_COLUMNS: readonly NuiTableColumn<Person>[] = PEOPLE_COLUMNS.map((column) => {
  if (column.type !== 'number') {
    return column;
  }
  switch (column.key) {
    case 'id':
      return { ...column, aggregate: 'count' };
    case 'm1':
      return { ...column, aggregate: 'sum' };
    default:
      return column;
  }
});

const SUM_COLUMNS: readonly NuiTableColumn<Person>[] = PEOPLE_COLUMNS.map((column) =>
  column.key === 'm1' && column.type === 'number' ? { ...column, aggregate: 'sum' } : column,
);

const mountPeople = (options: Partial<TableMountOptions<Person>> = {}): TableDriver<Person> => {
  const grid = TableDriver.mount<Person>({
    columns: TOTALS_COLUMNS,
    rows: people(1000),
    config: { locale: 'ru-RU' },
    width: 2400,
    ...options,
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

describe('NuiTable groups and totals', () => {
  it('groups rows into collapsed rows with counts and aggregates inside a treegrid', async () => {
    const grid = mountPeople({ groupBy: ['team'] });
    await grid.settle();

    expect(grid.role).toBe('treegrid');
    expect(grid.rowCount).toBe(5);
    expect(grid.groupLabel(0)).toBe('Данные (333)');
    expect(grid.groupLabel(1)).toBe('Дизайн (333)');
    expect(grid.groupLabel(2)).toBe('Платформа (334)');
    expect(grid.rowLevel(0)).toBe('1');
    expect(grid.rowExpanded(0)).toBe('false');
    expect(grid.cellText(0, 0)).toBe('333');
    expect(grid.cellText(0, 7)).toBe('1\u00a0661\u00a0670');
    expect(grid.cellText(0, 17)).toBe('');
    expect(grid.cellText(3, 0)).toBe('1\u00a0000');
    expect(grid.cellText(3, 1)).toBe('Итого1\u00a0000 строк');
    expect(grid.cellText(3, 7)).toBe('4\u00a0995\u00a0000');
  });

  it('starts the label in the first column without a total and carries it over the empty cells up to the next total', async () => {
    const grid = mountPeople({ groupBy: ['team'] });
    await grid.settle();

    expect(grid.groupLabelColumn(0)).toBe(1);
    expect(grid.groupCopies(0)).toEqual([2, 3, 4, 5, 6]);
    expect(grid.cellPaint(0, 1)).toEqual({ spill: '0px', room: '860px', align: 'start' });
    expect(grid.cellMarks(0, 1)).toEqual(['spill', 'seamless']);
    expect(grid.cellPaint(0, 4)).toEqual({ spill: '-420px', room: '860px', align: 'start' });
    expect(grid.cellMarks(0, 6)).toEqual(['spill']);
    expect(grid.cellMarks(0, 7)).toEqual([]);
    expect(grid.groupLevel(0)).toBe('0');

    await grid.dragResizer(2, 40);
    expect(grid.cellPaint(0, 1)).toEqual({ spill: '0px', room: '900px', align: 'start' });
    expect(grid.cellPaint(0, 4)).toEqual({ spill: '-460px', room: '900px', align: 'start' });

    await grid.focusCell(-1, 6);
    await grid.press('ArrowRight', { alt: true, shift: true });
    expect(grid.columnOrder.slice(5, 8)).toEqual(['remote', 'm1', 'note']);
    expect(grid.groupCopies(0)).toEqual([2, 3, 4, 5]);
    expect(grid.cellMarks(0, 7)).toEqual([]);

    await grid.toggleGroupAt(0, 4);
    expect(grid.expanded).toEqual(['["Данные"]']);
    expect(grid.announcement).toBe('Группа «Данные» развёрнута');
  });

  it('keeps the label inside a pinned first column, follows hidden columns and row headers', async () => {
    const pinned = mountPeople({ columns: SUM_COLUMNS, groupBy: ['team'] });
    await pinned.settle();

    expect(pinned.groupLabelColumn(0)).toBe(0);
    expect(pinned.groupCopies(0)).toEqual([]);
    expect(pinned.cellPaint(0, 0)).toEqual({ align: 'start' });
    expect(pinned.cellText(0, 1)).toBe('');

    const hidden = mountPeople({ groupBy: ['team'], hidden: ['name'] });
    await hidden.settle();

    expect(hidden.groupLabelColumn(0)).toBe(1);
    expect(hidden.groupCopies(0)).toEqual([2, 3, 4, 5]);

    const headed = mountPeople({
      columns: SUM_COLUMNS,
      groupBy: ['team'],
      pins: { id: null },
      props: { rowHeaders: true },
    });

    await headed.settle();

    expect(headed.cellText(0, 0)).toBe('');
    expect(headed.groupLabelColumn(0)).toBe(1);
    expect(headed.groupCopies(0)).toEqual([2, 3, 4, 5, 6, 7]);
  });

  it('indents nested labels by level and puts the label at the start of a right to left row', async () => {
    const grid = mountPeople({
      groupBy: ['team', 'city'],
      expanded: ['["Данные"]'],
      dir: 'rtl',
    });

    await grid.settle();

    expect(grid.groupLabel(1)).toBe('Ереван (83)');
    expect(grid.groupLevel(0)).toBe('0');
    expect(grid.groupLevel(1)).toBe('1');
    expect(grid.groupLabelColumn(1)).toBe(1);
    expect(grid.groupCopies(1)).toEqual([2, 3, 4, 5, 6]);
    expect(grid.cellPaint(1, 3)).toEqual({ spill: '-300px', room: '860px', align: 'start' });
  });

  it('copies only the data rows of a range that crosses a group row', async () => {
    clipboard = installClipboard({ api: 'granted' });

    const grid = mountPeople({
      groupBy: ['team'],
      expanded: ['["Данные"]'],
      props: { cellSelection: true },
    });

    await grid.settle();
    await grid.dragRange({ row: 2, col: 2 }, { row: 0, col: 1 });
    expect(grid.ranges).toEqual([{ from: { row: 2, col: 2 }, to: { row: 0, col: 1 } }]);

    await grid.press('c', { ctrl: true });
    await flushPromises();

    expect(clipboard.copies).toEqual(['Сотрудник 1\tКазань\nСотрудник 4\tМосква']);
  });

  it('expands groups by click and keys, keeps their ids in the model and announces them', async () => {
    const grid = mountPeople({ groupBy: ['team'] });
    await grid.toggleGroup(0);

    expect(grid.expanded).toEqual(['["Данные"]']);
    expect(grid.rowCount).toBe(338);
    expect(grid.rowExpanded(0)).toBe('true');
    expect(grid.rowLevel(1)).toBe('2');
    expect(grid.rowExpanded(1)).toBeUndefined();
    expect(grid.cellText(1, 1)).toBe('Сотрудник 1');
    expect(grid.announcement).toBe('Группа «Данные» развёрнута');

    await grid.focusCell(0, 3);
    await grid.press('Enter');

    expect(grid.expanded).toEqual([]);
    expect(grid.rowCount).toBe(5);
    expect(grid.announcement).toBe('Группа «Данные» свёрнута');

    await grid.press('ArrowDown');
    await grid.press(' ');
    expect(grid.expanded).toEqual(['["Дизайн"]']);
    expect(grid.rowCount).toBe(338);
    expect(grid.groupLabel(2)).toBeUndefined();
    expect(grid.cellText(2, 1)).toBe('Сотрудник 2');
  });

  it('nests two levels from the expanded model and sorts rows inside their group', async () => {
    const grid = mountPeople({
      groupBy: ['team', 'city'],
      expanded: ['["Данные"]', '["Данные","Казань"]'],
      sort: [{ key: 'id', direction: 'desc' }],
    });

    await grid.settle();

    expect(grid.rowCount).toBe(93);
    expect(grid.groupLabel(1)).toBe('Ереван (83)');
    expect(grid.groupLabel(2)).toBe('Казань (84)');
    expect(grid.rowLevel(2)).toBe('2');
    expect(grid.rowLevel(3)).toBe('3');
    expect(grid.cellText(3, 0)).toBe('997');
    expect(grid.cellText(4, 0)).toBe('985');

    await grid.scrollToRow(80);
    expect(grid.groupLabel(87)).toBe('Москва (83)');
    expect(grid.groupLabel(88)).toBe('(пусто) (83)');
    expect(grid.groupLabel(89)).toBe('Дизайн (333)');
  });

  it('regroups from the model by a boolean column and returns to a flat grid', async () => {
    const grid = mountPeople();
    await grid.settle();

    expect(grid.role).toBe('grid');

    await grid.setGroupBy(['remote']);
    expect(grid.role).toBe('treegrid');
    expect(grid.rowCount).toBe(5);
    expect(grid.groupLabel(0)).toBe('Нет (333)');
    expect(grid.groupLabel(1)).toBe('Да (334)');
    expect(grid.groupLabel(2)).toBe('(пусто) (333)');

    await grid.setGroupBy([]);

    expect(grid.role).toBe('grid');
    expect(grid.rowCount).toBe(1002);
    expect(grid.rowLevel(0)).toBeUndefined();
  });

  it('moves into the totals row with the keyboard and fills it through slots and the label', async () => {
    const grid = mountPeople({
      props: { totalsLabel: 'Всего' },
      slots: { 'footer-m1': BoldTotal },
    });

    await grid.nextPaint();
    expect(grid.role).toBe('grid');
    expect(grid.rowCount).toBe(1002);
    expect(grid.cellText(1000, 1)).toBe('Всего1\u00a0000 строк');
    expect(grid.cellHtml(1000, 7)).toContain('<b>4&nbsp;995&nbsp;000</b>');

    await grid.focusCell(0, 1);
    await grid.press('End', { ctrl: true });
    expect(grid.focusedCell).toEqual({ row: 1000, col: 17 });

    await grid.press('ArrowUp');
    expect(grid.focusedCell).toEqual({ row: 999, col: 17 });

    await grid.setQuick('Сотрудник 1');

    expect(grid.cellText(111, 0)).toBe('111');

    await grid.setSort([{ key: 'id', direction: 'desc' }]);
    expect(grid.cellText(111, 0)).toBe('111');

    await grid.scroll({ top: 0 });
    expect(grid.cellText(0, 0)).toBe('199');
  });

  it('fills the totals row after mounting instead of before the first paint', async () => {
    let reads = 0;

    const columns = TOTALS_COLUMNS.map((column): NuiTableColumn<Person> =>
      column.key === 'm1' && column.type === 'number'
        ? {
            ...column,
            value: (row) => {
              reads += 1;
              return column.value(row);
            },
          }
        : column,
    );

    const grid = mountPeople({ columns });

    expect(reads).toBeLessThan(1000);

    await grid.nextPaint();

    expect(reads).toBeGreaterThanOrEqual(1000);
    expect(grid.cellText(1000, 7)).toContain('4\u00a0995\u00a0000');
  });

  it('stops counting the totals once the table leaves the page', async () => {
    let reads = 0;

    const columns = TOTALS_COLUMNS.map((column): NuiTableColumn<Person> =>
      column.key === 'm1' && column.type === 'number'
        ? {
            ...column,
            value: (row) => {
              reads += 1;
              return column.value(row);
            },
          }
        : column,
    );

    const grid = TableDriver.mount<Person>({
      columns,
      rows: people(1000),
      config: { locale: 'ru-RU' },
      width: 2400,
    });

    grid.unmount();
    reads = 0;
    await grid.nextPaint();

    expect(reads).toBe(0);
  });
});
