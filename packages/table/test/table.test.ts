import { afterEach, describe, expect, it } from 'vitest';
import { h } from 'vue';
import { TableDriver } from './drivers/table';
import { people, PEOPLE_COLUMNS, type Person } from './support/people';

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from }, (_, offset) => from + offset);

const mounted: Array<{ unmount(): void }> = [];

const mountPeople = (
  options: Partial<Parameters<typeof TableDriver.mount<Person>>[0]> = {},
): TableDriver<Person> => {
  const grid = TableDriver.mount<Person>({
    columns: PEOPLE_COLUMNS,
    rows: people(1000),
    config: { locale: 'ru-RU' },
    ...options,
  });

  mounted.push(grid);
  return grid;
};

const ruNumber = (value: number): string => new Intl.NumberFormat('ru-RU').format(value);

const ruDate = (date: Date): string =>
  new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeZone: 'UTC' }).format(date);

afterEach(() => {
  for (const grid of mounted.splice(0)) {
    grid.unmount();
  }
});

describe('NuiTable', () => {
  it('renders the header, a window of rows and columns, pinned panes and formatted cells', async () => {
    const grid = mountPeople();
    await grid.settle();

    expect(grid.label).toBe('Таблица данных');
    expect(grid.rowCount).toBe(1001);
    expect(grid.colCount).toBe(18);
    expect(grid.renderedRows).toEqual(range(0, 13));

    expect(grid.headerTexts).toEqual([
      'ID',
      'Имя',
      'Город',
      'Оклад',
      'Нанят',
      'Удалённо',
      'Команда',
    ]);

    expect(grid.paneOf(0, 0)).toBe('start');
    expect(grid.paneOf(0, 1)).toBe('centre');
    expect(grid.paneOf(0, 17)).toBe('end');
    expect(grid.cellText(5, 1)).toBe('Сотрудник 5');
    expect(grid.cellText(5, 3)).toBe(ruNumber(1_000_000 + 5 * 1234.5));
    expect(grid.cellText(4, 3)).toBe('');
    expect(grid.cellText(5, 4)).toBe(ruDate(new Date(Date.UTC(2020, 5, 6))));
    expect(grid.cellText(6, 4)).toBe('');
    expect(grid.cellText(0, 5)).toBe('Да');
    expect(grid.cellText(1, 5)).toBe('Нет');
    expect(grid.cellText(2, 5)).toBe('');
    expect(grid.cellText(2, 2)).toBe('');
    expect(grid.cellText(5, 17)).toBe('Дизайн');

    expect(grid.windowFrame).toEqual({
      lead: '0px',
      rest: '39480px',
      clampStart: '-260px',
      clampEnd: '-260px',
    });

    expect(grid.activeCell).toEqual({ row: 0, col: 0 });
  });

  it('moves the row and column windows with the scroll and keeps the pinned cells and the active row', async () => {
    const grid = mountPeople();
    await grid.scroll({ top: 4000 });

    expect(grid.renderedRows).toEqual([0, ...range(94, 113)]);

    expect(grid.windowFrame).toEqual({
      lead: '3720px',
      rest: '35480px',
      clampStart: '-540px',
      clampEnd: '-500px',
    });

    const before = grid.rowElements;

    await grid.scroll({ top: 4080 });
    expect(grid.renderedRows).toEqual([0, ...range(96, 115)]);
    expect(grid.rowElements.every((row) => before.includes(row))).toBe(true);

    expect(grid.windowFrame).toEqual({
      lead: '3800px',
      rest: '35400px',
      clampStart: '-540px',
      clampEnd: '-500px',
    });

    await grid.scroll({ left: 1000 });

    expect(grid.headerTexts).toEqual([
      'ID',
      'Заметка',
      'M1',
      'M2',
      'M3',
      'M4',
      'M5',
      'M6',
      'M7',
      'Команда',
    ]);

    expect(grid.cellText(100, 0)).toBe('100');
    expect(grid.cellText(100, 9)).toBe(ruNumber(1002));
    expect(grid.cellText(100, 17)).toBe('Данные');
    await grid.scrollToRow(500);
    expect(grid.scrollTop).toBe(20_000);
    expect(grid.renderedRows).toContain(500);
    await grid.scrollToColumn('m5');
    expect(grid.scrollLeft).toBe(1260);
  });

  it('walks the cells with the keyboard, keeps a roving tab stop and scrolls the target into view', async () => {
    const grid = mountPeople();
    await grid.focusCell(0, 1);
    expect(grid.activeCell).toEqual({ row: 0, col: 1 });
    await grid.press('ArrowRight');
    expect(grid.focusedCell).toEqual({ row: 0, col: 2 });
    await grid.press('ArrowUp');
    expect(grid.focusedCell).toEqual({ row: -1, col: 2 });
    await grid.press('ArrowUp');
    expect(grid.focusedCell).toEqual({ row: -1, col: 2 });
    await grid.press('ArrowDown');
    await grid.press('End');
    expect(grid.focusedCell).toEqual({ row: 0, col: 17 });
    await grid.press('Home');
    expect(grid.focusedCell).toEqual({ row: 0, col: 0 });
    await grid.press('PageDown');
    expect(grid.focusedCell).toEqual({ row: 6, col: 0 });
    await grid.press('PageUp');
    expect(grid.focusedCell).toEqual({ row: 0, col: 0 });
    await grid.press('End', { ctrl: true });
    expect(grid.focusedCell).toEqual({ row: 999, col: 17 });
    expect(grid.scrollTop).toBe(1000 * 40 - 260);
    expect(grid.renderedRows).toContain(999);
    await grid.press('Home', { ctrl: true });
    expect(grid.focusedCell).toEqual({ row: 0, col: 0 });
    expect(grid.scrollTop).toBe(0);
    await grid.press('ArrowDown', { shift: true });
    expect(grid.focusedCell).toEqual({ row: 0, col: 0 });
  });

  it('reveals a column that leaves the window and mirrors the horizontal keys in RTL', async () => {
    const grid = mountPeople();
    await grid.focusCell(0, 1);

    for (let step = 0; step < 6; step += 1) {
      await grid.press('ArrowRight');
    }
    expect(grid.focusedCell).toEqual({ row: 0, col: 7 });
    expect(grid.scrollLeft).toBe(660);
    grid.unmount();

    const mirrored = mountPeople({ dir: 'rtl' });
    await mirrored.focusCell(0, 1);

    for (let step = 0; step < 6; step += 1) {
      await mirrored.press('ArrowLeft');
    }
    expect(mirrored.focusedCell).toEqual({ row: 0, col: 7 });
    expect(mirrored.scrollLeft).toBe(-660);
    await mirrored.press('ArrowRight');
    expect(mirrored.focusedCell).toEqual({ row: 0, col: 6 });
  });

  it('keeps the active cell mounted while scrolled away and follows focus from a click', async () => {
    const grid = mountPeople();
    await grid.focusCell(2, 3);

    const cell = grid.activeCellElement;

    await grid.scroll({ top: 20_000 });
    expect(grid.renderedRows).toContain(2);
    expect(grid.activeCell).toEqual({ row: 2, col: 3 });
    expect(grid.activeCellElement).toBe(cell);
    expect(document.activeElement).toBe(cell);
    expect(grid.windowFrame?.lead).toBe('19720px');
    await grid.focusCell(505, 0);
    expect(grid.activeCell).toEqual({ row: 505, col: 0 });
    expect(grid.renderedRows).not.toContain(2);
  });

  it('renders custom cells and headers through slots and an empty state that follows the rows', async () => {
    const grid = mountPeople({
      slots: {
        'cell-name': ({ text }: { text: string }) => [h('strong', text.toUpperCase())],
        'header-salary': ({ column }: { column: { label: string } }) => [h('em', column.label)],
      },
    });

    await grid.settle();
    expect(grid.cellHtml(3, 1)).toBe('<strong>СОТРУДНИК 3</strong>');
    expect(grid.headerTexts[3]).toBe('Оклад');
    await grid.focusCell(10, 2);
    await grid.setSource(people(3));
    expect(grid.rowCount).toBe(4);
    expect(grid.activeCell).toEqual({ row: 2, col: 2 });
    await grid.setSource([]);
    expect(grid.rowCount).toBe(1);
    expect(grid.emptyText).toBe('Нет строк для показа');
    expect(grid.activeCell).toEqual({ row: -1, col: 2 });

    const custom = mountPeople({ rows: [], props: { emptyLabel: 'Пусто', label: 'Сотрудники' } });
    await custom.settle();
    expect(custom.emptyText).toBe('Пусто');
    expect(custom.label).toBe('Сотрудники');
  });

  it('grows with its rows without a height, wraps marked body cells and pages by the window', async () => {
    const grid = mountPeople({
      auto: true,
      rows: people(12),
      columns: PEOPLE_COLUMNS.map((column) =>
        column.key === 'note' ? { ...column, wrap: true } : column,
      ),
    });

    await grid.settle();
    expect(grid.auto).toBe(true);
    expect(grid.rowCount).toBe(13);
    expect(grid.renderedRows).toEqual(range(0, 12));
    expect(grid.windowFrame).toBeUndefined();
    expect(grid.headerTexts).toHaveLength(18);
    expect(grid.cellWraps(0, 6)).toBe(true);
    expect(grid.cellWraps(0, 1)).toBe(false);
    expect(grid.cellWraps(-1, 6)).toBe(false);
    await grid.focusCell(0, 0);
    await grid.press('PageDown');
    expect(grid.focusedCell).toEqual({ row: 11, col: 0 });
  });
});
