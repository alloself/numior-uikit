import { TableTextOp, type TableFilterValue } from '../engine';
import {
  NuiTableColumnType,
  NuiTableFilterKind,
  type NuiTableColumn,
  type NuiTableColumnFilter as ColumnFilter,
} from './table.types';

export type FilterDraft =
  | { readonly kind: typeof NuiTableFilterKind.Text; op: TableTextOp; value: string }
  | { readonly kind: typeof NuiTableFilterKind.Number; min: number | null; max: number | null }
  | { readonly kind: typeof NuiTableFilterKind.Date; from: string | null; to: string | null }
  | { readonly kind: typeof NuiTableFilterKind.Set; values: TableFilterValue[] };

const DAY = 86_400_000;

export const filterKindOf = <T>(column: NuiTableColumn<T>): NuiTableFilterKind | undefined => {
  if (column.filter === false) {
    return undefined;
  }
  if (column.filter !== undefined) {
    return column.filter;
  }
  switch (column.type) {
    case NuiTableColumnType.Text:
      return 'text';
    case NuiTableColumnType.Number:
      return 'number';
    case NuiTableColumnType.Date:
      return 'date';
    case NuiTableColumnType.Boolean:
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

export const draftOf = (
  kind: NuiTableFilterKind,
  filter: ColumnFilter | undefined,
): FilterDraft => {
  switch (kind) {
    case NuiTableFilterKind.Text:
      return filter?.kind === NuiTableFilterKind.Text
        ? { kind, op: filter.op, value: filter.value }
        : { kind, op: 'contains', value: '' };
    case NuiTableFilterKind.Number:
      return filter?.kind === NuiTableFilterKind.Number
        ? { kind, min: filter.min ?? null, max: filter.max ?? null }
        : { kind, min: null, max: null };
    case NuiTableFilterKind.Date:
      return filter?.kind === NuiTableFilterKind.Date
        ? { kind, from: isoDay(filter.from), to: isoDay(filter.to) }
        : { kind, from: null, to: null };
    case NuiTableFilterKind.Set:
      return { kind, values: filter?.kind === NuiTableFilterKind.Set ? [...filter.values] : [] };
  }
};

const textFilter = (
  key: string,
  draft: Extract<FilterDraft, { kind: 'text' }>,
): ColumnFilter | null =>
  draft.op !== TableTextOp.Empty && draft.value.trim() === ''
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
    case NuiTableFilterKind.Text:
      return textFilter(key, draft);
    case NuiTableFilterKind.Number:
      return numberFilter(key, draft);
    case NuiTableFilterKind.Date:
      return dateFilter(key, draft);
    case NuiTableFilterKind.Set:
      return draft.values.length === 0 ? null : { kind: 'set', key, values: [...draft.values] };
  }
};
