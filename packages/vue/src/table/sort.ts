import { cellValue } from './cells';
import type { NuiSortDirection, NuiTableColumn, NuiTableSort } from './table.types';

type Primitive = number | string | boolean;

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

const compareText = (left: string, right: string): number =>
  left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });

export const defaultCompare = (a: unknown, b: unknown): number => {
  if (isNullish(a) || isNullish(b)) {
    return Number(isNullish(a)) - Number(isNullish(b));
  }
  const left = primitiveOf(a);
  const right = primitiveOf(b);
  if (typeof left === 'string' || typeof right === 'string') {
    return compareText(String(left), String(right));
  }
  return Number(left) - Number(right);
};

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
): T[] => {
  const column = sort === null ? undefined : columns.find((entry) => entry.key === sort.key);
  if (!column || sort === null) {
    return [...rows];
  }
  const sign = sort.direction === 'asc' ? 1 : -1;
  const compare =
    column.sort ?? ((a: T, b: T) => defaultCompare(cellValue(a, column), cellValue(b, column)));
  return rows.toSorted((a, b) => compare(a, b) * sign);
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
