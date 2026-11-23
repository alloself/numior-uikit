import { describe, expect, it } from 'vite-plus/test';
import type { NuiTableColumn, NuiTableColumnDef } from '../src';
import { columnTreeOf, headerBandsOf } from '../src/table/table-columns';
import { rowCellsOf, tableLayout, TRAIL_KEY } from '../src/table/table-layout';

interface Place {
  readonly name: string;
}

const column = (key: string, width: number, pin?: 'start' | 'end'): NuiTableColumn<Place> => ({
  key,
  label: key,
  type: 'text',
  width,
  pin,
  value: (row) => row.name,
});

const DEFS: readonly NuiTableColumnDef<Place>[] = [
  column('id', 80, 'start'),
  { key: 'g', label: 'G', children: ['a', 'b', 'c', 'd', 'e'].map((key) => column(key, 100)) },
  column('status', 160, 'end'),
];

const tree = columnTreeOf(DEFS);

const layout = tableLayout(tree.leaves, {
  pins: {},
  hidden: [],
  widths: {},
  least: {},
  sticky: true,
  select: false,
  room: 0,
  wrap: true,
});

describe('a window of columns', () => {
  it('puts the shown columns side by side with no track for the columns it leaves out', () => {
    const row = rowCellsOf(layout, [0, 3, 4]);

    expect(row.cells.map((cell) => cell.key)).toEqual(['id', 'a', 'd', 'e', TRAIL_KEY, 'status']);

    expect(row.tracks).toEqual([
      { key: 'id', width: 80 },
      { key: 'a', width: 100 },
      { key: 'd', width: 100 },
      { key: 'e', width: 100 },
      { key: TRAIL_KEY, width: undefined },
      { key: 'status', width: 160 },
    ]);
  });

  it('labels a group once per run of neighbouring columns', () => {
    const bands = headerBandsOf(layout, tree, rowCellsOf(layout, [0, 3, 4]));

    expect(bands.rows[0]?.cells.map((cell) => [cell.key, cell.colspan])).toEqual([
      ['__band-id', 1],
      ['g@2', 1],
      ['g@5', 2],
      [`__band-${TRAIL_KEY}`, 1],
      ['__band-status', 1],
    ]);

    expect([...bands.labels.values()]).toEqual(['G', 'G']);
  });
});
