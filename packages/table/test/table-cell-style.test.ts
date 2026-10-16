import { afterEach, describe, expect, it } from 'vite-plus/test';
import { ref } from 'vue';
import type { NuiTableCellRef, NuiTableCellStyle } from '../src';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { applyStaffEdits, staff, STAFF_COLUMNS, type Staff } from './support/staff';

const mounted: Array<{ unmount(): void }> = [];
const HIGHLIGHT: NuiTableCellStyle = { fill: 'gold', color: 'black', align: 'center' };

const FRAME: NuiTableCellStyle = {
  class: 'app-frame',
  borders: { top: '2px solid red', end: '1px dashed blue' },
  style: { 'font-weight': '700' },
};

const GAPS: Readonly<Record<number, Partial<Staff>>> = {
  1: { city: null, salary: null },
  2: { city: null },
};

const sparseStaff = (): Staff[] => staff(20).map((row) => ({ ...row, ...GAPS[row.id] }));

const paintStaff = ({ row, column }: NuiTableCellRef<Staff>): NuiTableCellStyle | undefined => {
  if (column.key === 'salary' && row.id % 2 === 1) {
    return HIGHLIGHT;
  }
  return column.key === 'name' && row.id === 2 ? FRAME : undefined;
};

const mountStaff = (options: Partial<TableMountOptions<Staff>> = {}): TableDriver<Staff> => {
  const grid = TableDriver.mount<Staff>({
    columns: STAFF_COLUMNS,
    rows: staff(100),
    config: { locale: 'ru-RU' },
    width: 600,
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

describe('NuiTable cell styles', () => {
  it('paints the fill, the text colour, the alignment and the borders a cell style names', async () => {
    const grid = mountStaff({ props: { cellStyle: paintStaff } });
    await grid.settle();

    expect(grid.cellPaint(1, 3)).toEqual({ fill: 'gold', color: 'black', align: 'center' });
    expect(grid.cellMarks(1, 3)).toEqual(['filled', 'inked']);
    expect(grid.cellPaint(0, 3)).toEqual({ align: 'end' });
    expect(grid.cellMarks(0, 3)).toEqual([]);

    expect(grid.cellPaint(2, 1)).toEqual({
      top: '2px solid red',
      end: '1px dashed blue',
      align: 'start',
    });

    expect(grid.cellMarks(2, 1)).toEqual(['edged']);
    expect(grid.cell(2, 1)?.classList.contains('app-frame')).toBe(true);
    expect(grid.cell(2, 1)?.style.fontWeight).toBe('700');
  });

  it('asks for a style once per rendered cell and leaves painted rows alone when the cursor or the window moves', async () => {
    const asked: string[] = [];

    const grid = mountStaff({
      props: {
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
    expect(painted).toBeGreaterThanOrEqual(first.length * STAFF_COLUMNS.length);
    await grid.focusCell(0, 1);
    await grid.press('ArrowDown');
    expect(asked).toHaveLength(painted);
    await grid.scroll({ top: 400 });
    const fresh = asked.slice(painted);
    const entered = grid.renderedRows.filter((position) => !first.includes(position));

    expect(entered.length).toBeGreaterThan(0);
    expect(new Set(fresh).size).toBe(fresh.length);
    expect(fresh).toHaveLength(entered.length * STAFF_COLUMNS.length);
    expect(fresh.filter((cell) => first.includes(Number(cell.split(':')[0])))).toEqual([]);
  });

  it('repaints the cells when the state a cell style reads changes', async () => {
    const limit = ref(1050);

    const grid = mountStaff({
      props: {
        cellStyle: ({ row, column }) =>
          column.key === 'salary' && (row.salary ?? 0) >= limit.value ? HIGHLIGHT : undefined,
      },
    });

    await grid.settle();
    expect(grid.cellMarks(4, 3)).toEqual([]);
    expect(grid.cellMarks(5, 3)).toEqual(['filled', 'inked']);
    limit.value = 1040;
    await grid.settle();
    expect(grid.cellMarks(4, 3)).toEqual(['filled', 'inked']);
    expect(grid.cellPaint(4, 3).align).toBe('center');
  });

  it('repaints a cell after an edit changes its row', async () => {
    const grid = mountStaff({
      props: {
        cellStyle: ({ row, column }) =>
          column.key === 'city' && row.city === null ? { fill: 'pink' } : undefined,
      },
      onEdit: (event) => {
        applyStaffEdits(event.changes);
      },
    });

    await grid.settle();
    expect(grid.cellMarks(1, 2)).toEqual([]);
    await grid.focusCell(1, 2);
    await grid.press('Delete');

    expect(grid.cellText(1, 2)).toBe('');
    expect(grid.cellPaint(1, 2)).toEqual({ fill: 'pink', align: 'start' });
  });

  it('paints pinned rows and tells the style that they are pinned', async () => {
    const grid = mountStaff({
      props: {
        pinnedRows: staff(202).slice(200),
        cellStyle: ({ pinned, column }) =>
          column.key === 'name' ? { fill: pinned ? 'silver' : 'white' } : undefined,
      },
    });

    await grid.settle();
    expect(grid.cellPaint(0, 1).fill).toBe('silver');
    expect(grid.cellPaint(1, 1).fill).toBe('silver');
    expect(grid.cellPaint(2, 1).fill).toBe('white');
  });

  it('lets the text of a cell flow over the empty cells after it up to a filled one', async () => {
    const grid = mountStaff({
      rows: sparseStaff(),
      width: 900,
      props: {
        cellStyle: ({ column }) => (column.key === 'name' ? { overflow: true } : undefined),
      },
      onEdit: (event) => {
        applyStaffEdits(event.changes);
      },
    });

    await grid.settle();
    expect(grid.cellPaint(1, 1)).toEqual({ flow: '420px', align: 'start' });
    expect(grid.cellMarks(1, 1)).toEqual(['overflow', 'seamless']);
    expect(grid.cellMarks(1, 2)).toEqual(['seamless']);
    expect(grid.cellMarks(1, 3)).toEqual([]);
    expect(grid.cellPaint(2, 1).flow).toBe('300px');
    expect(grid.cellMarks(0, 1)).toEqual([]);
    await grid.focusCell(1, 2);
    await grid.press('Enter');

    expect(grid.editing).toEqual({ row: 1, col: 2 });
    expect(grid.cellMarks(1, 1)).toEqual([]);
    await grid.typeInEditor('Тверь');
    await grid.press('Enter');

    expect(grid.cellText(1, 2)).toBe('Тверь');
    expect(grid.cellMarks(1, 1)).toEqual([]);
    expect(grid.cellPaint(1, 1).flow).toBeUndefined();
  });

  it('carries an end aligned text back over empty cells and keeps a pinned or centred text in its cell', async () => {
    const grid = mountStaff({
      rows: sparseStaff(),
      width: 900,
      pins: { id: 'start', name: 'start' },
      props: {
        cellStyle: ({ row, column }) => {
          if (column.key === 'name') {
            return { overflow: true };
          }
          return column.key === 'remote'
            ? { overflow: true, align: row.id === 1 ? 'end' : 'center' }
            : undefined;
        },
      },
    });

    await grid.settle();
    expect(grid.cellMarks(1, 1)).toEqual([]);
    expect(grid.cellPaint(1, 4)).toEqual({ flow: '360px', align: 'end' });
    expect(grid.cellMarks(1, 4)).toEqual(['tail', 'overflow']);
    expect(grid.cellMarks(1, 3)).toEqual(['seamless']);
    expect(grid.cellMarks(1, 2)).toEqual(['seamless']);
    expect(grid.cellMarks(2, 4)).toEqual(['tail']);
  });

  it('draws grid lines in a bordered table and closes the last column only while the table has spare room', async () => {
    const grid = mountStaff({ props: { bordered: true } });
    await grid.settle();

    expect(grid.bordered).toBe(true);
    expect(grid.cellMarks(0, 4)).toEqual(['tail']);
    expect(grid.cellMarks(0, 3)).toEqual([]);
    expect(grid.slack).toBe(false);
    await grid.resize(900);
    expect(grid.slack).toBe(true);
    await grid.resize(600);
    expect(grid.slack).toBe(false);
  });
});
