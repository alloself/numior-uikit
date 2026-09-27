import { describe, expect, it } from 'vitest';
import { h } from 'vue';
import { NuiChip, type NuiTableColumn } from '../src';
import { pageSlice } from '../src/table/page';
import { selectionStateOf, toggleRows } from '../src/table/selection';
import { defaultCompare, nextSort } from '../src/table/sort';
import { TableDriver } from './drivers/table';
import {
  childrenOf,
  COLUMNS,
  expandableTeam,
  isPerson,
  manyPeople,
  newcomer,
  PEOPLE,
  TEAM,
  withChildren,
} from './support/rows';

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
    expect(table.colStyle('Возраст, лет')).toContain('inline-size: 6rem');
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

const withOptions = (
  overrides: Record<string, Partial<NuiTableColumn<unknown>>>,
): NuiTableColumn<unknown>[] => COLUMNS.map((column) => ({ ...column, ...overrides[column.key] }));

describe('NuiTable columns', () => {
  it('resizes columns from the keyboard and the pointer within bounds and exposes widths', async () => {
    const table = TableDriver.mount({
      columns: withOptions({ age: { resizable: true, width: 100, minWidth: 80, maxWidth: 300 } }),
      headerWidth: 100,
    });

    expect(table.fixedLayout).toBe(true);
    expect(table.colStyle('Имя')).toContain('inline-size: 100px');
    expect(table.resizer('Возраст').attributes('role')).toBe('separator');
    expect(table.resizer('Возраст').attributes('aria-valuenow')).toBe('100');
    expect(table.resizer('Имя').exists()).toBe(false);
    await table.pressResizer('Возраст', 'ArrowRight');
    expect(table.widths).toEqual({ age: 110 });
    await table.pressResizer('Возраст', 'ArrowRight', true);
    expect(table.widths).toEqual({ age: 160 });
    await table.pressResizer('Возраст', 'ArrowLeft');
    expect(table.widths).toEqual({ age: 150 });
    expect(table.colStyle('Возраст')).toContain('inline-size: 150px');
    expect(table.resizer('Возраст').attributes('aria-valuenow')).toBe('150');
    await table.pressResizer('Возраст', 'Enter');
    expect(table.widths).toEqual({});
    await table.dragResizer('Возраст', 200, 260);
    expect(table.widths).toEqual({ age: 160 });
    expect(table.headerClasses('Возраст')).not.toContain('nui-table__cell--resizing');
    await table.dragResizer('Возраст', 200, -500);
    expect(table.widths).toEqual({ age: 80 });
    await table.dragResizer('Возраст', 0, 900);
    expect(table.widths).toEqual({ age: 300 });
    table.unmount();
  });

  it('pins columns with offsets computed from their neighbours and marks the edges', () => {
    const table = TableDriver.mount({
      columns: withOptions({
        name: { sticky: 'start', width: 120 },
        score: { sticky: 'end', width: 80 },
        age: { sticky: 'end', width: 90 },
      }),
      props: { selectable: 'multiple' },
    });

    expect(table.cellClasses('Анна', 'Имя')).toEqual(
      expect.arrayContaining([
        'nui-table__cell--sticky',
        'nui-table__cell--sticky-start',
        'nui-table__cell--sticky-edge',
      ]),
    );

    expect(table.cellStyle('Анна', 'Имя')).toContain(
      'inset-inline-start: calc(1 * var(--_util) + var(--_sticky-0, 0px))',
    );

    expect(table.tableVar('--_sticky-0')).toBe('0px');

    expect(table.selectCellClasses('Анна')).toContain('nui-table__cell--sticky-start');
    expect(table.selectCellClasses('Анна')).not.toContain('nui-table__cell--sticky-edge');
    expect(table.headerClasses('Имя')).toContain('nui-table__cell--sticky-edge');
    expect(table.cellStyle('Анна', 'Балл')).toContain('inset-inline-end: var(--_sticky-3, 0px)');
    expect(table.tableVar('--_sticky-3')).toBe('0px');
    expect(table.cellStyle('Анна', 'Возраст')).toContain('inset-inline-end: var(--_sticky-2, 0px)');
    expect(table.tableVar('--_sticky-2')).toBe('80px');
    expect(table.cellClasses('Анна', 'Возраст')).toContain('nui-table__cell--sticky-edge');
    expect(table.cellClasses('Анна', 'Балл')).not.toContain('nui-table__cell--sticky-edge');
    expect(table.cellClasses('Анна', 'Роль')).toEqual(['nui-table__cell']);
    table.unmount();
    const plain = TableDriver.mount({ props: { selectable: 'multiple', rowDrag: true } });
    expect(plain.fixedLayout).toBe(false);

    expect(plain.selectCellClasses('Анна')).toEqual(
      expect.arrayContaining(['nui-table__cell--sticky-start', 'nui-table__cell--sticky-edge']),
    );

    expect(plain.selectCellStyle('Анна')).toContain(
      'inset-inline-start: calc(1 * var(--_util) + 0px)',
    );

    expect(plain.rowGrip('Анна').classes()).toContain('nui-table__grip');
    plain.unmount();
  });

  it('reorders columns from the keyboard with announcements and keeps pinned groups apart', async () => {
    const table = TableDriver.mount({
      columns: withOptions({
        name: { reorderable: true },
        role: { reorderable: true },
        age: { reorderable: true },
        score: { reorderable: true },
      }),
    });

    await table.pressGrip('Балл', ' ');
    expect(table.liveText).toContain('Балл grabbed, position 4 of 4');
    await table.pressGrip('Балл', 'ArrowLeft');
    expect(table.liveText).toContain('position 3 of 4');
    expect(table.columnOrder).toEqual([]);
    await table.pressGrip('Балл', ' ');
    expect(table.columnOrder).toEqual(['name', 'role', 'score', 'age']);
    expect(table.headers).toEqual(['Имя', 'Роль', 'Балл', 'Возраст']);
    expect(table.liveText).toContain('dropped at position 3 of 4');
    await table.pressGrip('Имя', 'Enter');
    await table.pressGrip('Имя', 'ArrowRight');
    await table.pressGrip('Имя', 'Escape');
    expect(table.liveText).toContain('cancelled');
    expect(table.columnOrder).toEqual(['name', 'role', 'score', 'age']);
    table.unmount();

    const pinned = TableDriver.mount({
      columns: withOptions({
        name: { reorderable: true, sticky: 'start' },
        role: { reorderable: true },
      }),
    });

    await pinned.pressGrip('Имя', ' ');
    await pinned.pressGrip('Имя', 'ArrowRight');
    expect(pinned.liveText).toContain('grabbed');
    await pinned.pressGrip('Имя', ' ');
    expect(pinned.columnOrder).toEqual([]);
    pinned.unmount();
  });

  it('reorders columns by dragging the grip only, while the label keeps sorting', async () => {
    const table = TableDriver.mount({
      columns: withOptions({
        name: { reorderable: true },
        role: { reorderable: true },
        age: { reorderable: true },
        score: { reorderable: true },
      }),
    });

    table.layoutHeaders(100);
    await table.dragColumn('Имя', 50, 53);
    expect(table.columnOrder).toEqual([]);
    await table.dragColumn('Имя', 50, 360, '.nui-table__label');
    expect(table.ghostText).toBeUndefined();
    expect(table.columnOrder).toEqual([]);
    await table.grabColumn('Имя', 50, 360);
    expect(table.ghostText).toBe('Имя');
    expect(table.hasModifier('dragging')).toBe(true);
    await table.dropAt(360, 0);
    expect(table.ghostText).toBeUndefined();
    expect(table.columnOrder).toEqual(['role', 'age', 'score', 'name']);
    expect(table.hasModifier('dragging')).toBe(false);
    await table.clickHeader('Имя');
    expect(table.sort).toEqual({ key: 'name', direction: 'asc' });
    table.unmount();
  });
});

describe('NuiTable rows', () => {
  it('renders tree rows with toggles, indentation, per-level sorting and lazy loading', async () => {
    const table = TableDriver.mount({
      rows: TEAM,
      props: { getChildren: childrenOf, isExpandable: expandableTeam },
    });

    expect(table.columnTexts('Имя')).toEqual(['Анна', 'Борис', 'Вера']);
    expect(table.toggleOf('Анна').attributes('aria-expanded')).toBe('false');
    expect(table.toggleOf('Борис').exists()).toBe(false);
    expect(table.levelOf('Анна')).toBe('0');
    await table.clickToggle('Анна');
    expect(table.expandedNames).toEqual(['Анна']);
    expect(table.columnTexts('Имя')).toEqual(['Анна', 'Айгуль', 'Артём', 'Борис', 'Вера']);
    expect(table.toggleOf('Анна').attributes('aria-expanded')).toBe('true');
    expect(table.levelOf('Айгуль')).toBe('1');
    await table.clickToggle('Артём');
    expect(table.columnTexts('Имя')).toEqual(['Анна', 'Айгуль', 'Артём', 'Ася', 'Борис', 'Вера']);
    expect(table.levelOf('Ася')).toBe('2');
    expect(table.clicks).toEqual([]);
    await table.clickHeader('Возраст');
    expect(table.columnTexts('Имя')).toEqual(['Борис', 'Анна', 'Айгуль', 'Артём', 'Ася', 'Вера']);
    await table.clickHeader('Возраст');
    await table.clickHeader('Возраст');
    await table.clickToggle('Вера');
    expect(table.loads).toEqual(['Вера']);
    expect(table.toggleBusy('Вера')).toBe(true);
    await table.receiveRows(withChildren(TEAM, 3, [newcomer]));
    expect(table.columnTexts('Имя')).toContain('Влад');
    expect(table.toggleBusy('Вера')).toBe(false);
    await table.clickToggle('Анна');
    expect(table.columnTexts('Имя')).toEqual(['Анна', 'Борис', 'Вера', 'Влад']);
    expect(table.expandedNames).toEqual(['Артём', 'Вера']);
    table.unmount();
  });

  it('pins rows in their own body that sorting and pages leave alone', async () => {
    const table = TableDriver.mount({
      props: { pinnedRows: PEOPLE.slice(0, 2), stickyHeader: true, pagination: true },
      pageSize: 5,
    });

    expect(table.pinnedNames).toEqual(['Анна', 'Борис']);
    expect(table.renderedRowCount).toBe(5);
    await table.clickHeader('Возраст');
    await table.clickHeader('Возраст');
    expect(table.pinnedNames).toEqual(['Анна', 'Борис']);
    expect(table.columnTexts('Имя')[0]).toBe('Жанна');
    table.unmount();
  });

  it('reorders rows with the grip among siblings, announces moves and refuses while sorted', async () => {
    const table = TableDriver.mount({
      rows: TEAM,
      expanded: TEAM.slice(0, 1),
      props: { rowDrag: true, getChildren: childrenOf },
    });

    expect(table.rowGrip('Анна').attributes('aria-label')).toBe('Reorder row');
    expect(table.headers).toEqual(['', 'Имя', 'Роль', 'Возраст', 'Балл']);
    await table.pressRowGrip('Борис', ' ');
    expect(table.liveText).toContain('Борис grabbed, position 2 of 3');
    await table.pressRowGrip('Борис', 'ArrowDown');
    expect(table.liveText).toContain('position 3 of 3');
    await table.pressRowGrip('Борис', ' ');
    expect(table.reorders).toEqual(['Борис:1->2@root']);
    await table.pressRowGrip('Айгуль', ' ');
    await table.pressRowGrip('Айгуль', 'ArrowUp');
    expect(table.liveText).toContain('Айгуль grabbed, position 1 of 2');
    await table.pressRowGrip('Айгуль', 'ArrowDown');
    expect(table.liveText).toContain('position 2 of 2');
    await table.pressRowGrip('Айгуль', ' ');
    expect(table.reorders).toEqual(['Борис:1->2@root', 'Айгуль:0->1@Анна']);
    await table.pressRowGrip('Вера', 'Enter');
    await table.pressRowGrip('Вера', 'Escape');
    expect(table.liveText).toContain('cancelled');
    await table.clickHeader('Возраст');
    expect(table.rowGrip('Анна').attributes('disabled')).toBeDefined();
    await table.pressRowGrip('Анна', ' ');
    expect(table.liveText).toContain('cancelled');
    table.unmount();
    const flat = TableDriver.mount({ props: { rowDrag: true } });
    flat.layoutRows(40);
    await flat.grabRow('Анна', 20, 110);
    expect(flat.ghostText).toBe('Анна');
    await flat.dropAt(0, 110);
    expect(flat.ghostText).toBeUndefined();
    expect(flat.reorders).toEqual(['Анна:0->2@root']);
    expect(flat.clicks).toEqual([]);
    flat.unmount();
  });
});

describe('NuiTable texts', () => {
  it('speaks the configured language for its controls and the empty state', () => {
    const table = TableDriver.mount({
      config: { locale: 'ru-RU' },
      rows: TEAM,
      expanded: TEAM.slice(0, 1),
      columns: withOptions({ score: { reorderable: true, resizable: true } }),
      props: { selectable: 'multiple', rowDrag: true, getChildren: childrenOf },
    });

    expect(table.selectAllLabel).toBe('Выбрать все строки');
    expect(table.selectLabelOf('Борис')).toBe('Выбрать строку');
    expect(table.reorderLabelOf('Балл')).toBe('Переставить колонку Балл');
    expect(table.resizeLabelOf('Балл')).toBe('Ширина колонки Балл');
    expect(table.expandLabelOf('Анна')).toBe('Развернуть строку');
    expect(table.dragLabelOf('Борис')).toBe('Переставить строку');
    table.unmount();

    const empty = TableDriver.mount({ config: { locale: 'ru-RU' }, rows: [] });
    expect(empty.statusText).toBe('Нет данных');
    empty.unmount();
  });

  it('announces column and row moves in the configured language unless announce is given', async () => {
    const table = TableDriver.mount({
      config: { locale: 'ru-RU' },
      rows: TEAM,
      columns: withOptions({ score: { reorderable: true } }),
      props: { rowDrag: true, getChildren: childrenOf },
    });

    await table.pressGrip('Балл', ' ');

    expect(table.liveText).toBe(
      'Колонка «Балл» взята, позиция 4 из 4. Стрелки перемещают, Пробел отпускает, Escape отменяет.',
    );

    await table.pressGrip('Балл', 'ArrowLeft');
    expect(table.liveText).toBe('Колонка «Балл»: позиция 3 из 4.');
    await table.pressGrip('Балл', 'Escape');
    expect(table.liveText).toBe('Колонка «Балл»: перемещение отменено.');
    await table.pressRowGrip('Борис', ' ');
    await table.pressRowGrip('Борис', 'ArrowUp');
    await table.pressRowGrip('Борис', ' ');
    expect(table.liveText).toBe('Строка «Борис» перемещена на позицию 1 из 3.');
    table.unmount();

    const custom = TableDriver.mount({
      config: { locale: 'ru-RU' },
      columns: withOptions({ score: { reorderable: true } }),
      props: { announce: ({ label, phase }) => `${label}: ${phase}` },
    });

    await custom.pressGrip('Балл', ' ');
    expect(custom.liveText).toBe('Балл: grabbed');
    custom.unmount();
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
    expect(selectionStateOf(new Set(all.map(idOf)), visible.map(idOf))).toBe('checked');
    expect(names(toggleRows(all, visible, idOf))).toEqual(['Егор']);
    expect(selectionStateOf(new Set(['1']), visible.map(idOf))).toBe('indeterminate');
    expect(selectionStateOf(new Set(['9']), visible.map(idOf))).toBe('unchecked');
    expect(selectionStateOf(new Set(), [])).toBe('unchecked');
    expect(COLUMNS).toHaveLength(4);
  });
});
