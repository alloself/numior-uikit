import { computed, watch, type ComputedRef, type Ref, type ShallowRef } from 'vue';
import type { NuiCheckState } from '@numior/vue';
import { TableNodeKind, type TableEngine, type TableNodeId } from '../engine';
import { NuiTableSelection, type NuiTableCellPosition, type TablePageWindow } from './table.types';
import { Key } from '@numior/primitives';

export type TableSelectionKey<T> = TableNodeId | T;

export interface TableSelectionOptions<T> {
  readonly mode: () => NuiTableSelection | undefined;
  readonly selected: Ref<readonly T[]>;
  readonly keyOf: (row: T) => TableSelectionKey<T>;
  readonly engine: Readonly<ShallowRef<TableEngine<T>>>;
  readonly revision: Readonly<Ref<number>>;
  readonly scope: () => TablePageWindow;
  readonly disabled: () => boolean;
  readonly selectKeyAt: (visual: number) => boolean;
}

export interface TableSelection<T> {
  readonly enabled: ComputedRef<boolean>;
  readonly multiple: ComputedRef<boolean>;
  readonly headerState: ComputedRef<NuiCheckState>;
  readonly headerDisabled: ComputedRef<boolean>;
  has(row: T): boolean;
  toggle(row: T): void;
  toggleAll(): void;
  onKeydown(event: KeyboardEvent, active: NuiTableCellPosition, row: T | undefined): boolean;
}

interface ScopeMix {
  readonly picked: boolean;
  readonly skipped: boolean;
}

const SCAN_BATCH = 4096;

const plainSpace = (event: KeyboardEvent): boolean =>
  event.key === Key.Space && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;

const plainToggleAll = (event: KeyboardEvent): boolean =>
  (event.key === Key.Space || event.key === Key.Enter) &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.metaKey &&
  !event.shiftKey;

export const useTableSelection = <T>(options: TableSelectionOptions<T>): TableSelection<T> => {
  const enabled = computed(() => options.mode() !== undefined);
  const multiple = computed(() => options.mode() === NuiTableSelection.Multiple);

  const keys = computed(() => new Set(options.selected.value.map(options.keyOf)));

  const rowsBetween = (start: number, end: number): T[] => {
    const engine = options.engine.value;
    const rows: T[] = [];

    for (let position = start; position < end; position += 1) {
      const node = engine.nodeAt(position);

      if (node?.kind !== TableNodeKind.Row) {
        continue;
      }

      rows.push(node.row);
    }
    return rows;
  };

  const scopeRows = (): T[] => {
    const { start, end } = options.scope();

    return rowsBetween(start, end);
  };

  const scopeHoldsRow = (): boolean => {
    const { start, end } = options.scope();
    const engine = options.engine.value;

    for (let position = start; position < end; position += 1) {
      if (engine.nodeAt(position)?.kind === TableNodeKind.Row) {
        return true;
      }
    }
    return false;
  };

  const scopeMix = (chosen: ReadonlySet<TableSelectionKey<T>>): ScopeMix => {
    const { start, end } = options.scope();
    const keyOf = options.keyOf;
    let picked = false;
    let skipped = false;

    for (let from = start; from < end && !(picked && skipped); from += SCAN_BATCH) {
      for (const row of rowsBetween(from, Math.min(end, from + SCAN_BATCH))) {
        const has = chosen.has(keyOf(row));

        picked ||= has;
        skipped ||= !has;
      }
    }
    return { picked, skipped };
  };

  const headerState = computed<NuiCheckState>(() => {
    void options.revision.value;
    const chosen = keys.value;

    if (chosen.size === 0) {
      return 'unchecked';
    }

    const mix = scopeMix(chosen);

    if (!mix.picked) {
      return 'unchecked';
    }
    return mix.skipped ? 'indeterminate' : 'checked';
  });

  const headerDisabled = computed(() => {
    void options.revision.value;
    return options.disabled() || !scopeHoldsRow();
  });

  const has = (row: T): boolean => keys.value.has(options.keyOf(row));

  const keepFirst = (single: boolean, wasMultiple: boolean): void => {
    const [first] = options.selected.value;
    const narrowed = single && wasMultiple && options.selected.value.length > 1;

    if (!narrowed || first === undefined) {
      return;
    }

    options.selected.value = [first];
  };

  const without = (rows: readonly T[], dropped: ReadonlySet<TableSelectionKey<T>>): T[] =>
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

    if (missing.length > 0) {
      options.selected.value = [...options.selected.value, ...missing];
      return;
    }

    options.selected.value =
      chosen.size === rows.length
        ? []
        : without(options.selected.value, new Set(rows.map(options.keyOf)));
  };

  const onKeydown = (
    event: KeyboardEvent,
    active: NuiTableCellPosition,
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

  watch(
    () => options.mode(),
    (mode, before) => {
      keepFirst(mode === NuiTableSelection.Single, before === NuiTableSelection.Multiple);
    },
  );

  return { enabled, multiple, headerState, headerDisabled, has, toggle, toggleAll, onKeydown };
};
