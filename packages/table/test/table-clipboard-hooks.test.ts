import { afterEach, describe, expect, it } from 'vite-plus/test';
import { flushPromises } from '@vue/test-utils';
import { installClipboard, type ClipboardStub } from '../../primitives/test/support/clipboard';
import type {
  NuiTableClipboard,
  NuiTableClipboardData,
  NuiTableRanges,
  TableCellPosition,
} from '../src';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { applyStaffEdits, staff, STAFF_COLUMNS, type Staff } from './support/staff';

const mounted: TableDriver<Staff>[] = [];
let clipboard: ClipboardStub | undefined;

const mountStaff = (options: Partial<TableMountOptions<Staff>> = {}): TableDriver<Staff> => {
  const grid = TableDriver.mount<Staff>({
    columns: STAFF_COLUMNS,
    rows: staff(20),
    config: { locale: 'ru-RU' },
    width: 1200,
    onEdit: (event) => {
      applyStaffEdits(event.changes);
    },
    ...options,
    props: { cellSelection: true, ...options.props },
  });

  mounted.push(grid);
  return grid;
};

const spans = (ranges: NuiTableRanges): string =>
  ranges.map(({ from, to }) => `${from.row}:${from.col}-${to.row}:${to.col}`).join(' ');

afterEach(() => {
  for (const grid of mounted.splice(0)) {
    grid.unmount();
  }

  clipboard?.restore();
  clipboard = undefined;
});

describe('NuiTable clipboard hooks', () => {
  it('copies what serialize writes for the active cell, the ranges and the headers', async () => {
    clipboard = installClipboard({ api: 'granted' });

    const hooks: NuiTableClipboard<Staff> = {
      serialize: ({ ranges, headers, rowAt, keyAt }) => ({
        text: `${spans(ranges)} ${headers ? 'with' : 'without'} ${rowAt(ranges[0]?.from.row ?? 0)?.name ?? ''}`,
        html: `<p>${keyAt(ranges[0]?.from.col ?? 0) ?? ''}</p>`,
      }),
    };

    const grid = mountStaff({ props: { clipboard: hooks } });
    await grid.focusCell(1, 2);
    await grid.press('c', { ctrl: true });
    await flushPromises();

    expect(clipboard.copies).toEqual(['1:2-1:2 without Сотрудник 1']);
    expect(clipboard.htmls).toEqual(['<p>city</p>']);
    expect(grid.announcement).toBe('Скопирована 1 строка');

    await grid.dragRange({ row: 2, col: 1 }, { row: 3, col: 2 });
    expect(await grid.openCellMenu(3, 2)).toBe(true);

    await grid.chooseCellMenu('Копировать с заголовками');
    await flushPromises();
    expect(clipboard.copies[1]).toBe('2:1-3:2 with Сотрудник 2');
    expect(grid.announcement).toBe('Скопированы 2 строки');
  });

  it('pastes the block parse reads and falls back to tab separated text', async () => {
    const rows = staff(20);

    const reads: Array<{
      readonly data: NuiTableClipboardData;
      readonly target: TableCellPosition;
    }> = [];

    const hooks: NuiTableClipboard<Staff> = {
      parse: (data, target) => {
        reads.push({ data, target });
        return data.text.includes(';')
          ? data.text.split('\n').map((line) => line.split(';'))
          : undefined;
      },
    };

    const grid = mountStaff({ rows, props: { clipboard: hooks } });
    await grid.focusCell(1, 2);
    await grid.paste('Тула;1500', '<table><tr><td>Тула</td></tr></table>');
    await grid.dragRange({ row: 4, col: 2 }, { row: 5, col: 3 });
    await grid.paste('Омск\tТверь');

    expect(reads).toEqual([
      {
        data: { text: 'Тула;1500', html: '<table><tr><td>Тула</td></tr></table>' },
        target: { row: 1, col: 2 },
      },
      { data: { text: 'Омск\tТверь' }, target: { row: 4, col: 2 } },
    ]);

    expect(grid.edits).toEqual([
      {
        kind: 'paste',
        changes: [
          { row: rows[1], key: 'city', value: 'Тула', previous: 'Казань' },
          { row: rows[1], key: 'salary', value: 1500, previous: 1010 },
        ],
      },
      {
        kind: 'paste',
        changes: [
          { row: rows[4], key: 'city', value: 'Омск', previous: 'Казань' },
          { row: rows[5], key: 'city', value: 'Омск', previous: 'Ереван' },
        ],
      },
    ]);
  });
});
