import { describe, expect, it } from 'vitest';
import { pageCountOf, pageWindowOf, resolvePagination } from '../src/table/table-pages';

describe('grid pages', () => {
  it('clamps the page and slices a window of the visible list', () => {
    expect(pageCountOf(0, 20)).toBe(1);
    expect(pageCountOf(41, 20)).toBe(3);
    expect(pageWindowOf(41, 3, 20)).toEqual({ start: 40, end: 41, page: 3, pages: 3 });
    expect(pageWindowOf(41, 9, 20)).toEqual({ start: 40, end: 41, page: 3, pages: 3 });
    expect(pageWindowOf(41, 0, 20)).toEqual({ start: 0, end: 20, page: 1, pages: 3 });
    expect(pageWindowOf(5, 1.7, 0)).toEqual({ start: 0, end: 1, page: 1, pages: 5 });
    expect(pageWindowOf(0, 1, 20)).toEqual({ start: 0, end: 0, page: 1, pages: 1 });
  });

  it('gives the details no slots of their own and keeps them on the page of their rows', () => {
    expect(pageWindowOf(7, 1, 2, [2])).toEqual({ start: 0, end: 3, page: 1, pages: 3 });
    expect(pageWindowOf(7, 2, 2, [2])).toEqual({ start: 3, end: 5, page: 2, pages: 3 });
    expect(pageWindowOf(8, 2, 2, [2, 4])).toEqual({ start: 3, end: 6, page: 2, pages: 3 });
    expect(pageWindowOf(8, 3, 2, [1, 7])).toEqual({ start: 5, end: 8, page: 3, pages: 3 });
    expect(pageWindowOf(4, 1, 20, [1, 3])).toEqual({ start: 0, end: 4, page: 1, pages: 1 });
  });

  it('turns the pagination prop into options', () => {
    expect(resolvePagination(true)).toEqual({});
    expect(resolvePagination(false)).toBeUndefined();
    expect(resolvePagination(undefined)).toBeUndefined();
    expect(resolvePagination({ pageSizes: [5, 10] })).toEqual({ pageSizes: [5, 10] });
  });
});
