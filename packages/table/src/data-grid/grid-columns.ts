import type { GridLayout, PlacedColumn } from './grid-layout';
import type {
  GridCellLayout,
  GridPaneName,
  GridPanes,
  NuiGridColumn,
  NuiGridColumnDef,
  NuiGridColumnGroup,
} from './data-grid.types';

export interface ColumnTree<T> {
  readonly leaves: readonly NuiGridColumn<T>[];
  readonly depth: number;
  readonly ancestors: ReadonlyMap<string, readonly NuiGridColumnGroup<T>[]>;
}

export interface HeaderBands {
  readonly rows: readonly GridPanes[];
  readonly labels: ReadonlyMap<string, string>;
}

interface OpenBand<T> {
  readonly group: NuiGridColumnGroup<T>;
  readonly pane: GridPaneName;
  readonly colIndex: number;
  readonly offset: number;
  readonly gap: number;
  width: number;
  span: number;
}

type PaneCursor = Map<GridPaneName, number>;

const isColumnGroup = <T>(def: NuiGridColumnDef<T>): def is NuiGridColumnGroup<T> =>
  'children' in def;

export const columnTreeOf = <T>(defs: readonly NuiGridColumnDef<T>[]): ColumnTree<T> => {
  const leaves: NuiGridColumn<T>[] = [];
  const ancestors = new Map<string, readonly NuiGridColumnGroup<T>[]>();
  let depth = 0;

  const walk = (list: readonly NuiGridColumnDef<T>[], path: readonly NuiGridColumnGroup<T>[]) => {
    for (const def of list) {
      if (isColumnGroup(def)) {
        walk(def.children, [...path, def]);
      } else {
        leaves.push(def);
        ancestors.set(def.key, path);
        depth = Math.max(depth, path.length);
      }
    }
  };

  walk(defs, []);
  return { leaves, depth, ancestors };
};

const bandCell = <T>(band: OpenBand<T>): GridCellLayout => ({
  key: `${band.group.key}@${band.colIndex}`,
  colIndex: band.colIndex,
  align: 'start',
  span: band.span,
  style: { inlineSize: `${band.width}px`, marginInlineStart: `${band.gap}px` },
});

const placeBand = <T>(
  bands: OpenBand<T>[],
  cursor: PaneCursor,
  group: NuiGridColumnGroup<T>,
  placed: PlacedColumn,
): void => {
  const last = bands.at(-1);
  const gap = placed.offset - (cursor.get(placed.pane) ?? 0);

  cursor.set(placed.pane, placed.offset + placed.width);

  if (
    last !== undefined &&
    last.group === group &&
    last.pane === placed.pane &&
    last.colIndex + last.span === placed.cell.colIndex
  ) {
    last.width += placed.width;
    last.span += 1;
    return;
  }

  bands.push({
    group,
    pane: placed.pane,
    colIndex: placed.cell.colIndex,
    offset: placed.offset,
    gap,
    width: placed.width,
    span: 1,
  });
};

const bandRow = <T>(layout: GridLayout, tree: ColumnTree<T>, level: number): OpenBand<T>[] => {
  const bands: OpenBand<T>[] = [];
  const cursor: PaneCursor = new Map();

  for (const placed of layout.visual) {
    const group = tree.ancestors.get(placed.key)?.[level];

    if (group !== undefined) {
      placeBand(bands, cursor, group, placed);
    }
  }
  return bands;
};

export const headerBandsOf = <T>(layout: GridLayout, tree: ColumnTree<T>): HeaderBands => {
  const labels = new Map<string, string>();

  const rows = Array.from({ length: tree.depth }, (_, level): GridPanes => {
    const bands = bandRow(layout, tree, level);
    const panes: Record<GridPaneName, GridCellLayout[]> = { start: [], centre: [], end: [] };

    for (const band of bands) {
      const cell = bandCell(band);

      labels.set(cell.key, band.group.label);
      panes[band.pane].push(cell);
    }
    return { ...panes, centreInset: 0 };
  });

  return { rows, labels };
};
