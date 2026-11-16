import { afterEach, describe, expect, it } from 'vite-plus/test';
import type { NuiTableRange } from '../src';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { applyStaffEdits, staff, STAFF_COLUMNS, type Staff } from './support/staff';

const mounted: Array<{ unmount(): void }> = [];

const range = (top: number, start: number, bottom: number, end: number): NuiTableRange => ({
  from: { row: top, col: start },
  to: { row: bottom, col: end },
});

const BLOCK = range(1, 1, 2, 2);

const mountStaff = (options: Partial<TableMountOptions<Staff>> = {}): TableDriver<Staff> => {
  const grid = TableDriver.mount<Staff>({
    columns: STAFF_COLUMNS,
    rows: staff(100),
    config: { locale: 'ru-RU' },
    width: 900,
    ...options,
    props: { cellSelection: true, merges: [BLOCK], ...options.props },
  });

  mounted.push(grid);
  return grid;
};

afterEach(() => {
  for (const grid of mounted.splice(0)) {
    grid.unmount();
  }
});

describe('NuiTable merged cells', () => {
  it('renders a merged range as one cell with the content of its first cell', async () => {
    const grid = mountStaff({ props: { merges: [BLOCK, range(4, 0, 4, 1)] } });
    await grid.settle();

    expect(grid.cellSpan(1, 1)).toEqual([2, 2, 2]);
    expect(grid.mergeMarks(1, 1)).toEqual(['tall']);
    expect(grid.cellSpan(4, 0)).toEqual([1, 2, 2]);
    expect(grid.mergeMarks(4, 0)).toEqual([]);
    expect(grid.cellMerged(1, 1)).toBe(true);
    expect(grid.cellText(1, 1)).toBe('Сотрудник 1');
    expect(grid.cell(1, 2)).toBeNull();
    expect(grid.cell(2, 1)).toBeNull();
    expect(grid.cell(2, 2)).toBeNull();
    expect(grid.cellText(2, 0)).toBe('2');
    expect(grid.cellText(2, 3)).toBe('1\u00A0020');
    expect(grid.cellSpread(1, 1)).toEqual(['', '', '', '']);
    expect(grid.cellMerged(0, 1)).toBe(false);
  });

  it('keeps the focus in the table when the focused cell goes under a new merge', async () => {
    const grid = mountStaff({ props: { merges: [] } });

    await grid.settle();
    await grid.focusCell(2, 2);
    await grid.receive({ merges: [BLOCK] });

    expect(grid.cell(2, 2)).toBeNull();
    expect(grid.focusedCell).toEqual({ row: 1, col: 1 });
  });

  it('moves the cursor onto a merge and leaves it from its far edge along the same row', async () => {
    const grid = mountStaff();
    await grid.settle();
    await grid.focusCell(2, 0);
    await grid.press('ArrowRight');

    expect(grid.focusedCell).toEqual({ row: 1, col: 1 });

    await grid.press('ArrowRight');
    expect(grid.focusedCell).toEqual({ row: 2, col: 3 });

    await grid.press('ArrowLeft');
    expect(grid.focusedCell).toEqual({ row: 1, col: 1 });

    await grid.press('ArrowDown');
    expect(grid.focusedCell).toEqual({ row: 3, col: 2 });

    await grid.press('ArrowUp');
    expect(grid.focusedCell).toEqual({ row: 1, col: 1 });

    await grid.press('ArrowUp');
    expect(grid.focusedCell).toEqual({ row: 0, col: 2 });
  });

  it('grows a selection until it holds the whole merge and steps over it when it shrinks', async () => {
    const grid = mountStaff();
    await grid.settle();
    await grid.dragRange({ row: 0, col: 0 }, { row: 1, col: 1 });

    expect(grid.ranges).toEqual([range(0, 0, 2, 2)]);
    expect(grid.rangeMarks(1, 1)).toEqual(['selected', 'ranged', 'range-bottom', 'range-end']);

    await grid.press('ArrowUp', { shift: true });
    expect(grid.ranges).toEqual([range(0, 0, 0, 2)]);

    await grid.press('ArrowDown', { shift: true });
    expect(grid.ranges).toEqual([range(0, 0, 2, 2)]);

    await grid.clickCell(1, 1);

    expect(grid.ranges).toEqual([]);
    expect(grid.activeCell).toEqual({ row: 1, col: 1 });

    await grid.clickCell(3, 3, { shift: true });
    expect(grid.ranges).toEqual([range(1, 1, 3, 3)]);
  });

  it('boxes a merge that a whole row selection only crosses', async () => {
    const grid = mountStaff({ props: { merges: [BLOCK], rowHeaders: true } });
    await grid.settle();
    await grid.clickCell(2, 0);

    expect(grid.ranges).toEqual([range(2, 0, 2, 4)]);

    expect(grid.rangeMarks(1, 2)).toEqual([
      'selected',
      'ranged',
      'range-top',
      'range-bottom',
      'range-start',
      'range-end',
    ]);

    expect(grid.rangeMarks(2, 1)).toEqual([
      'selected',
      'ranged',
      'range-top',
      'range-bottom',
      'range-start',
    ]);
  });

  it('continues a tall merge from the first row of the window and from the held row', async () => {
    const grid = mountStaff({ props: { merges: [range(5, 1, 60, 1)] } });
    await grid.settle();
    await grid.focusCell(6, 2);
    await grid.scroll({ top: 1200 });
    const shown = grid.renderedRows.filter((position) => position >= 24 && position <= 60);
    const first = shown[0] ?? 0;

    expect(grid.cellText(first, 1)).toBe('Сотрудник 5');
    expect(grid.cellSpan(first, 1)).toEqual([shown.length, 1, 1]);
    expect(grid.cellSpread(first, 1)).toEqual(['', `${-(first - 5) * 40}px`, '', '2240px']);
    expect(grid.cell(first + 1, 1)).toBeNull();
    expect(grid.cellText(6, 1)).toBe('Сотрудник 5');
    expect(grid.cellSpan(6, 1)).toEqual([1, 1, 1]);
  });

  it('opens the editor of the first cell of a merge and paints the merge with its style', async () => {
    const grid = mountStaff({
      props: {
        merges: [range(1, 2, 2, 3)],
        cellStyle: ({ row, column }) =>
          column.key === 'city' && row.id === 1 ? { fill: 'gold' } : undefined,
      },
      onEdit: (event) => {
        applyStaffEdits(event.changes);
      },
    });

    await grid.settle();
    expect(grid.cellPaint(1, 2).fill).toBe('gold');

    await grid.focusCell(2, 1);
    await grid.press('ArrowRight');
    await grid.press('Enter');

    expect(grid.editing).toEqual({ row: 1, col: 2 });

    await grid.typeInEditor('Тверь');
    await grid.press('Enter');

    expect(grid.edits.at(-1)?.changes.map((change) => [change.row.id, change.key])).toEqual([
      [1, 'city'],
    ]);

    expect(grid.cellText(1, 2)).toBe('Тверь');
    expect(grid.focusedCell).toEqual({ row: 3, col: 2 });
  });

  it('splits a merge at the pinned column and keeps both pieces under one cursor', async () => {
    const grid = mountStaff({ pins: { id: 'start' }, props: { merges: [range(1, 0, 2, 1)] } });
    await grid.settle();

    expect(grid.cellSpan(1, 0)).toEqual([2, 1, 1]);
    expect(grid.cellSpan(1, 1)).toEqual([2, 1, 1]);
    expect(grid.cellText(1, 1)).toBe('1');
    expect(grid.cellSpread(1, 1)).toEqual(['-98px', '', '258px', '']);
    expect(grid.mergeMarks(1, 0)).toEqual(['tall', 'cut-end']);
    expect(grid.mergeMarks(1, 1)).toEqual(['tall', 'cut-start']);

    await grid.clickCell(1, 1);

    expect(grid.activeCell).toEqual({ row: 1, col: 1 });
    expect(grid.mergeMarks(1, 0)).toEqual(['tall', 'allied', 'cut-end']);
    expect(grid.mergeMarks(1, 1)).toEqual(['tall', 'cut-start']);

    await grid.press('ArrowLeft');

    expect(grid.focusedCell).toEqual({ row: 1, col: 0 });
    expect(grid.mergeMarks(1, 0)).toEqual(['tall', 'cut-end']);
    expect(grid.mergeMarks(1, 1)).toEqual(['tall', 'allied', 'cut-start']);

    await grid.press('ArrowRight');
    expect(grid.focusedCell).toEqual({ row: 1, col: 2 });
    expect(grid.mergeMarks(1, 1)).toEqual(['tall', 'cut-start']);
  });

  it('opens the editor in the piece under the cursor and returns to it on Escape', async () => {
    const grid = mountStaff({
      columns: STAFF_COLUMNS.map((column) =>
        column.key === 'name' ? { ...column, editable: true } : column,
      ),
      pins: { id: 'start', name: 'start' },
      props: { merges: [range(1, 1, 2, 2)] },
    });

    await grid.settle();
    await grid.clickCell(1, 2);
    await grid.press('F2');

    expect(grid.editing).toEqual({ row: 1, col: 2 });
    expect(grid.cellText(1, 1)).toBe('Сотрудник 1');

    await grid.press('Escape');

    expect(grid.editing).toBeUndefined();
    expect(grid.focusedCell).toEqual({ row: 1, col: 2 });
    expect(grid.cellText(1, 2)).toBe('Сотрудник 1');
  });

  it('asks for the style of a merge once per piece and leaves painted rows alone when the window moves', async () => {
    const asked: string[] = [];

    const grid = mountStaff({
      props: {
        merges: [BLOCK],
        cellStyle: (cell) => {
          asked.push(`${cell.position}:${cell.column.key}`);
          return undefined;
        },
      },
    });

    await grid.settle();
    const painted = asked.length;
    const first = grid.renderedRows;

    expect(new Set(asked).size).toBe(painted);
    expect(asked.filter((cell) => cell === '1:name')).toHaveLength(1);
    expect(asked).not.toContain('1:city');
    expect(asked).not.toContain('2:name');

    await grid.scroll({ top: 80 });
    const kept = grid.renderedRows.filter((position) => first.includes(position));

    expect(kept).toContain(1);

    expect(
      asked.slice(painted).filter((cell) => first.includes(Number(cell.split(':')[0]))),
    ).toEqual([]);
  });

  it('ignores merges while the rows are grouped', async () => {
    const grid = mountStaff({ groupBy: ['city'] });
    await grid.settle();

    expect(grid.cellMerged(1, 1)).toBe(false);
    expect(grid.cell(1, 2)).not.toBeNull();
  });
});
