import { cellValue } from './cells';
import type { NuiSortDirection, NuiTableColumn, NuiTableSort } from './table.types';

type Primitive = number | string | boolean;

type SortKey = { readonly nullish: true } | { readonly nullish: false; readonly value: Primitive };

interface Decorated<T> {
  readonly row: T;
  readonly key: SortKey;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const isNullish = (value: unknown): boolean => value === null || value === undefined;

const primitiveOf = (value: unknown): Primitive => {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return typeof value === 'bigint' ? Number(value) : String(value);
};

const keyOf = (value: unknown): SortKey =>
  isNullish(value) ? { nullish: true } : { nullish: false, value: primitiveOf(value) };

const compareKeys = (left: SortKey, right: SortKey): number => {
  if (left.nullish || right.nullish) {
    return Number(left.nullish) - Number(right.nullish);
  }
  if (typeof left.value === 'string' || typeof right.value === 'string') {
    return collator.compare(String(left.value), String(right.value));
  }
  return Number(left.value) - Number(right.value);
};

export const defaultCompare = (a: unknown, b: unknown): number => compareKeys(keyOf(a), keyOf(b));

export const nextSort = (current: NuiTableSort, key: string): NuiTableSort => {
  if (current === null || current.key !== key) {
    return { key, direction: 'asc' };
  }
  return current.direction === 'asc' ? { key, direction: 'desc' } : null;
};

export const sortRows = <T>(
  rows: readonly T[],
  sort: NuiTableSort,
  columns: readonly NuiTableColumn<T>[],
): readonly T[] => {
  const column = sort === null ? undefined : columns.find((entry) => entry.key === sort.key);

  if (!column || sort === null) {
    return rows;
  }

  const sign = sort.direction === 'asc' ? 1 : -1;
  const custom = column.sort;

  if (custom) {
    return rows.toSorted((a, b) => custom(a, b) * sign);
  }

  return rows
    .map((row): Decorated<T> => ({ row, key: keyOf(cellValue(row, column)) }))
    .toSorted((left, right) => compareKeys(left.key, right.key) * sign)
    .map(({ row }) => row);
};

export const directionOf = (sort: NuiTableSort, key: string): NuiSortDirection | undefined =>
  sort !== null && sort.key === key ? sort.direction : undefined;

export const ariaSortOf = (
  sort: NuiTableSort,
  key: string,
): 'ascending' | 'descending' | undefined => {
  const direction = directionOf(sort, key);
  if (direction === undefined) {
    return undefined;
  }
  return direction === 'asc' ? 'ascending' : 'descending';
};
