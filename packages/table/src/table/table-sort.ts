import type { TableSort } from '../engine';
import type { TableHeadState } from './table.types';

export interface HeadStateInput {
  readonly keys: readonly string[];
  readonly sort: readonly TableSort[];
  readonly sortable: (key: string) => boolean;
  readonly filterable: (key: string) => boolean;
  readonly filtered: (key: string) => boolean;
  readonly resizable: (key: string) => boolean;
  readonly resizing: (key: string) => boolean;
  readonly reorderable: (key: string) => boolean;
  readonly dragging: (key: string) => boolean;
}

const cycle = (key: string, current: TableSort | undefined): TableSort | null => {
  if (current === undefined) {
    return { key, direction: 'asc' };
  }
  return current.direction === 'asc' ? { key, direction: 'desc' } : null;
};

export const nextSort = (
  sort: readonly TableSort[],
  key: string,
  multi: boolean,
): readonly TableSort[] => {
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

export const headStates = (input: HeadStateInput): Readonly<Record<string, TableHeadState>> =>
  Object.fromEntries(
    input.keys.map((key) => {
      const position = input.sort.findIndex((entry) => entry.key === key);

      return [
        key,
        {
          sortable: input.sortable(key),
          direction: input.sort[position]?.direction,
          order: position >= 0 && input.sort.length > 1 ? position + 1 : undefined,
          primary: position === 0,
          filterable: input.filterable(key),
          filtered: input.filtered(key),
          resizable: input.resizable(key),
          resizing: input.resizing(key),
          reorderable: input.reorderable(key),
          dragging: input.dragging(key),
        },
      ];
    }),
  );
