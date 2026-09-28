import type { GridSort } from '../engine';
import type { GridHeadState } from './data-grid.types';

const cycle = (key: string, current: GridSort | undefined): GridSort | null => {
  if (current === undefined) {
    return { key, direction: 'asc' };
  }
  return current.direction === 'asc' ? { key, direction: 'desc' } : null;
};

export const nextSort = (
  sort: readonly GridSort[],
  key: string,
  multi: boolean,
): readonly GridSort[] => {
  const current = sort.find((entry) => entry.key === key);
  const next = cycle(key, current);

  if (!multi) {
    return next === null ? [] : [next];
  }
  if (next === null) {
    return sort.filter((entry) => entry.key !== key);
  }
  return current === undefined
    ? [...sort, next]
    : sort.map((entry) => (entry.key === key ? next : entry));
};

export const headStates = (
  keys: readonly string[],
  sortable: (key: string) => boolean,
  sort: readonly GridSort[],
): Readonly<Record<string, GridHeadState>> =>
  Object.fromEntries(
    keys.map((key) => {
      const position = sort.findIndex((entry) => entry.key === key);
      const entry = sort[position];

      return [
        key,
        {
          sortable: sortable(key),
          direction: entry?.direction,
          order: position >= 0 && sort.length > 1 ? position + 1 : undefined,
          primary: position === 0,
        },
      ];
    }),
  );
