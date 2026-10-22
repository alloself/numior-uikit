import type { NodeId } from '@numior/editor-core';
import type { NuiTableColumnFilter, NuiTableFilters, NuiTableSort } from '@numior/table';
import type {
  NuiContentTableColumn,
  NuiContentTableFilter,
  NuiContentTableSort,
} from '../content/content.types';

export interface NuiContentColumnFilter {
  readonly column: NodeId;
  readonly filter: NuiContentTableFilter;
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/u;

const dayOf = (iso: string | null): number | undefined => {
  const parts = ISO.exec(iso ?? '');

  return parts === null
    ? undefined
    : Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
};

const isoOf = (time: number | undefined): string | null =>
  time === undefined ? null : new Date(time).toISOString().slice(0, 10);

const tableFilterOf = (key: NodeId, filter: NuiContentTableFilter): NuiTableColumnFilter => {
  switch (filter.kind) {
    case 'text':
      return { kind: 'text', key, op: filter.op, value: filter.value };
    case 'number':
      return { kind: 'number', key, min: filter.min ?? undefined, max: filter.max ?? undefined };
    case 'date':
      return { kind: 'date', key, from: dayOf(filter.from), to: dayOf(filter.to) };
    case 'set':
      return { kind: 'set', key, values: filter.values };
  }
};

const contentFilterOf = (filter: NuiTableColumnFilter): NuiContentTableFilter => {
  switch (filter.kind) {
    case 'text':
      return { kind: 'text', op: filter.op, value: filter.value };
    case 'number':
      return { kind: 'number', min: filter.min ?? null, max: filter.max ?? null };
    case 'date':
      return { kind: 'date', from: isoOf(filter.from), to: isoOf(filter.to) };
    case 'set':
      return { kind: 'set', values: filter.values };
  }
};

export const tableSortOf = (sort: readonly NuiContentTableSort[]): NuiTableSort =>
  sort.map((entry) => ({ key: entry.column, direction: entry.direction }));

export const contentSortOf = (sort: NuiTableSort): readonly NuiContentTableSort[] =>
  sort.map((entry) => ({ column: entry.key, direction: entry.direction }));

export const tableFiltersOf = (columns: readonly NuiContentTableColumn[]): NuiTableFilters =>
  columns.flatMap((column) =>
    column.filter === undefined ? [] : [tableFilterOf(column.id, column.filter)],
  );

export const contentFiltersOf = (filters: NuiTableFilters): readonly NuiContentColumnFilter[] =>
  filters.map((filter) => ({ column: filter.key, filter: contentFilterOf(filter) }));
