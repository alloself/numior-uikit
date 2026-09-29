import { computed, type ComputedRef, type Ref, type ShallowRef } from 'vue';
import type { CheckState } from '@numior/vue';
import type { GridEngine, GridNodeId } from '../engine';
import type { GridCellPosition, GridPageWindow, NuiTableSelection } from './data-grid.types';

export type GridSelectionKey<T> = GridNodeId | T;

export interface GridSelectionOptions<T> {
  readonly mode: () => NuiTableSelection | undefined;
  readonly selected: Ref<readonly T[]>;
  readonly keyOf: (row: T) => GridSelectionKey<T>;
  readonly engine: Readonly<ShallowRef<GridEngine<T>>>;
  readonly revision: Readonly<Ref<number>>;
  readonly scope: () => GridPageWindow;
  readonly disabled: () => boolean;
  readonly selectKeyAt: (visual: number) => boolean;
}

export interface GridSelection<T> {
  readonly enabled: ComputedRef<boolean>;
  readonly multiple: ComputedRef<boolean>;
  readonly headerState: ComputedRef<CheckState>;
  readonly headerDisabled: ComputedRef<boolean>;
  has(row: T): boolean;
  toggle(row: T): void;
  toggleAll(): void;
  onKeydown(event: KeyboardEvent, active: GridCellPosition, row: T | undefined): boolean;
}

const plainSpace = (event: KeyboardEvent): boolean =>
  event.key === ' ' && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;

const plainToggleAll = (event: KeyboardEvent): boolean =>
  (event.key === ' ' || event.key === 'Enter') &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.metaKey &&
  !event.shiftKey;

export const useTableSelection = <T>(options: GridSelectionOptions<T>): GridSelection<T> => {
  const enabled = computed(() => options.mode() !== undefined);
  const multiple = computed(() => options.mode() === 'multiple');

  const keys = computed(() => new Set(options.selected.value.map(options.keyOf)));

  const scopeRows = (): T[] => {
    const { start, end } = options.scope();
    const rows: T[] = [];

    for (let position = start; position < end; position += 1) {
      const node = options.engine.value.nodeAt(position);

      if (node?.kind === 'row') {
        rows.push(node.row);
      }
    }
    return rows;
  };

  const headerState = computed<CheckState>(() => {
    void options.revision.value;
    const chosen = keys.value;
    let selectedCount = 0;
    let total = 0;

    for (const row of scopeRows()) {
      total += 1;

      if (chosen.has(options.keyOf(row))) {
        selectedCount += 1;
      }
    }
    if (total === 0 || selectedCount === 0) {
      return 'unchecked';
    }
    return selectedCount === total ? 'checked' : 'indeterminate';
  });

  const headerDisabled = computed(() => {
    void options.revision.value;
    return options.disabled() || scopeRows().length === 0;
  });

  const has = (row: T): boolean => keys.value.has(options.keyOf(row));

  const without = (rows: readonly T[], dropped: ReadonlySet<GridSelectionKey<T>>): T[] =>
    rows.filter((row) => !dropped.has(options.keyOf(row)));

  const toggle = (row: T): void => {
    const chosen = has(row);

    if (!multiple.value) {
      options.selected.value = chosen ? [] : [row];
      return;
    }

    options.selected.value = chosen
      ? without(options.selected.value, new Set([options.keyOf(row)]))
      : [...options.selected.value, row];
  };

  const toggleAll = (): void => {
    const rows = scopeRows();
    const chosen = keys.value;
    const missing = rows.filter((row) => !chosen.has(options.keyOf(row)));

    options.selected.value =
      missing.length === 0
        ? without(options.selected.value, new Set(rows.map(options.keyOf)))
        : [...options.selected.value, ...missing];
  };

  const onKeydown = (
    event: KeyboardEvent,
    active: GridCellPosition,
    row: T | undefined,
  ): boolean => {
    if (!enabled.value || options.disabled()) {
      return false;
    }
    if (active.row === -1) {
      if (!multiple.value || !options.selectKeyAt(active.col) || !plainToggleAll(event)) {
        return false;
      }
      event.preventDefault();
      toggleAll();
      return true;
    }
    if (row === undefined || !plainSpace(event)) {
      return false;
    }
    event.preventDefault();
    toggle(row);
    return true;
  };

  return { enabled, multiple, headerState, headerDisabled, has, toggle, toggleAll, onKeydown };
};
