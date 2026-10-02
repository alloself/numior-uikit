import { pinStyleOf, TRAIL_KEY, type PlacedColumn, type TableLayout } from './table-layout';
import type {
  TableBandRule,
  TableCellLayout,
  TableDataCell,
  TableGapCell,
  TableRowCells,
  NuiTableColumn,
  NuiTableColumnDef,
  NuiTableColumnGroup,
} from './table.types';

export interface ColumnTree<T> {
  readonly leaves: readonly NuiTableColumn<T>[];
  readonly depth: number;
  readonly ancestors: ReadonlyMap<string, readonly NuiTableColumnGroup<T>[]>;
}

export interface HeaderBands {
  readonly rows: readonly TableRowCells[];
  readonly labels: ReadonlyMap<string, string>;
}

interface OpenBand<T> {
  readonly group: NuiTableColumnGroup<T> | undefined;
  readonly first: TableCellLayout;
  last: TableCellLayout;
  colspan: number;
  span: number;
}

const isColumnGroup = <T>(def: NuiTableColumnDef<T>): def is NuiTableColumnGroup<T> =>
  'children' in def;

export const columnTreeOf = <T>(defs: readonly NuiTableColumnDef<T>[]): ColumnTree<T> => {
  const leaves: NuiTableColumn<T>[] = [];
  const ancestors = new Map<string, readonly NuiTableColumnGroup<T>[]>();
  let depth = 0;

  const walk = (list: readonly NuiTableColumnDef<T>[], path: readonly NuiTableColumnGroup<T>[]) => {
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

const pinStyleOver = (
  layout: TableLayout,
  placed: ReadonlyMap<string, PlacedColumn>,
  first: TableCellLayout,
  last: TableCellLayout,
): Readonly<Record<string, string>> | undefined => {
  const head = placed.get(first.key);
  const tail = placed.get(last.key);

  if (head === undefined || tail === undefined || first.pin === undefined) {
    return undefined;
  }
  const width = tail.offset + tail.width - head.offset;

  return pinStyleOf(first.pin, head.offset, width, layout.endWidth);
};

const isLabelled = <T>(band: OpenBand<T> | undefined): boolean =>
  band !== undefined && band.group !== undefined && band.first.kind === 'data';

const isPinEndEdge = (cell: TableCellLayout | undefined): boolean =>
  cell !== undefined && cell.pin === 'end' && cell.edge;

const closesAtPinEnd = <T>(bands: readonly OpenBand<T>[], index: number): boolean => {
  const next = bands[index + 1];

  if (next === undefined) {
    return true;
  }
  if (isPinEndEdge(next.first)) {
    return true;
  }
  return next.first.key === TRAIL_KEY && isPinEndEdge(bands[index + 2]?.first);
};

const ruleOf = <T>(bands: readonly OpenBand<T>[], index: number): TableBandRule | undefined => {
  const band = bands[index];
  const previous = bands[index - 1];

  if (band === undefined || !isLabelled(band)) {
    return undefined;
  }

  const start =
    previous !== undefined &&
    !isLabelled(previous) &&
    !previous.last.edge &&
    !isPinEndEdge(band.first);

  const end = !band.last.edge && !closesAtPinEnd(bands, index);

  if (start && end) {
    return 'both';
  }
  if (start) {
    return 'start';
  }
  return end ? 'end' : undefined;
};

const handleOf = <T>(band: OpenBand<T>): string | undefined => {
  const cell = band.first.pin === 'end' ? band.first : band.last;
  return cell.kind === 'data' ? cell.key : undefined;
};

const bandCellOf = <T>(
  band: OpenBand<T>,
  style: Readonly<Record<string, string>> | undefined,
  rule: TableBandRule | undefined,
): TableDataCell | TableGapCell => {
  const shared = {
    pin: band.first.pin,
    edge: band.first.pin === 'end' ? band.first.edge : band.last.edge,
    style,
    colspan: band.colspan,
  };

  if (band.group === undefined || band.first.kind === 'gap') {
    return { kind: 'gap', key: `__band-${band.first.key}`, ...shared };
  }
  return {
    kind: 'data',
    key: `${band.group.key}@${band.first.colIndex}`,
    colIndex: band.first.colIndex,
    align: 'start',
    wrap: false,
    span: band.span,
    tail: band.last.kind === 'data' && band.last.tail === true,
    handle: handleOf(band),
    rule,
    ...shared,
  };
};

const groupOf = <T>(
  tree: ColumnTree<T>,
  cell: TableCellLayout,
  level: number,
): NuiTableColumnGroup<T> | undefined =>
  cell.kind === 'data' ? tree.ancestors.get(cell.key)?.[level] : undefined;

const bandRowOf = <T>(
  layout: TableLayout,
  placed: ReadonlyMap<string, PlacedColumn>,
  tree: ColumnTree<T>,
  row: TableRowCells,
  level: number,
  labels: Map<string, string>,
): TableRowCells => {
  const bands: OpenBand<T>[] = [];

  for (const cell of row.cells) {
    const group = groupOf(tree, cell, level);
    const open = bands.at(-1);

    if (open !== undefined && open.group === group && open.first.pin === cell.pin) {
      open.last = cell;
      open.colspan += 1;
      open.span += cell.kind === 'data' ? 1 : 0;
    } else {
      bands.push({
        group,
        first: cell,
        last: cell,
        colspan: 1,
        span: cell.kind === 'data' ? 1 : 0,
      });
    }
  }

  const cells = bands.map((band, index) => {
    const cell = bandCellOf(
      band,
      pinStyleOver(layout, placed, band.first, band.last),
      ruleOf(bands, index),
    );

    if (band.group !== undefined) {
      labels.set(cell.key, band.group.label);
    }
    return cell;
  });

  return { cells, tracks: row.tracks };
};

export const headerBandsOf = <T>(
  layout: TableLayout,
  tree: ColumnTree<T>,
  row: TableRowCells,
): HeaderBands => {
  const labels = new Map<string, string>();
  const placed = new Map(layout.visual.map((column) => [column.key, column]));

  const rows = Array.from({ length: tree.depth }, (_, level) =>
    bandRowOf(layout, placed, tree, row, level, labels),
  );

  return { rows, labels };
};
