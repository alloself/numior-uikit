import type { GridPageWindow, NuiTablePagination } from './data-grid.types';

export interface GridPage extends GridPageWindow {
  readonly page: number;
  readonly pages: number;
}

export const pageCountOf = (count: number, pageSize: number): number =>
  Math.max(1, Math.ceil(count / Math.max(1, pageSize)));

export const pageWindowOf = (count: number, page: number, pageSize: number): GridPage => {
  const size = Math.max(1, pageSize);
  const pages = pageCountOf(count, size);
  const current = Math.min(Math.max(1, Math.trunc(page)), pages);
  const start = (current - 1) * size;

  return { start, end: Math.min(count, start + size), page: current, pages };
};

export const resolvePagination = (
  value: NuiTablePagination | boolean | undefined,
): NuiTablePagination | undefined => {
  if (value === true) {
    return {};
  }
  return value === false || value === undefined ? undefined : value;
};
