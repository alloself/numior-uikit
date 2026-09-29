import { describe, expect, it } from 'vitest';
import type { NuiGridColumn, NuiGridPin } from '../src';
import { gridLayout, pinsFit, type GridLayout } from '../src/data-grid/grid-layout';

interface Place {
  readonly name: string;
}

const column = (key: string, width: number, pin?: NuiGridPin): NuiGridColumn<Place> => ({
  key,
  label: key,
  type: 'text',
  width,
  pin,
  value: (row) => row.name,
});

const COLUMNS = [
  column('id', 80, 'start'),
  column('name', 200),
  column('city', 140),
  column('status', 160, 'end'),
];

const panesOf = (layout: GridLayout): Record<string, string[]> => ({
  start: layout.start.map((placed) => placed.key),
  centre: layout.centre.map((placed) => placed.key),
  end: layout.end.map((placed) => placed.key),
});

describe('gridLayout', () => {
  it('pins columns by the model over their own pin and leaves hidden columns out', () => {
    const layout = gridLayout(COLUMNS, {
      pins: { city: 'start', status: null },
      hidden: ['name'],
      sticky: true,
      select: false,
      room: 0,
    });

    expect(panesOf(layout)).toEqual({ start: ['id', 'city'], centre: ['status'], end: [] });
    expect(layout.visual.map((placed) => placed.cell.colIndex)).toEqual([1, 2, 3]);
  });

  it('stretches flex columns into the free width once the room is known', () => {
    const columns = [
      column('id', 80, 'start'),
      { ...column('name', 200), flex: 2 },
      { ...column('city', 140), flex: 1 },
      column('status', 160, 'end'),
    ];

    const narrow = gridLayout(columns, {
      pins: {},
      hidden: [],
      sticky: true,
      select: true,
      room: 500,
    });

    const wide = gridLayout(columns, {
      pins: {},
      hidden: [],
      sticky: true,
      select: true,
      room: 920,
    });

    const unknown = gridLayout(columns, {
      pins: {},
      hidden: [],
      sticky: true,
      select: true,
      room: 0,
    });

    expect(narrow.visual.map((placed) => placed.width)).toEqual([40, 80, 200, 140, 160]);
    expect(wide.visual.map((placed) => placed.width)).toEqual([40, 80, 400, 240, 160]);
    expect(wide.centre.map((placed) => placed.offset)).toEqual([0, 400]);
    expect(unknown.visual.map((placed) => placed.width)).toEqual([40, 80, 200, 140, 160]);
  });

  it('tells when the pinned panes leave no room for a column and then scrolls every column in the same order', () => {
    const roomy = gridLayout(COLUMNS, {
      pins: {},
      hidden: [],
      sticky: true,
      select: false,
      room: 0,
    });

    const pinned = gridLayout(COLUMNS, {
      pins: { city: 'start' },
      hidden: [],
      sticky: true,
      select: false,
      room: 0,
    });

    const scrolling = gridLayout(COLUMNS, {
      pins: { city: 'start' },
      hidden: [],
      sticky: false,
      select: false,
      room: 0,
    });

    expect(pinsFit(roomy, 320)).toBe(true);
    expect(pinsFit(pinned, 320)).toBe(false);
    expect(pinsFit(pinned, 1200)).toBe(true);
    expect(pinsFit(pinned, 0)).toBe(true);
    expect(panesOf(pinned)).toEqual({ start: ['id', 'city'], centre: ['name'], end: ['status'] });

    expect(panesOf(scrolling)).toEqual({
      start: [],
      centre: ['id', 'city', 'name', 'status'],
      end: [],
    });

    expect(scrolling.visual.map((placed) => placed.key)).toEqual(
      pinned.visual.map((placed) => placed.key),
    );
  });
});
