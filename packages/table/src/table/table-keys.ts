import { clamp } from '@vueuse/core';
import { Key, ListMove, listMoveFor } from '@numior/primitives';
import { NuiTableEdgeDirection, NuiTableEditMove, type TableCellPosition } from './table.types';

export type TableEdgeOf = (
  from: TableCellPosition,
  direction: NuiTableEdgeDirection,
) => TableCellPosition | undefined;

export interface TableBounds {
  readonly rows: number;
  readonly cols: number;
  readonly page: number;
  readonly rtl: boolean;
  readonly first?: number | undefined;
  readonly edge?: TableEdgeOf | undefined;
}

export interface TableKey {
  readonly key: string;
  readonly ctrl: boolean;
}

export interface TableSize {
  readonly rows: number;
  readonly cols: number;
}

export interface PageScale {
  readonly span: number;
  readonly offsetOf: (index: number) => number;
  readonly indexAt: (position: number) => number;
}

const lastRowOf = (bounds: TableBounds): number => (bounds.rows > 0 ? bounds.rows - 1 : -1);

export const stepCell = (
  from: TableCellPosition,
  move: NuiTableEditMove,
  size: TableSize,
): TableCellPosition => {
  switch (move) {
    case NuiTableEditMove.Down:
      return { row: Math.min(from.row + 1, size.rows - 1), col: from.col };
    case NuiTableEditMove.Up:
      return { row: Math.max(from.row - 1, 0), col: from.col };
    case NuiTableEditMove.Next:
      return { row: from.row, col: Math.min(from.col + 1, size.cols - 1) };
    case NuiTableEditMove.Previous:
      return { row: from.row, col: Math.max(from.col - 1, 0) };
    case NuiTableEditMove.Stay:
    case NuiTableEditMove.Fill:
    case NuiTableEditMove.Blur:
      return from;
  }
};

const windowHeight = (): number => (typeof window === 'undefined' ? 0 : window.innerHeight);

export const pageRowsOf = (viewport: number, size: number): number => {
  const span = viewport > 0 ? viewport : windowHeight();
  return Math.max(1, Math.floor((span - size) / size));
};

export const edgeDirectionOf = (key: string, rtl: boolean): NuiTableEdgeDirection | undefined => {
  if (key === Key.ArrowDown || key === Key.ArrowUp) {
    return key === Key.ArrowDown ? 'down' : 'up';
  }
  switch (listMoveFor(key, 'horizontal', rtl)) {
    case ListMove.Next:
      return 'next';
    case ListMove.Prev:
      return 'previous';
    default:
      return undefined;
  }
};

export const tableEdge = (
  from: TableCellPosition,
  direction: NuiTableEdgeDirection,
  rows: number,
  cols: number,
): TableCellPosition => {
  switch (direction) {
    case NuiTableEdgeDirection.Up:
      return { row: Math.min(from.row, 0), col: from.col };
    case NuiTableEdgeDirection.Down:
      return { row: Math.max(from.row, rows - 1), col: from.col };
    case NuiTableEdgeDirection.Previous:
      return { row: from.row, col: 0 };
    case NuiTableEdgeDirection.Next:
      return { row: from.row, col: Math.max(0, cols - 1) };
  }
};

export const pageStepOf = (scale: PageScale, from: number, forward: boolean): number => {
  const edge = forward ? scale.offsetOf(from) + scale.span : scale.offsetOf(from + 1) - scale.span;

  return Math.max(1, Math.abs(scale.indexAt(Math.max(0, edge)) - from) - 1);
};

const verticalTarget = (
  key: string,
  from: TableCellPosition,
  bounds: TableBounds,
): number | undefined => {
  const last = lastRowOf(bounds);
  const floor = from.row < 0 ? -1 : 0;

  switch (key) {
    case Key.ArrowDown:
      return Math.min(last, from.row + 1);
    case Key.ArrowUp:
      return Math.max(-1, from.row - 1);
    case Key.PageDown:
      return Math.min(last, from.row + bounds.page);
    case Key.PageUp:
      return Math.max(floor, from.row - bounds.page);
    default:
      return undefined;
  }
};

const edgeTarget = (
  input: TableKey,
  from: TableCellPosition,
  bounds: TableBounds,
): TableCellPosition | undefined => {
  const lastCol = Math.max(0, bounds.cols - 1);

  switch (input.key) {
    case Key.Home:
      return input.ctrl
        ? { row: bounds.rows > 0 ? 0 : -1, col: bounds.first ?? 0 }
        : { row: from.row, col: 0 };
    case Key.End:
      return input.ctrl
        ? { row: lastRowOf(bounds), col: lastCol }
        : { row: from.row, col: lastCol };
    default:
      return undefined;
  }
};

const horizontalTarget = (
  key: string,
  from: TableCellPosition,
  bounds: TableBounds,
): TableCellPosition | undefined => {
  const move = listMoveFor(key, 'horizontal', bounds.rtl);
  const lastCol = Math.max(0, bounds.cols - 1);

  if (move === ListMove.Next || move === ListMove.Prev) {
    return { row: from.row, col: clamp(from.col + (move === ListMove.Next ? 1 : -1), 0, lastCol) };
  }
  return undefined;
};

export const nextCell = (
  input: TableKey,
  from: TableCellPosition,
  bounds: TableBounds,
): TableCellPosition | undefined => {
  const direction = input.ctrl ? edgeDirectionOf(input.key, bounds.rtl) : undefined;

  if (direction !== undefined) {
    return bounds.edge?.(from, direction) ?? tableEdge(from, direction, bounds.rows, bounds.cols);
  }
  const row = verticalTarget(input.key, from, bounds);

  if (row !== undefined) {
    return { row, col: from.col };
  }
  return edgeTarget(input, from, bounds) ?? horizontalTarget(input.key, from, bounds);
};
