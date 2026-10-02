import type { TablePageWindow, NuiTablePagination } from './table.types';

export interface TablePage extends TablePageWindow {
  readonly page: number;
  readonly pages: number;
}

export const pageCountOf = (count: number, pageSize: number): number =>
  Math.max(1, Math.ceil(count / Math.max(1, pageSize)));

const NO_DETAILS: readonly number[] = [];

const positionOf = (slot: number, details: readonly number[]): number => {
  let low = 0;
  let high = details.length;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);

    if ((details[middle] ?? 0) - middle <= slot) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return slot + low;
};

export const pageWindowOf = (
  count: number,
  page: number,
  pageSize: number,
  details: readonly number[] = NO_DETAILS,
): TablePage => {
  const size = Math.max(1, pageSize);
  const slots = count - details.length;
  const pages = pageCountOf(slots, size);
  const current = Math.min(Math.max(1, Math.trunc(page)), pages);
  const start = (current - 1) * size;

  return {
    start: positionOf(start, details),
    end: positionOf(Math.min(slots, start + size), details),
    page: current,
    pages,
  };
};

export const resolvePagination = (
  value: NuiTablePagination | boolean | undefined,
): NuiTablePagination | undefined => {
  if (value === true) {
    return {};
  }
  return value === false || value === undefined ? undefined : value;
};
