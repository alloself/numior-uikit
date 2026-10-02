import { describe, expect, it } from 'vitest';
import type { NuiTableColumn, NuiTablePin } from '../src';
import {
  mergeIndices,
  pinsFit,
  tableLayout,
  wrappedCentreOf,
  type TableLayout,
} from '../src/table/table-layout';

interface Place {
  readonly name: string;
}

const column = (key: string, width: number, pin?: NuiTablePin): NuiTableColumn<Place> => ({
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

const panesOf = (layout: TableLayout): Record<string, string[]> => ({
  start: layout.start.map((placed) => placed.key),
  centre: layout.centre.map((placed) => placed.key),
  end: layout.end.map((placed) => placed.key),
});

describe('tableLayout', () => {
  it('pins columns by the model over their own pin and leaves hidden columns out', () => {
    const layout = tableLayout(COLUMNS, {
      pins: { city: 'start', status: null },
      hidden: ['name'],
      widths: {},
      sticky: true,
      select: false,
      room: 0,
      wrap: true,
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

    const narrow = tableLayout(columns, {
      pins: {},
      hidden: [],
      widths: {},
      sticky: true,
      select: true,
      room: 500,
      wrap: true,
    });

    const wide = tableLayout(columns, {
      pins: {},
      hidden: [],
      widths: {},
      sticky: true,
      select: true,
      room: 920,
      wrap: true,
    });

    const unknown = tableLayout(columns, {
      pins: {},
      hidden: [],
      widths: {},
      sticky: true,
      select: true,
      room: 0,
      wrap: true,
    });

    expect(narrow.visual.map((placed) => placed.width)).toEqual([40, 80, 200, 140, 160]);
    expect(wide.visual.map((placed) => placed.width)).toEqual([40, 80, 400, 240, 160]);
    expect(wide.centre.map((placed) => placed.offset)).toEqual([0, 400]);
    expect(unknown.visual.map((placed) => placed.width)).toEqual([40, 80, 200, 140, 160]);
  });

  it('tells when the pinned panes leave no room for a column and then scrolls every column in the same order', () => {
    const roomy = tableLayout(COLUMNS, {
      pins: {},
      hidden: [],
      widths: {},
      sticky: true,
      select: false,
      room: 0,
      wrap: true,
    });

    const pinned = tableLayout(COLUMNS, {
      pins: { city: 'start' },
      hidden: [],
      widths: {},
      sticky: true,
      select: false,
      room: 0,
      wrap: true,
    });

    const scrolling = tableLayout(COLUMNS, {
      pins: { city: 'start' },
      hidden: [],
      widths: {},
      sticky: false,
      select: false,
      room: 0,
      wrap: true,
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

  it('adds the wrapping columns to the columns of the window in their order', () => {
    const layout = tableLayout(
      [
        column('id', 80, 'start'),
        column('name', 200),
        { ...column('note', 300), wrap: true },
        column('city', 140),
        { ...column('address', 300), wrap: true },
        { ...column('status', 160, 'end'), wrap: true },
      ],
      { pins: {}, hidden: [], widths: {}, sticky: true, select: false, room: 0, wrap: true },
    );

    const wrapped = wrappedCentreOf(layout);

    expect(wrapped).toEqual([1, 3]);
    expect(mergeIndices([2], wrapped)).toEqual([1, 2, 3]);
    expect(mergeIndices([0, 1], wrapped)).toEqual([0, 1, 3]);
    expect(mergeIndices([], wrapped)).toEqual([1, 3]);
    expect(mergeIndices([0, 2, 3, 4], wrapped)).toEqual([0, 1, 2, 3, 4]);
    expect(mergeIndices([3], [])).toEqual([3]);
  });
});
