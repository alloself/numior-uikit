import { clamp } from '@vueuse/core';
import { listMoveFor } from '@numior/primitives';
import type { TableCellPosition } from './table.types';

export interface TableBounds {
  readonly rows: number;
  readonly cols: number;
  readonly page: number;
  readonly rtl: boolean;
}

export interface TableKey {
  readonly key: string;
  readonly ctrl: boolean;
}

const lastRowOf = (bounds: TableBounds): number => (bounds.rows > 0 ? bounds.rows - 1 : -1);

const windowHeight = (): number => (typeof window === 'undefined' ? 0 : window.innerHeight);

export const pageRowsOf = (viewport: number, size: number): number => {
  const span = viewport > 0 ? viewport : windowHeight();
  return Math.max(1, Math.floor((span - size) / size));
};

export interface PageScale {
  readonly span: number;
  readonly offsetOf: (index: number) => number;
  readonly indexAt: (position: number) => number;
}

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
    case 'ArrowDown':
      return Math.min(last, from.row + 1);
    case 'ArrowUp':
      return Math.max(-1, from.row - 1);
    case 'PageDown':
      return Math.min(last, from.row + bounds.page);
    case 'PageUp':
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
    case 'Home':
      return input.ctrl ? { row: bounds.rows > 0 ? 0 : -1, col: 0 } : { row: from.row, col: 0 };
    case 'End':
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

  if (move === 'next' || move === 'prev') {
    return { row: from.row, col: clamp(from.col + (move === 'next' ? 1 : -1), 0, lastCol) };
  }
  return undefined;
};

export const nextCell = (
  input: TableKey,
  from: TableCellPosition,
  bounds: TableBounds,
): TableCellPosition | undefined => {
  const row = verticalTarget(input.key, from, bounds);

  if (row !== undefined) {
    return { row, col: from.col };
  }
  return edgeTarget(input, from, bounds) ?? horizontalTarget(input.key, from, bounds);
};
