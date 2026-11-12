import { computed, shallowRef, type ComputedRef, type ShallowRef } from 'vue';
import type { TableEngine, TableFilter, TableQuery } from '../engine';
import type { NuiTableMessages } from './table.messages';
import { aggregateTextOf } from './table-format';
import type { NuiTableFooterSlot, NuiTableColumn } from './table.types';

export interface TableTotalsOptions<T> {
  readonly engine: Readonly<ShallowRef<TableEngine<T>>>;
  readonly columns: () => readonly NuiTableColumn<T>[];
  readonly keys: () => readonly string[];
  readonly columnAt: (key: string) => NuiTableColumn<T>;
  readonly locale: () => string;
  readonly messages: ComputedRef<NuiTableMessages>;
  readonly label: () => string | undefined;
  readonly rowCount: () => number | undefined;
}

export interface TableTotals<T> {
  readonly enabled: ComputedRef<boolean>;
  wanted(filters: readonly TableFilter[]): boolean;
  take(query: TableQuery): void;
  sync(): void;
  reset(): void;
  scope(key: string): NuiTableFooterSlot<T>;
  countText(count: number | undefined): string | undefined;
}

const keyOf = (filters: readonly TableFilter[]): string => JSON.stringify(filters);

export const useTableTotals = <T>(options: TableTotalsOptions<T>): TableTotals<T> => {
  const values = shallowRef<Readonly<Record<string, unknown>>>({});
  let computedFor: string | null = null;

  const enabled = computed(() =>
    options.columns().some((column) => column.aggregate !== undefined),
  );

  const labelKey = computed(() =>
    options.keys().find((key) => options.columnAt(key).aggregate === undefined),
  );

  const textOf = (column: NuiTableColumn<T>, value: unknown): string => {
    if (column.aggregate === undefined) {
      return column.key === labelKey.value
        ? (options.label() ?? options.messages.value.totals)
        : '';
    }
    return aggregateTextOf(column, value, options.locale(), options.messages.value);
  };

  return {
    enabled,
    wanted: (filters) => enabled.value && keyOf(filters) !== computedFor,
    take: (query) => {
      if (!enabled.value || (query.totals !== true && (query.groupBy?.length ?? 0) === 0)) {
        return;
      }
      values.value = options.engine.value.totals();
      computedFor = keyOf(query.filters ?? []);
    },
    sync: () => {
      if (!enabled.value) {
        return;
      }

      values.value = options.engine.value.totals();
    },
    reset: () => {
      computedFor = null;
    },
    scope: (key) => {
      const column = options.columnAt(key);
      const value = values.value[key];
      const count = column.key === labelKey.value ? options.rowCount() : undefined;

      return { column, value, text: textOf(column, value), count };
    },
    countText: (count) =>
      count === undefined ? undefined : options.messages.value.rowsCount({ count }),
  };
};
