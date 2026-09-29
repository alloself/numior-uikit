import { computed, shallowRef, type ComputedRef, type ShallowRef } from 'vue';
import type { GridEngine, GridFilter, GridQuery } from '../engine';
import type { NuiDataGridMessages } from './data-grid.messages';
import { aggregateTextOf } from './grid-format';
import type { NuiDataGridFooterSlot, NuiGridColumn } from './data-grid.types';

export interface GridTotalsOptions<T> {
  readonly engine: Readonly<ShallowRef<GridEngine<T>>>;
  readonly columns: () => readonly NuiGridColumn<T>[];
  readonly keys: () => readonly string[];
  readonly columnAt: (key: string) => NuiGridColumn<T>;
  readonly locale: () => string;
  readonly messages: ComputedRef<NuiDataGridMessages>;
  readonly label: () => string | undefined;
  readonly rowCount: () => number;
}

export interface GridTotals<T> {
  readonly enabled: ComputedRef<boolean>;
  wanted(filters: readonly GridFilter[]): boolean;
  take(query: GridQuery): void;
  reset(): void;
  scope(key: string): NuiDataGridFooterSlot<T>;
  countText(count: number | undefined): string | undefined;
}

const keyOf = (filters: readonly GridFilter[]): string => JSON.stringify(filters);

export const useGridTotals = <T>(options: GridTotalsOptions<T>): GridTotals<T> => {
  const values = shallowRef<Readonly<Record<string, unknown>>>({});
  let computedFor: string | null = null;

  const enabled = computed(() =>
    options.columns().some((column) => column.aggregate !== undefined),
  );

  const labelKey = computed(() =>
    options.keys().find((key) => options.columnAt(key).aggregate === undefined),
  );

  const textOf = (column: NuiGridColumn<T>, value: unknown): string => {
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
