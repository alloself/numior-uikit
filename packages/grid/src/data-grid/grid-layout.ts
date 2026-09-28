import type {
  GridCellLayout,
  GridPaneName,
  GridPanes,
  NuiGridAlign,
  NuiGridColumn,
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
        style: { insetInlineStart: `${offset}px`, inlineSize: `${width}px` },
      },
    });

    offset += width;
  });

  return { placed, width: offset };
};

export const gridLayout = <T>(columns: readonly NuiGridColumn<T>[]): GridLayout => {
  const start = placePane(
    columns.filter((column) => column.pin === 'start'),
    'start',
    0,
  );

  const centre = placePane(
    columns.filter((column) => column.pin === undefined),
    'centre',
    start.placed.length,
  );

  const end = placePane(
    columns.filter((column) => column.pin === 'end'),
    'end',
    start.placed.length + centre.placed.length,
  );

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

export const centreIndexOf = (layout: GridLayout, visual: number): number | undefined =>
  layout.visual[visual]?.pane === 'centre' ? visual - layout.start.length : undefined;

export const panesOf = (layout: GridLayout, centre: readonly number[]): GridPanes => ({
  start: layout.start.map((column) => column.cell),
  centre: centre.flatMap((index) => {
    const column = layout.centre[index];
    return column === undefined ? [] : [column.cell];
  }),
  end: layout.end.map((column) => column.cell),
});
