import { clampPage, pageCountOf } from '../pagination/pagination-range';
import type { NuiTablePagination } from './table.types';

export const pageSlice = <T>(rows: readonly T[], page: number, pageSize: number): T[] => {
  const size = Math.max(1, pageSize);
  const current = clampPage(page, pageCountOf(rows.length, size));
  const start = (current - 1) * size;
  return rows.slice(start, start + size);
};

export const resolvePagination = (
  value: NuiTablePagination | boolean | undefined,
): NuiTablePagination | undefined => {
  if (value === true) {
    return {};
  }
  return value === false || value === undefined ? undefined : value;
};
