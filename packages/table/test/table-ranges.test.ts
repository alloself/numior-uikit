import { flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installClipboard, type ClipboardStub } from '../../primitives/test/support/clipboard';
import type { NuiTableContextScope } from '../src';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { people, PEOPLE_COLUMNS, type Person } from './support/people';

const mounted: TableDriver<Person>[] = [];
let clipboard: ClipboardStub | undefined;

const isBar = (target: Element): boolean => target.classList.contains('bar');

const mountPeople = (options: Partial<TableMountOptions<Person>> = {}): TableDriver<Person> => {
  const grid = TableDriver.mount<Person>({
    columns: PEOPLE_COLUMNS,
    rows: people(50),
    config: { locale: 'ru-RU' },
    width: 1600,
    ...options,
    props: { cellSelection: true, ...options.props },
  });

  mounted.push(grid);
  return grid;
};

const range = (top: number, start: number, bottom: number, end: number) => ({
  from: { row: top, col: start },
  to: { row: bottom, col: end },
});

afterEach(() => {
  vi.useRealTimers();
  clipboard?.restore();
  clipboard = undefined;

  for (const grid of mounted.splice(0)) {
    grid.unmount();
  }
});

describe('NuiTable cell ranges', () => {
  it('keeps text selection and the browser menu while cell selection is off', async () => {
    const grid = mountPeople({ props: { cellSelection: undefined } });
    await grid.settle();
    await grid.dragRange({ row: 1, col: 1 }, { row: 3, col: 2 });

    expect(grid.ranges).toEqual([]);
    expect(grid.rangeMarks(2, 1)).toEqual([]);
    expect(await grid.openCellMenu(2, 1)).toBe(false);
  });

  it('drags a range over the cells, marks its edges and keeps the row click to itself', async () => {
    const grid = mountPeople();
    await grid.settle();

    await grid.dragRange({ row: 1, col: 1 }, { row: 3, col: 2 });

    expect(grid.ranges).toEqual([range(1, 1, 3, 2)]);
    expect(grid.rangeMarks(1, 1)).toEqual(['selected', 'ranged', 'range-top', 'range-start']);
    expect(grid.rangeMarks(2, 2)).toEqual(['selected', 'ranged', 'range-end']);
    expect(grid.rangeMarks(3, 1)).toEqual(['selected', 'ranged', 'range-bottom', 'range-start']);
    expect(grid.rangeMarks(4, 1)).toEqual([]);
    expect(grid.announcement).toBe('Выделено строк: 3, колонок: 2');
    expect(grid.clicks).toEqual([]);
    await grid.clickCell(0, 3);
    expect(grid.ranges).toEqual([]);
    expect(grid.clicks).toEqual([people(50)[0]]);
  });

  it('extends from the active cell with Shift, adds rectangles with Ctrl and resets on a plain click', async () => {
    const grid = mountPeople();
    await grid.focusCell(1, 1);

    await grid.clickCell(4, 3, { shift: true });
    expect(grid.ranges).toEqual([range(1, 1, 4, 3)]);
    expect(grid.focusedCell).toEqual({ row: 4, col: 3 });
    await grid.clickCell(6, 2, { ctrl: true });
    expect(grid.ranges).toEqual([range(1, 1, 4, 3), range(6, 2, 6, 2)]);
    expect(grid.focusedCell).toEqual({ row: 6, col: 2 });
    expect(grid.clicks).toEqual([]);
    await grid.clickCell(2, 2);
    expect(grid.ranges).toEqual([]);
  });

  it('adds the rectangle from the last clicked cell with Shift and takes a selected cell out', async () => {
    const grid = mountPeople();
    await grid.clickCell(4, 1);

    await grid.clickCell(3, 1, { shift: true });
    await grid.clickCell(2, 1, { shift: true });
    await grid.clickCell(4, 1, { shift: true });
    expect(grid.ranges).toEqual([range(2, 1, 3, 1)]);
    await grid.clickCell(5, 1, { shift: true });
    expect(grid.ranges).toEqual([range(2, 1, 5, 1)]);
    expect(grid.focusedCell).toEqual({ row: 5, col: 1 });
    await grid.press('Escape');
    await grid.blur();
    await grid.clickCell(4, 2, { shift: true });
    await grid.clickCell(3, 2, { shift: true });
    await grid.clickCell(5, 2, { shift: true });
    expect(grid.ranges).toEqual([range(3, 2, 5, 2)]);
    await grid.clickCell(4, 2, { shift: true });
    expect(grid.ranges).toEqual([range(3, 2, 3, 2), range(5, 2, 5, 2)]);
    expect(grid.rangeMarks(4, 2)).toEqual([]);
    await grid.clickCell(4, 2, { shift: true });
    expect(grid.ranges).toEqual([range(3, 2, 5, 2)]);
    await grid.press('a', { ctrl: true });
    await grid.clickCell(6, 2, { shift: true });
    expect(grid.rangeMarks(6, 2)).toEqual([]);
    expect(grid.rangeMarks(7, 2)).toEqual(['selected', 'ranged', 'range-top']);
    expect(grid.focusedCell).toEqual({ row: 6, col: 2 });
    await grid.openCellMenu(8, 3);
    expect(grid.activeCell).toEqual({ row: 6, col: 2 });
    await grid.closeCellMenu();
    expect(grid.focusedCell).toEqual({ row: 6, col: 2 });
  });

  it('takes selected cells out with Ctrl and never selects a cell twice', async () => {
    const grid = mountPeople();
    await grid.focusCell(1, 1);

    await grid.press('a', { ctrl: true });
    await grid.clickCell(2, 3, { ctrl: true });

    expect(grid.ranges).toEqual([
      range(0, 0, 1, 17),
      range(2, 0, 2, 2),
      range(2, 4, 2, 17),
      range(3, 0, 49, 17),
    ]);

    expect(grid.rangeMarks(2, 3)).toEqual([]);
    expect(grid.rangeMarks(1, 3)).toEqual(['selected', 'ranged', 'range-bottom']);
    expect(grid.rangeMarks(2, 2)).toEqual(['selected', 'ranged', 'range-end']);
    expect(grid.focusedCell).toEqual({ row: 2, col: 3 });
    expect(grid.clicks).toEqual([]);
    await grid.clickCell(2, 3, { ctrl: true });
    expect(grid.rangeMarks(2, 3)).toEqual(['selected', 'ranged']);
    expect(grid.rangeMarks(1, 3)).toEqual(['selected', 'ranged']);
    await grid.press('Escape');
    await grid.dragRange({ row: 1, col: 1 }, { row: 3, col: 3 });
    await grid.dragRange({ row: 2, col: 1 }, { row: 3, col: 2 }, { ctrl: true });
    expect(grid.ranges).toEqual([range(1, 1, 1, 3), range(2, 3, 3, 3)]);
    await grid.clickCell(5, 2, { ctrl: true });
    await grid.press('ArrowUp', { shift: true, ctrl: true });

    expect(grid.ranges).toEqual([range(1, 1, 1, 1), range(1, 3, 3, 3), range(5, 2, 0, 2)]);

    await grid.press('ArrowDown', { shift: true, ctrl: true });
    expect(grid.ranges).toEqual([range(1, 1, 1, 3), range(2, 3, 3, 3), range(5, 2, 49, 2)]);
  });

  it('grows the range from the keyboard and selects rows, columns and everything', async () => {
    const grid = mountPeople();
    await grid.focusCell(2, 2);

    await grid.press('ArrowDown', { shift: true });
    await grid.press('ArrowRight', { shift: true });
    expect(grid.ranges).toEqual([range(2, 2, 3, 3)]);
    await grid.press('ArrowDown', { shift: true, ctrl: true });
    expect(grid.ranges).toEqual([range(2, 2, 49, 3)]);
    expect(grid.announcement).toBe('Выделено строк: 48, колонок: 2');
    expect(grid.focusedCell).toEqual({ row: 2, col: 2 });
    await grid.press('Escape');
    expect(grid.ranges).toEqual([]);
    await grid.press(' ', { shift: true });
    expect(grid.ranges).toEqual([range(2, 0, 2, 17)]);
    await grid.press('Escape');
    await grid.press(' ', { ctrl: true });
    expect(grid.ranges).toEqual([range(0, 2, 49, 2)]);
    await grid.press('a', { ctrl: true });
    expect(grid.ranges).toEqual([range(0, 0, 49, 17)]);
    await grid.press('ArrowDown');
    expect(grid.ranges).toEqual([]);
    expect(grid.focusedCell).toEqual({ row: 3, col: 2 });
  });

  it('drops the selection with Escape and with a press outside the table', async () => {
    const grid = mountPeople({ props: { keepEditing: isBar } });
    await grid.focusCell(2, 2);

    await grid.press('a', { ctrl: true });
    expect(await grid.pressHandled('Escape')).toBe(true);
    expect(grid.ranges).toEqual([]);
    expect(grid.hasModifier('deselected')).toBe(true);
    expect(await grid.pressHandled('Escape')).toBe(false);
    await grid.press('ArrowDown');
    expect(grid.hasModifier('deselected')).toBe(false);
    expect(await grid.pressHandled('Escape')).toBe(true);
    expect(grid.hasModifier('deselected')).toBe(true);
    await grid.press('ArrowDown', { shift: true });
    expect(grid.ranges).toEqual([range(3, 2, 4, 2)]);
    await grid.pressOutside('bar');
    expect(grid.ranges).toEqual([range(3, 2, 4, 2)]);
    await grid.pressOutside();
    expect(grid.ranges).toEqual([]);
  });

  it('selects everything from a header cell and starts from the clicked cell when the table had no focus', async () => {
    const grid = mountPeople();
    await grid.focusCell(-1, 2);

    await grid.press('a', { ctrl: true });
    expect(grid.ranges).toEqual([range(0, 0, 49, 17)]);
    await grid.press('Escape');
    await grid.blur();
    await grid.clickCell(3, 2, { shift: true });
    expect(grid.ranges).toEqual([range(3, 2, 3, 2)]);
    expect(grid.focusedCell).toEqual({ row: 3, col: 2 });
    expect(grid.textSelection).toBe('');
  });

  it('copies ranges over a stray text selection and leaves a selected word to the browser', async () => {
    clipboard = installClipboard({ api: 'granted' });
    const grid = mountPeople();
    await grid.focusCell(1, 1);

    grid.selectText(1, 1);
    await grid.press('c', { ctrl: true });
    await flushPromises();
    expect(clipboard.copies).toEqual([]);
    await grid.dragRange({ row: 1, col: 1 }, { row: 1, col: 2 });
    expect(grid.textSelection).toBe('');
    grid.selectText(2, 2);
    await grid.press('c', { ctrl: true });
    await flushPromises();
    expect(clipboard.copies).toEqual([`Сотрудник 1\t${grid.cellText(1, 2)}`]);
  });

  it('copies the active cell or a block of ranges as text and a table, with or without headers', async () => {
    clipboard = installClipboard({ api: 'granted' });
    const grid = mountPeople();
    await grid.focusCell(1, 1);

    await grid.press('c', { ctrl: true });
    await flushPromises();
    expect(clipboard.copies).toEqual(['Сотрудник 1']);
    expect(grid.announcement).toBe('Скопирована 1 строка');
    await grid.dragRange({ row: 1, col: 1 }, { row: 2, col: 2 });
    await grid.dragRange({ row: 1, col: 4 }, { row: 2, col: 4 }, { ctrl: true });
    await grid.press('c', { ctrl: true });
    await flushPromises();

    const block = [1, 2].map((row) => [1, 2, 4].map((col) => grid.cellText(row, col)).join('\t'));

    expect(clipboard.copies[1]).toBe(block.join('\n'));
    expect(clipboard.htmls[1]).toContain('<tr><td>Сотрудник 1</td><td>Казань</td>');
    expect(grid.announcement).toBe('Скопированы 2 строки');
    expect(await grid.openCellMenu(2, 2)).toBe(true);
    expect(grid.cellMenuLabels).toEqual(['Копировать', 'Копировать с заголовками']);
    await grid.chooseCellMenu('Копировать с заголовками');
    expect(clipboard.copies[2]).toBe(['Имя\tГород\tНанят', ...block].join('\n'));
    expect(grid.ranges).toHaveLength(2);
  });

  it('refuses ranges without shared rows or columns and cuts huge copies at the limit', async () => {
    clipboard = installClipboard({ api: 'granted' });
    const grid = mountPeople({ props: { copyLimit: 4 } });
    await grid.settle();

    await grid.dragRange({ row: 1, col: 1 }, { row: 2, col: 1 });
    await grid.dragRange({ row: 4, col: 3 }, { row: 5, col: 4 }, { ctrl: true });
    await grid.press('c', { ctrl: true });

    expect(grid.announcement).toBe(
      'Разрывные диапазоны копируются, только если у них общие строки или колонки',
    );

    await grid.openCellMenu(4, 3);
    expect(grid.cellMenuDisabled('Копировать')).toBe(true);
    await grid.closeCellMenu();
    expect(grid.focusedCell).toEqual({ row: 4, col: 3 });
    await grid.press('a', { ctrl: true });
    await grid.press('c', { ctrl: true });
    await flushPromises();
    expect(clipboard.copies).toHaveLength(1);
    expect(clipboard.copies[0]?.split('\n')).toHaveLength(1);
    expect(grid.announcement).toBe('Скопировано строк: 1 из 50');
  });

  it('opens the cell menu from the pointer, the keyboard and a long press with the items of the page', async () => {
    const opened: Person[] = [];

    const grid = mountPeople({
      props: {
        contextMenu: (scope: NuiTableContextScope<Person>) => [
          {
            label: `Открыть ${scope.text}`,
            onSelect: () => {
              opened.push(scope.row);
            },
          },
        ],
      },
    });

    await grid.dragRange({ row: 1, col: 1 }, { row: 2, col: 2 });
    await grid.openCellMenu(3, 1);
    expect(grid.ranges).toEqual([]);
    expect(grid.activeCell).toEqual({ row: 3, col: 1 });
    expect(grid.cellMenuFocused).toBe(true);

    expect(grid.cellMenuLabels).toEqual([
      'Копировать',
      'Копировать с заголовками',
      'Открыть Сотрудник 3',
    ]);

    await grid.chooseCellMenu('Открыть Сотрудник 3');
    expect(opened).toEqual([people(50)[3]]);
    await grid.focusCell(4, 1);
    await grid.press('F10', { shift: true });
    expect(grid.cellMenuFocused).toBe(true);
    expect(grid.cellMenuLabels.at(-1)).toBe('Открыть Сотрудник 4');
    await grid.closeCellMenu();
    expect(grid.focusedCell).toEqual({ row: 4, col: 1 });
    vi.useFakeTimers();
    await grid.holdCell(5, 2, 500);
    expect(grid.cellMenuLabels.at(-1)).toBe('Открыть Казань');
  });

  it('leaves the native menu and the pointer alone when the features are off', async () => {
    const grid = mountPeople({ props: { contextMenu: false, cellSelection: false } });
    await grid.settle();

    expect(await grid.openCellMenu(1, 1)).toBe(false);
    expect(grid.cellMenuLabels).toEqual([]);
    await grid.dragRange({ row: 1, col: 1 }, { row: 3, col: 2 });
    await grid.press('ArrowDown', { shift: true });
    expect(grid.ranges).toEqual([]);
    expect(grid.multiselectable).toBe(false);
  });

  it('drops the ranges when the rows change under them', async () => {
    const grid = mountPeople();
    await grid.settle();

    await grid.dragRange({ row: 1, col: 1 }, { row: 3, col: 2 });
    await grid.setQuick('1');
    expect(grid.ranges).toEqual([]);
  });
});
