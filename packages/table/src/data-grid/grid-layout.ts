import type {
  GridCellLayout,
  GridColumnKind,
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
  readonly kind: GridColumnKind;
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

interface PlaceInput {
  readonly key: string;
  readonly kind: GridColumnKind;
  readonly width: number;
  readonly align: NuiGridAlign;
  readonly wrap: boolean | undefined;
}

const DEFAULT_WIDTH = 160;
const SMALLEST_WIDTH = 48;
const UTILITY_WIDTH = 40;

const SELECT_KEY = '__select';

const SELECT_INPUT: PlaceInput = {
  key: SELECT_KEY,
  kind: 'select',
  width: UTILITY_WIDTH,
  align: 'center',
  wrap: undefined,
};

const widthOf = <T>(column: NuiGridColumn<T>): number =>
  Math.max(column.minWidth ?? SMALLEST_WIDTH, column.width ?? DEFAULT_WIDTH);

const alignOf = <T>(column: NuiGridColumn<T>): NuiGridAlign =>
  column.align ?? (column.type === 'number' ? 'end' : 'start');

const inputOf = <T>(column: NuiGridColumn<T>): PlaceInput => ({
  key: column.key,
  kind: 'data',
  width: widthOf(column),
  align: alignOf(column),
  wrap: column.wrap,
});

const placePane = (
  inputs: readonly PlaceInput[],
  pane: GridPaneName,
  first: number,
): PaneLayout => {
  const placed: PlacedColumn[] = [];
  let offset = 0;

  inputs.forEach((input, index) => {
    const visual = first + index;

    placed.push({
      key: input.key,
      kind: input.kind,
      pane,
      visual,
      width: input.width,
      offset,
      cell: {
        key: input.key,
        kind: input.kind,
        colIndex: visual + 1,
        align: input.align,
        wrap: input.wrap,
        style: { inlineSize: `${input.width}px` },
      },
    });

    offset += input.width;
  });

  return { placed, width: offset };
};

export interface LayoutOptions {
  readonly pins: NuiDataGridPins;
  readonly hidden: NuiDataGridHidden;
  readonly sticky: boolean;
  readonly select: boolean;
}

const DEFAULT_OPTIONS: LayoutOptions = { pins: {}, hidden: [], sticky: true, select: false };

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

  const starts = inPane('start').map(inputOf);
  const ends = inPane('end').map(inputOf);
  const utilities = options.select ? [SELECT_INPUT] : [];
  const sticky = options.sticky;
  const start = placePane([...utilities, ...(sticky ? starts : [])], 'start', 0);

  const scrolling = sticky
    ? inPane(undefined).map(inputOf)
    : [...starts, ...inPane(undefined).map(inputOf), ...ends];

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

export const dataKeysOf = (layout: GridLayout): string[] =>
  layout.visual.flatMap((column) => (column.kind === 'data' ? [column.key] : []));

export const dataKeyAt = (layout: GridLayout, visual: number): string | undefined => {
  const column = layout.visual[visual];
  return column?.kind === 'data' ? column.key : undefined;
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
