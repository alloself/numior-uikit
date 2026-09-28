import type { GridFilterValue, GridTextOp } from '../engine';
import type {
  NuiGridColumn,
  NuiGridColumnFilter as ColumnFilter,
  NuiGridFilterKind,
} from './data-grid.types';

export type FilterDraft =
  | { readonly kind: 'text'; op: GridTextOp; value: string }
  | { readonly kind: 'number'; min: number | null; max: number | null }
  | { readonly kind: 'date'; from: string | null; to: string | null }
  | { readonly kind: 'set'; values: GridFilterValue[] };

const DAY = 86_400_000;

export const filterKindOf = <T>(column: NuiGridColumn<T>): NuiGridFilterKind | undefined => {
  if (column.filter === false) {
    return undefined;
  }
  if (column.filter !== undefined) {
    return column.filter;
  }
  switch (column.type) {
    case 'text':
      return 'text';
    case 'number':
      return 'number';
    case 'date':
      return 'date';
    case 'boolean':
      return 'set';
  }
};

export const filterOf = (filters: readonly ColumnFilter[], key: string): ColumnFilter | undefined =>
  filters.find((filter) => filter.key === key);

export const withFilter = (
  filters: readonly ColumnFilter[],
  key: string,
  next: ColumnFilter | null,
): readonly ColumnFilter[] => [
  ...filters.filter((filter) => filter.key !== key),
  ...(next === null ? [] : [next]),
];

const isoDay = (time: number | undefined): string | null =>
  time === undefined ? null : new Date(time).toISOString().slice(0, 10);

const dayStart = (iso: string | null): number | undefined => {
  if (iso === null) {
    return undefined;
  }
  const time = Date.parse(`${iso}T00:00:00Z`);
  return Number.isNaN(time) ? undefined : time;
};

export const draftOf = (kind: NuiGridFilterKind, filter: ColumnFilter | undefined): FilterDraft => {
  switch (kind) {
    case 'text':
      return filter?.kind === 'text'
        ? { kind, op: filter.op, value: filter.value }
        : { kind, op: 'contains', value: '' };
    case 'number':
      return filter?.kind === 'number'
        ? { kind, min: filter.min ?? null, max: filter.max ?? null }
        : { kind, min: null, max: null };
    case 'date':
      return filter?.kind === 'date'
        ? { kind, from: isoDay(filter.from), to: isoDay(filter.to) }
        : { kind, from: null, to: null };
    case 'set':
      return { kind, values: filter?.kind === 'set' ? [...filter.values] : [] };
  }
};

const textFilter = (
  key: string,
  draft: Extract<FilterDraft, { kind: 'text' }>,
): ColumnFilter | null =>
  draft.op !== 'empty' && draft.value.trim() === ''
    ? null
    : { kind: 'text', key, op: draft.op, value: draft.value.trim() };

const numberFilter = (
  key: string,
  draft: Extract<FilterDraft, { kind: 'number' }>,
): ColumnFilter | null =>
  draft.min === null && draft.max === null
    ? null
    : { kind: 'number', key, min: draft.min ?? undefined, max: draft.max ?? undefined };

const dateFilter = (
  key: string,
  draft: Extract<FilterDraft, { kind: 'date' }>,
): ColumnFilter | null => {
  const from = dayStart(draft.from);
  const end = dayStart(draft.to);

  if (from === undefined && end === undefined) {
    return null;
  }
  return { kind: 'date', key, from, to: end === undefined ? undefined : end + DAY - 1 };
};

export const filterFromDraft = (key: string, draft: FilterDraft): ColumnFilter | null => {
  switch (draft.kind) {
    case 'text':
      return textFilter(key, draft);
    case 'number':
      return numberFilter(key, draft);
    case 'date':
      return dateFilter(key, draft);
    case 'set':
      return draft.values.length === 0 ? null : { kind: 'set', key, values: [...draft.values] };
  }
};
