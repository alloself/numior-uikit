import { afterEach, describe, expect, it } from 'vite-plus/test';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { people, PEOPLE_COLUMNS, type Person } from './support/people';

const mounted: Array<{ unmount(): void }> = [];

const NOTE = 6;
const TEAM = 17;

const WRAPPING = PEOPLE_COLUMNS.map((column) =>
  column.key === 'note' || column.key === 'm9' ? { ...column, wrap: true } : column,
);

const mountPeople = (options: Partial<TableMountOptions<Person>> = {}): TableDriver<Person> => {
  const grid = TableDriver.mount<Person>({
    columns: WRAPPING,
    rows: people(1000),
    config: { locale: 'ru-RU' },
    ...options,
    props: { cellSelection: true, rowHeight: 'auto', getKey: (row) => row.id, ...options.props },
  });

  mounted.push(grid);
  return grid;
};

afterEach(() => {
  for (const grid of mounted.splice(0)) {
    grid.unmount();
  }
});

describe('NuiTable rows sized by content in a window', () => {
  it('wraps the wrap columns of the body and keeps them rendered outside the column window', async () => {
    const grid = mountPeople();
    await grid.settle();

    expect(grid.fluid).toBe(true);
    expect(grid.auto).toBe(false);
    expect(grid.cellWraps(0, NOTE)).toBe(true);
    expect(grid.cellWraps(0, 1)).toBe(false);
    expect(grid.cellText(0, 15)).toBe('8');
    expect(grid.cell(0, 14)).toBeNull();
    expect(grid.cellText(0, TEAM)).toBe('Платформа');

    expect(grid.windowFrame).toEqual({
      lead: '0px',
      rest: '39480px',
      clampStart: '-260px',
      clampEnd: '-260px',
    });
  });

  it('takes a batch of measured rows in one step and keeps the first visible row in place', async () => {
    const grid = mountPeople();
    await grid.scroll({ top: 4000 });

    expect(grid.renderedRows).toContain(94);

    await grid.measureRows({ 96: 60, 97: 80, 101: 100 });

    expect(grid.scrollTop).toBe(4060);
    expect(grid.windowFrame?.lead).toBe('3720px');
    expect(grid.windowFrame?.rest).toBe('35520px');

    await grid.measureRows({ 96: 60, 98: 0 });
    expect(grid.scrollTop).toBe(4060);

    await grid.scrollToRow(999);
    expect(grid.scrollTop).toBe(39_860);
  });

  it('starts from the row size again when the rows are rearranged and keeps the position on top', async () => {
    const grid = mountPeople();
    await grid.scroll({ top: 4000 });
    await grid.measureRows({ 96: 60, 97: 80, 101: 100 });
    await grid.setSort([{ key: 'id', direction: 'desc' }]);

    expect(grid.cellText(100, 1)).toBe('Сотрудник 899');
    expect(grid.scrollTop).toBe(4000);
    expect(grid.windowFrame?.rest).toBe('35480px');
  });

  it('pages by the rows that fit the window instead of the base row size', async () => {
    const grid = mountPeople();
    await grid.settle();
    await grid.measureRows({ 0: 100, 1: 100, 2: 100, 3: 100, 4: 100, 5: 100 });
    await grid.focusCell(0, 1);
    await grid.press('PageDown');

    expect(grid.focusedCell).toEqual({ row: 1, col: 1 });

    await grid.press('PageDown');
    await grid.press('PageDown');
    expect(grid.focusedCell).toEqual({ row: 3, col: 1 });

    await grid.press('PageUp');
    expect(grid.focusedCell).toEqual({ row: 2, col: 1 });

    await grid.press('PageDown', { shift: true });
    expect(grid.ranges).toEqual([{ from: { row: 2, col: 1 }, to: { row: 3, col: 1 } }]);
  });

  it('keeps one row size without a height and with a fixed row height', async () => {
    const flowing = mountPeople({ rows: people(5), auto: true });
    const fixed = mountPeople({ props: { rowHeight: 32 } });
    await fixed.settle();

    expect(flowing.fluid).toBe(false);
    expect(flowing.auto).toBe(true);
    expect(flowing.cellWraps(0, NOTE)).toBe(true);
    expect(fixed.fluid).toBe(false);
    expect(fixed.cellWraps(0, NOTE)).toBe(false);
    expect(fixed.windowFrame?.rest).toBe('31488px');
  });
});
