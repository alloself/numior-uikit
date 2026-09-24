import { computed, shallowReactive, type ComputedRef, type Ref } from 'vue';
import type { NuiOptionKey } from '../shared/options';
import { flattenRows, leafViews, type NuiTableRowView } from './rows';

export interface TableRowsOptions<T> {
  readonly rows: () => readonly T[];
  readonly pinnedRows: () => readonly T[];
  readonly keyOf: NuiOptionKey<T>;
  readonly getChildren: () => ((row: T) => readonly T[] | undefined) | undefined;
  readonly isExpandable: () => ((row: T) => boolean) | undefined;
  readonly expanded: Ref<T[]>;
  readonly sortLevel: (rows: readonly T[]) => T[];
  readonly onLoad: (row: T) => void;
}

export interface TableRows<T> {
  readonly views: ComputedRef<NuiTableRowView<T>[]>;
  readonly pinned: ComputedRef<NuiTableRowView<T>[]>;
  readonly tree: ComputedRef<boolean>;
  toggle(view: NuiTableRowView<T>): void;
}

export const useTableRows = <T>(options: TableRowsOptions<T>): TableRows<T> => {
  const pending = shallowReactive(new Set<string>());
  const expandedKeys = computed(() => new Set(options.expanded.value.map(options.keyOf)));
  const tree = computed(() => options.getChildren() !== undefined);
  const views = computed(() =>
    flattenRows(options.rows(), {
      keyOf: options.keyOf,
      getChildren: options.getChildren(),
      isExpandable: options.isExpandable(),
      expandedKeys: expandedKeys.value,
      pendingKeys: pending,
      sortLevel: options.sortLevel,
    }),
  );
  const pinned = computed(() => leafViews(options.pinnedRows(), options.keyOf));

  const toggle = (view: NuiTableRowView<T>): void => {
    if (!view.hasChildren) {
      return;
    }
    if (view.expanded) {
      options.expanded.value = options.expanded.value.filter(
        (row) => options.keyOf(row) !== view.key,
      );
      return;
    }
    if (options.getChildren()?.(view.row) === undefined) {
      pending.add(view.key);
      options.onLoad(view.row);
    }
    options.expanded.value = [...options.expanded.value, view.row];
  };

  return { views, pinned, tree, toggle };
};
