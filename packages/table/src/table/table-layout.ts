import type {
  TableCellLayout,
  TableColumnKind,
  TableDataCell,
  TableGapCell,
  TablePaneName,
  TableRowCells,
  TableTrack,
  NuiTableHidden,
  NuiTablePins,
  NuiTableAlign,
  NuiTableColumn,
  NuiTablePin,
} from './table.types';

export interface PlacedColumn {
  readonly key: string;
  readonly kind: TableColumnKind;
  readonly pane: TablePaneName;
  readonly visual: number;
  readonly width: number;
  readonly offset: number;
  readonly cell: TableDataCell;
}

export interface TableLayout {
  readonly start: readonly PlacedColumn[];
  readonly centre: readonly PlacedColumn[];
  readonly end: readonly PlacedColumn[];
  readonly visual: readonly PlacedColumn[];
  readonly startWidth: number;
  readonly centreWidth: number;
  readonly endWidth: number;
  readonly canvasWidth: number;
}

interface PaneLayout {
  readonly placed: readonly PlacedColumn[];
  readonly width: number;
}

interface PlaceInput {
  readonly key: string;
  readonly kind: TableColumnKind;
  readonly width: number;
  readonly flex: number;
  readonly align: NuiTableAlign;
  readonly wrap: boolean;
}

const DEFAULT_WIDTH = 160;
const SMALLEST_WIDTH = 48;
const UTILITY_WIDTH = 40;

const SELECT_KEY = '__select';
const TRAIL_KEY = '__trail';

const SELECT_INPUT: PlaceInput = {
  key: SELECT_KEY,
  kind: 'select',
  width: UTILITY_WIDTH,
  flex: 0,
  align: 'center',
  wrap: false,
};

const widthOf = <T>(column: NuiTableColumn<T>): number =>
  Math.max(column.minWidth ?? SMALLEST_WIDTH, column.width ?? DEFAULT_WIDTH);

const alignOf = <T>(column: NuiTableColumn<T>): NuiTableAlign =>
  column.align ?? (column.type === 'number' ? 'end' : 'start');

const inputOf = <T>(column: NuiTableColumn<T>, wrap: boolean): PlaceInput => ({
  key: column.key,
  kind: 'data',
  width: widthOf(column),
  flex: Math.max(0, column.flex ?? 0),
  align: alignOf(column),
  wrap: wrap && column.wrap === true,
});

const stretch = (inputs: readonly PlaceInput[], room: number): readonly PlaceInput[] => {
  const flexSum = inputs.reduce((sum, input) => sum + input.flex, 0);
  const free = room - inputs.reduce((sum, input) => sum + input.width, 0);

  if (room <= 0 || free <= 0 || flexSum === 0) {
    return inputs;
  }
  return inputs.map((input) =>
    input.flex === 0
      ? input
      : { ...input, width: input.width + Math.floor((free * input.flex) / flexSum) },
  );
};

export const pinStyleOf = (
  pane: TablePaneName,
  offset: number,
  width: number,
  paneWidth: number,
): Readonly<Record<string, string>> | undefined => {
  switch (pane) {
    case 'start':
      return { '--_pin': `${offset}px` };
    case 'end':
      return { '--_pin': `${paneWidth - offset - width}px` };
    case 'centre':
      return undefined;
  }
};

const placePane = (
  inputs: readonly PlaceInput[],
  pane: TablePaneName,
  first: number,
): PaneLayout => {
  const width = inputs.reduce((sum, input) => sum + input.width, 0);
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
        kind: input.kind,
        key: input.key,
        colIndex: visual + 1,
        align: input.align,
        wrap: input.wrap,
        pin: pane === 'centre' ? undefined : pane,
        edge: pane === 'start' ? index === inputs.length - 1 : pane === 'end' && index === 0,
        style: pinStyleOf(pane, offset, input.width, width),
        span: undefined,
        colspan: 1,
      },
    });

    offset += input.width;
  });

  return { placed, width };
};

export interface LayoutOptions {
  readonly pins: NuiTablePins;
  readonly hidden: NuiTableHidden;
  readonly sticky: boolean;
  readonly select: boolean;
  readonly room: number;
  readonly wrap: boolean;
}

const DEFAULT_OPTIONS: LayoutOptions = {
  pins: {},
  hidden: [],
  sticky: true,
  select: false,
  room: 0,
  wrap: true,
};

export const pinOf = <T>(column: NuiTableColumn<T>, pins: NuiTablePins): NuiTablePin | undefined =>
  column.key in pins ? (pins[column.key] ?? undefined) : column.pin;

export const tableLayout = <T>(
  columns: readonly NuiTableColumn<T>[],
  options: LayoutOptions = DEFAULT_OPTIONS,
): TableLayout => {
  const shown = columns.filter((column) => !options.hidden.includes(column.key));

  const inPane = (pin: NuiTablePin | undefined): PlaceInput[] =>
    shown
      .filter((column) => pinOf(column, options.pins) === pin)
      .map((column) => inputOf(column, options.wrap));

  const starts = inPane('start');
  const ends = inPane('end');
  const utilities = options.select ? [SELECT_INPUT] : [];
  const ordered = stretch([...utilities, ...starts, ...inPane(undefined), ...ends], options.room);
  const startCount = utilities.length + (options.sticky ? starts.length : 0);
  const endCount = options.sticky ? ends.length : 0;
  const start = placePane(ordered.slice(0, startCount), 'start', 0);

  const centre = placePane(
    ordered.slice(startCount, ordered.length - endCount),
    'centre',
    startCount,
  );

  const end = placePane(ordered.slice(ordered.length - endCount), 'end', ordered.length - endCount);

  return {
    start: start.placed,
    centre: centre.placed,
    end: end.placed,
    visual: [...start.placed, ...centre.placed, ...end.placed],
    startWidth: start.width,
    centreWidth: centre.width,
    endWidth: end.width,
    canvasWidth: start.width + centre.width + end.width,
  };
};

export const dataKeysOf = (layout: TableLayout): string[] =>
  layout.visual.flatMap((column) => (column.kind === 'data' ? [column.key] : []));

export const dataKeyAt = (layout: TableLayout, visual: number): string | undefined => {
  const column = layout.visual[visual];
  return column?.kind === 'data' ? column.key : undefined;
};

export const pinsFit = (layout: TableLayout, room: number): boolean =>
  room === 0 || layout.startWidth + layout.endWidth <= room - SMALLEST_WIDTH;

export const centreIndexOf = (layout: TableLayout, visual: number): number | undefined =>
  layout.visual[visual]?.pane === 'centre' ? visual - layout.start.length : undefined;

const gapCell = (key: string): TableGapCell => ({
  kind: 'gap',
  key,
  pin: undefined,
  edge: false,
  style: undefined,
  colspan: 1,
});

const trackOf = (column: PlacedColumn): TableTrack => ({ key: column.key, width: column.width });

export const rowCellsOf = (layout: TableLayout, centre: readonly number[]): TableRowCells => {
  const cells: TableCellLayout[] = layout.start.map((column) => column.cell);
  const tracks: TableTrack[] = layout.start.map(trackOf);
  let cursor = 0;

  for (const index of centre) {
    const column = layout.centre[index];

    if (column !== undefined) {
      if (column.offset > cursor) {
        const key = `__gap-${column.visual}`;

        cells.push(gapCell(key));
        tracks.push({ key, width: column.offset - cursor });
      }
      cells.push(column.cell);
      tracks.push(trackOf(column));
      cursor = column.offset + column.width;
    }
  }
  cells.push(gapCell(TRAIL_KEY), ...layout.end.map((column) => column.cell));
  tracks.push({ key: TRAIL_KEY, width: undefined }, ...layout.end.map(trackOf));
  return { cells, tracks };
};
