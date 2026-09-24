export type PaginationEntry = number | 'start-ellipsis' | 'end-ellipsis';

const range = (start: number, end: number): number[] =>
  Array.from({ length: Math.max(0, end - start + 1) }, (_, offset) => start + offset);

export const pageCountOf = (total: number, pageSize: number): number =>
  Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, pageSize)));

export const clampPage = (page: number, pageCount: number): number =>
  Math.min(pageCount, Math.max(1, Math.trunc(page) || 1));

export const paginationRange = (
  page: number,
  pageCount: number,
  siblings: number,
  boundaries: number,
): PaginationEntry[] => {
  const slots = boundaries * 2 + siblings * 2 + 3;
  if (pageCount <= slots) {
    return range(1, pageCount);
  }
  const startPages = range(1, boundaries);
  const endPages = range(pageCount - boundaries + 1, pageCount);

  const siblingsStart = Math.max(
    Math.min(page - siblings, pageCount - boundaries - siblings * 2 - 1),
    boundaries + 2,
  );

  const siblingsEnd = Math.min(
    Math.max(page + siblings, boundaries + siblings * 2 + 2),
    pageCount - boundaries - 1,
  );

  const before: PaginationEntry[] =
    siblingsStart > boundaries + 2
      ? ['start-ellipsis']
      : boundaries + 1 < pageCount - boundaries
        ? [boundaries + 1]
        : [];

  const after: PaginationEntry[] =
    siblingsEnd < pageCount - boundaries - 1
      ? ['end-ellipsis']
      : pageCount - boundaries > boundaries
        ? [pageCount - boundaries]
        : [];

  return [...startPages, ...before, ...range(siblingsStart, siblingsEnd), ...after, ...endPages];
};
