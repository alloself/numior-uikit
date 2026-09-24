import { describe, expect, it } from 'vitest';
import { h } from 'vue';
import { NuiChip } from '../src';
import { pageSlice } from '../src/table/page';
import { selectionStateOf, toggleRows } from '../src/table/selection';
import { defaultCompare, nextSort } from '../src/table/sort';
import { TableDriver } from './drivers/table';
import { COLUMNS, isPerson, manyPeople, PEOPLE } from './support/rows';

const names = (people: readonly { readonly name: string }[]): string[] =>
  people.map((person) => person.name);
const idOf = (person: (typeof PEOPLE)[number]): string => String(person.id);

describe('NuiTable', () => {
  it('renders a native table with caption, scoped headers, alignment and cell slots', () => {
    const table = TableDriver.mount({
      props: { caption: 'Команда', striped: true, hoverable: true, stickyHeader: true, size: 'sm' },
      slots: {
        'cell-role': ({ value }) =>
          h(NuiChip, { size: 'sm' }, () => (typeof value === 'string' ? value : '')),
        'header-age': ({ column }) =>
          `${typeof column === 'object' && column && 'label' in column ? String(column.label) : ''}, лет`,
      },
    });
    expect(table.captionText).toBe('Команда');
    expect(table.headers).toEqual(['Имя', 'Роль', 'Возраст, лет', 'Балл']);
    expect(table.wrapper.findAll('thead th[scope="col"]')).toHaveLength(4);
    expect(table.table.attributes('role')).toBeUndefined();
    expect(table.hasModifier('striped')).toBe(true);
    expect(table.hasModifier('hoverable')).toBe(true);
    expect(table.hasModifier('sticky-header')).toBe(true);
    expect(table.hasModifier('size-sm')).toBe(true);
    expect(table.renderedRowCount).toBe(12);
    expect(table.cellHtml('Анна', 'Роль')).toContain('nui-chip');
    expect(table.cellText('Анна', 'Роль')).toBe('Дизайн');
    expect(table.cellText('Борис', 'Балл')).toBe('');
    expect(table.wrapper.findAll('.nui-table__cell--align-end').length).toBeGreaterThan(0);
    expect(table.wrapper.find('thead th[style]').attributes('style')).toContain(
      'inline-size: 6rem',
    );
    table.unmount();
  });

  it('cycles sorting through ascending, descending and off with matching aria-sort', async () => {
    const table = TableDriver.mount();
    expect(table.ariaSort('Возраст')).toBeUndefined();
    await table.clickHeader('Возраст');
    expect(table.sort).toEqual({ key: 'age', direction: 'asc' });
    expect(table.ariaSort('Возраст')).toBe('ascending');
    expect(table.columnTexts('Возраст').slice(0, 3)).toEqual(['23', '27', '28']);
    await table.clickHeader('Возраст');
    expect(table.ariaSort('Возраст')).toBe('descending');
    expect(table.columnTexts('Возраст').slice(0, 2)).toEqual(['52', '48']);
    await table.clickHeader('Возраст');
    expect(table.sort).toBeNull();
    expect(table.columnTexts('Имя').slice(0, 2)).toEqual(['Анна', 'Борис']);
    await table.clickHeader('Балл');
    expect(table.columnTexts('Балл').slice(-2)).toEqual(['', '']);
    await table.clickHeader('Имя');
    expect(table.sort).toEqual({ key: 'name', direction: 'asc' });
    expect(table.columnTexts('Имя').slice(0, 2)).toEqual(['Анна', 'Борис']);
    table.unmount();
    const custom = TableDriver.mount({
      columns: [
        {
          key: 'name',
          label: 'Имя',
          sortable: true,
          sort: (a, b) => (isPerson(a) && isPerson(b) ? a.name.length - b.name.length : 0),
        },
      ],
    });
    await custom.clickHeader('Имя');
    expect(custom.columnTexts('Имя').slice(0, 2)).toEqual(['Зоя', 'Лев']);
    custom.unmount();
    const remote = TableDriver.mount({ props: { remote: true, total: 120 } });
    await remote.clickHeader('Возраст');
    expect(remote.sort).toEqual({ key: 'age', direction: 'asc' });
    expect(remote.columnTexts('Имя').slice(0, 2)).toEqual(['Анна', 'Борис']);
    remote.unmount();
  });

  it('selects rows through checkboxes with a tri-state header and keeps row clicks separate', async () => {
    const table = TableDriver.mount({
      props: { selectable: 'multiple', pagination: true },
      pageSize: 5,
    });
    expect(table.hasModifier('selectable')).toBe(true);
    expect(table.wrapper.find('thead input').attributes('aria-label')).toBe('Select all rows');
    expect(table.wrapper.find('tbody input').attributes('aria-label')).toBe('Select row');
    await table.toggleAll();
    expect(table.selectedNames).toEqual(['Анна', 'Борис', 'Вера', 'Глеб', 'Дина']);
    expect(table.headerCheckbox).toEqual({ checked: true, indeterminate: false });
    await table.toggleRow('Вера');
    expect(table.selectedNames).toEqual(['Анна', 'Борис', 'Глеб', 'Дина']);
    expect(table.headerCheckbox).toEqual({ checked: false, indeterminate: true });
    expect(table.rowSelected('Вера')).toBe('false');
    expect(table.rowSelected('Анна')).toBe('true');
    await table.toggleAll();
    expect(table.selectedNames).toEqual(['Анна', 'Борис', 'Глеб', 'Дина', 'Вера']);
    await table.toggleAll();
    expect(table.selectedNames).toEqual([]);
    await table.clickRow('Глеб');
    expect(table.clicks).toEqual(['Глеб']);
    await table.toggleRow('Глеб');
    expect(table.clicks).toEqual(['Глеб']);
    expect(table.rowChecked('Глеб')).toBe(true);
    table.unmount();
    const single = TableDriver.mount({ props: { selectable: 'single' } });
    expect(single.wrapper.find('thead input').exists()).toBe(false);
    await single.toggleRow('Анна');
    await single.toggleRow('Вера');
    expect(single.selectedNames).toEqual(['Вера']);
    single.unmount();
  });

  it('paginates locally with the footer, clamps the page and lets pagination win over virtual rows', async () => {
    const table = TableDriver.mount({
      props: { pagination: { pageSizes: [5, 10] }, virtual: true, height: '10rem' },
      pageSize: 5,
    });
    expect(table.renderedRowCount).toBe(5);
    expect(table.rangeText).toBe('1–5 of 12');
    expect(table.hasModifier('virtual')).toBe(false);
    expect(table.spacers).toEqual([]);
    await table.nextPage();
    expect(table.page).toBe(2);
    expect(table.columnTexts('Имя')[0]).toBe('Егор');
    await table.nextPage();
    expect(table.page).toBe(3);
    expect(table.renderedRowCount).toBe(2);
    await table.choosePageSize(10);
    expect(table.pageSize).toBe(10);
    expect(table.page).toBe(2);
    expect(table.renderedRowCount).toBe(2);
    table.unmount();
  });

  it('shows skeleton rows while loading, a custom loading slot and the empty state', async () => {
    const table = TableDriver.mount({
      props: { loading: true, loadingRows: 3, selectable: 'multiple' },
    });
    expect(table.busy).toBe(true);
    expect(table.hasModifier('loading')).toBe(true);
    expect(table.skeletonRows).toBe(3);
    expect(table.renderedRowCount).toBe(0);
    expect(table.wrapper.find('thead input').attributes('disabled')).toBeDefined();
    await table.receive({ loading: false });
    expect(table.busy).toBe(false);
    expect(table.renderedRowCount).toBe(12);
    await table.receiveRows([]);
    expect(table.statusText).toBe('No data');
    expect(table.wrapper.find('.nui-empty').exists()).toBe(true);
    table.unmount();
    const custom = TableDriver.mount({
      rows: [],
      props: { loading: true, emptyLabel: 'Пусто' },
      slots: { loading: () => 'Загружаем…', empty: () => 'Совсем пусто' },
    });
    expect(custom.statusText).toBe('Загружаем…');
    await custom.receive({ loading: false });
    expect(custom.statusText).toBe('Совсем пусто');
    custom.unmount();
  });

  it('windows long tables with spacer rows and aria-rowcount', async () => {
    const table = TableDriver.mount({
      rows: manyPeople(5000),
      props: { virtual: true, height: '200px', rowHeight: 40 },
    });
    expect(table.hasModifier('virtual')).toBe(true);
    expect(table.ariaRowCount).toBe('5001');
    await table.setHeight(200);
    expect(table.renderedRowCount).toBe(10);
    expect(table.spacers).toEqual([`${(5000 - 10) * 40}px`]);
    expect(table.wrapper.find('tbody .nui-table__row').attributes('aria-rowindex')).toBe('2');
    await table.scrollTo(100_000);
    expect(table.columnTexts('Имя')[0]).toBe('Сотрудник 2497');
    expect(table.spacers).toEqual([`${2496 * 40}px`, `${(5000 - 2510) * 40}px`]);
    await table.scrollTo(199_800);
    expect(table.columnTexts('Имя').at(-1)).toBe('Сотрудник 5000');
    expect(table.spacers).toEqual([`${4991 * 40}px`]);
    table.unmount();
  });
});

describe('table helpers', () => {
  it('compares mixed values with nullish last and cycles sort state', () => {
    expect(defaultCompare(1, 2)).toBeLessThan(0);
    expect(defaultCompare('10', '9')).toBeGreaterThan(0);
    expect(defaultCompare('б', 'а')).toBeGreaterThan(0);
    expect(defaultCompare(null, 0)).toBeGreaterThan(0);
    expect(defaultCompare(undefined, null)).toBe(0);
    expect(defaultCompare(new Date('2020-01-01'), new Date('2021-01-01'))).toBeLessThan(0);
    expect(defaultCompare(true, false)).toBeGreaterThan(0);
    expect(nextSort(null, 'a')).toEqual({ key: 'a', direction: 'asc' });
    expect(nextSort({ key: 'a', direction: 'asc' }, 'a')).toEqual({ key: 'a', direction: 'desc' });
    expect(nextSort({ key: 'a', direction: 'desc' }, 'a')).toBeNull();
    expect(nextSort({ key: 'a', direction: 'desc' }, 'b')).toEqual({ key: 'b', direction: 'asc' });
  });

  it('slices pages within bounds and toggles visible rows as a set', () => {
    expect(names(pageSlice(PEOPLE, 3, 5))).toEqual(['Лев', 'Мария']);
    expect(names(pageSlice(PEOPLE, 9, 5))).toEqual(['Лев', 'Мария']);
    expect(names(pageSlice(PEOPLE, 0, 0))).toEqual(['Анна']);
    const visible = PEOPLE.slice(0, 3);
    const all = toggleRows(PEOPLE.slice(5, 6), visible, idOf);
    expect(names(all)).toEqual(['Егор', 'Анна', 'Борис', 'Вера']);
    expect(selectionStateOf(new Set(all.map(idOf)), visible, idOf)).toBe('checked');
    expect(names(toggleRows(all, visible, idOf))).toEqual(['Егор']);
    expect(selectionStateOf(new Set(['1']), visible, idOf)).toBe('indeterminate');
    expect(selectionStateOf(new Set(), [], idOf)).toBe('unchecked');
    expect(COLUMNS).toHaveLength(4);
  });
});
