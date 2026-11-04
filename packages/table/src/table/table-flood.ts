import {
  NuiTableAlign,
  TablePaneName,
  TablePlacementKind,
  type TableCellLayout,
  type TableCellPaint,
  type TableRowPaint,
} from './table.types';

export interface TableFloodCells {
  readonly count: number;
  readonly paneAt: (index: number) => TablePaneName | undefined;
  readonly widthAt: (index: number) => number;
  readonly freeAt: (index: number) => boolean;
  readonly needAt?: ((index: number) => number) | undefined;
}

export interface TableFloodRow extends TableFloodCells {
  readonly keyAt: (index: number) => string | undefined;
  readonly alignAt: (index: number) => NuiTableAlign;
  readonly flowsAt: (index: number) => boolean;
}

export interface TableFlood {
  readonly first: number;
  readonly last: number;
  readonly width: number;
}

interface FloodOrigin {
  readonly key: string;
  readonly paint: TableCellPaint;
  readonly flood: TableFlood;
}

const OVERFLOW = 'nui-table__cell--overflow';
const SEAMLESS = 'nui-table__cell--seamless';
const SEAM: TableCellPaint = { class: [SEAMLESS], style: {}, align: undefined, overflow: false };

export const paneOfCell = (cell: TableCellLayout | undefined): TablePaneName | undefined =>
  cell?.kind === TablePlacementKind.Data ? (cell.pin ?? 'centre') : undefined;

export const alignOfCell = (cell: TableCellLayout | undefined): NuiTableAlign =>
  cell === undefined || cell.kind === TablePlacementKind.Gap ? 'start' : cell.align;

const takes = (cells: TableFloodCells, index: number): boolean =>
  index >= 0 &&
  index < cells.count &&
  cells.paneAt(index) === TablePaneName.Centre &&
  cells.freeAt(index);

export const floodOf = (
  cells: TableFloodCells,
  origin: number,
  align: NuiTableAlign,
): TableFlood | undefined => {
  const step = align === NuiTableAlign.End ? -1 : 1;

  if (
    align === NuiTableAlign.Center ||
    cells.paneAt(origin) !== TablePaneName.Centre ||
    !takes(cells, origin + step)
  ) {
    return undefined;
  }
  const need = cells.needAt?.(origin) ?? Number.POSITIVE_INFINITY;
  let edge = origin;
  let width = cells.widthAt(origin);

  for (let index = origin + step; width < need && takes(cells, index); index += step) {
    edge = index;
    width += cells.widthAt(index);
  }
  return edge === origin
    ? undefined
    : { first: Math.min(origin, edge), last: Math.max(origin, edge), width };
};

const overflowing = (paint: TableCellPaint, width: number): TableCellPaint => ({
  ...paint,
  class: [...paint.class, OVERFLOW],
  style: { ...paint.style, '--_over-w': `${width}px` },
});

const seamless = (paint: TableCellPaint | undefined): TableCellPaint =>
  paint === undefined ? SEAM : { ...paint, class: [...paint.class, SEAMLESS] };

const originAt = (
  painted: TableRowPaint,
  row: TableFloodRow,
  cells: TableFloodCells,
  at: number,
): FloodOrigin | undefined => {
  const key = row.keyAt(at);
  const paint = key === undefined ? undefined : painted.get(key);

  if (key === undefined || paint?.overflow !== true || !row.flowsAt(at)) {
    return undefined;
  }
  const flood = floodOf(cells, at, paint.align ?? row.alignAt(at));

  return flood === undefined ? undefined : { key, paint, flood };
};

const claim = (
  next: Map<string, TableCellPaint>,
  taken: Set<number>,
  row: TableFloodRow,
  flood: TableFlood,
): void => {
  for (let index = flood.first; index <= flood.last; index += 1) {
    taken.add(index);

    if (index < flood.last) {
      const key = row.keyAt(index) ?? '';

      next.set(key, seamless(next.get(key)));
    }
  }
};

export const floodRow = (painted: TableRowPaint, row: TableFloodRow): TableRowPaint => {
  const next = new Map(painted);
  const taken = new Set<number>();

  const cells: TableFloodCells = {
    ...row,
    freeAt: (index) => !taken.has(index) && row.freeAt(index),
  };

  for (let at = 0; at < row.count; at += 1) {
    const origin = taken.has(at) ? undefined : originAt(painted, row, cells, at);

    if (origin !== undefined) {
      next.set(origin.key, overflowing(origin.paint, origin.flood.width));
      claim(next, taken, row, origin.flood);
    }
  }
  return next;
};
