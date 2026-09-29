import type {
  GridCellLayout,
  GridPaneName,
  GridPanes,
  NuiDataGridHidden,
  NuiDataGridPins,
  NuiGridAlign,
  NuiGridColumn,
  NuiGridPin,
} from './data-grid.types';

export interface PlacedColumn {
  readonly key: string;
  readonly pane: GridPaneName;
  readonly visual: number;
  readonly width: number;
  readonly offset: number;
  readonly cell: GridCellLayout;
}

export interface GridLayout {
  readonly start: readonly PlacedColumn[];
  readonly centre: readonly PlacedColumn[];
  readonly end: readonly PlacedColumn[];
  readonly visual: readonly PlacedColumn[];
  readonly startWidth: number;
  readonly centreWidth: number;
  readonly endWidth: number;
}

interface PaneLayout {
  readonly placed: readonly PlacedColumn[];
  readonly width: number;
}

const DEFAULT_WIDTH = 160;
const SMALLEST_WIDTH = 48;

const widthOf = <T>(column: NuiGridColumn<T>): number =>
  Math.max(column.minWidth ?? SMALLEST_WIDTH, column.width ?? DEFAULT_WIDTH);

const alignOf = <T>(column: NuiGridColumn<T>): NuiGridAlign =>
  column.align ?? (column.type === 'number' ? 'end' : 'start');

const placePane = <T>(
  columns: readonly NuiGridColumn<T>[],
  pane: GridPaneName,
  first: number,
): PaneLayout => {
  const placed: PlacedColumn[] = [];
  let offset = 0;

  columns.forEach((column, index) => {
    const width = widthOf(column);
    const visual = first + index;

    placed.push({
      key: column.key,
      pane,
      visual,
      width,
      offset,
      cell: {
        key: column.key,
        colIndex: visual + 1,
        align: alignOf(column),
        wrap: column.wrap,
        style: { inlineSize: `${width}px` },
      },
    });

    offset += width;
  });

  return { placed, width: offset };
};

export interface LayoutOptions {
  readonly pins: NuiDataGridPins;
  readonly hidden: NuiDataGridHidden;
  readonly sticky: boolean;
}

const DEFAULT_OPTIONS: LayoutOptions = { pins: {}, hidden: [], sticky: true };

export const pinOf = <T>(
  column: NuiGridColumn<T>,
  pins: NuiDataGridPins,
): NuiGridPin | undefined => (column.key in pins ? (pins[column.key] ?? undefined) : column.pin);

export const gridLayout = <T>(
  columns: readonly NuiGridColumn<T>[],
  options: LayoutOptions = DEFAULT_OPTIONS,
): GridLayout => {
  const shown = columns.filter((column) => !options.hidden.includes(column.key));

  const inPane = (pin: NuiGridPin | undefined): NuiGridColumn<T>[] =>
    shown.filter((column) => pinOf(column, options.pins) === pin);

  const starts = inPane('start');
  const ends = inPane('end');
  const sticky = options.sticky;
  const start = placePane(sticky ? starts : [], 'start', 0);
  const scrolling = sticky ? inPane(undefined) : [...starts, ...inPane(undefined), ...ends];
  const centre = placePane(scrolling, 'centre', start.placed.length);
  const end = placePane(sticky ? ends : [], 'end', start.placed.length + centre.placed.length);

  return {
    start: start.placed,
    centre: centre.placed,
    end: end.placed,
    visual: [...start.placed, ...centre.placed, ...end.placed],
    startWidth: start.width,
    centreWidth: centre.width,
    endWidth: end.width,
  };
};

export const pinsFit = (layout: GridLayout, room: number): boolean =>
  room === 0 || layout.startWidth + layout.endWidth <= room - SMALLEST_WIDTH;

export const centreIndexOf = (layout: GridLayout, visual: number): number | undefined =>
  layout.visual[visual]?.pane === 'centre' ? visual - layout.start.length : undefined;

export const panesOf = (layout: GridLayout, centre: readonly number[]): GridPanes => {
  const first = centre[0];

  return {
    start: layout.start.map((column) => column.cell),
    centre: centre.flatMap((index) => {
      const column = layout.centre[index];
      return column === undefined ? [] : [column.cell];
    }),
    end: layout.end.map((column) => column.cell),
    centreInset: first === undefined ? 0 : (layout.centre[first]?.offset ?? 0),
  };
};
