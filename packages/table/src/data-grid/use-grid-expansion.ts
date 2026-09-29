import { computed, shallowRef, type ComputedRef, type Ref, type ShallowRef } from 'vue';
import { formatNumber } from '@numior/primitives';
import type { GridEngine, GridGroupNode, GridNode, GridNodeId, GridRowNode } from '../engine';
import type { NuiDataGridMessages } from './data-grid.messages';
import { aggregateTextOf, cellTextOf, cellValueFrom, valueTextOf } from './grid-format';
import type {
  GridCellPosition,
  GridGroupCell,
  GridGroupRow,
  NuiGridColumn,
} from './data-grid.types';

export interface GridExpansionOptions<T> {
  readonly engine: Readonly<ShallowRef<GridEngine<T>>>;
  readonly expanded: Ref<readonly GridNodeId[]>;
  readonly revision: Readonly<Ref<number>>;
  readonly offset: () => number;
  readonly keys: () => readonly string[];
  readonly keyAt: (visual: number) => string | undefined;
  readonly treeKey: () => string | undefined;
  readonly columnAt: (key: string) => NuiGridColumn<T>;
  readonly locale: () => string;
  readonly messages: ComputedRef<NuiDataGridMessages>;
  readonly announce: (text: string) => void;
  readonly load: (row: T) => void;
}

export interface GridExpansion {
  readonly loading: Readonly<ShallowRef<ReadonlySet<GridNodeId>>>;
  rowAt(position: number): GridGroupRow | undefined;
  toggle(position: number): void;
  settle(): void;
  onKeydown(event: KeyboardEvent, active: GridCellPosition): boolean;
}

interface GroupContext {
  readonly revision: number;
  readonly offset: number;
  readonly keys: readonly string[];
  readonly locale: string;
  readonly texts: NuiDataGridMessages;
  readonly rows: Map<number, GridGroupRow | null>;
}

const plainToggle = (event: KeyboardEvent): boolean =>
  (event.key === 'Enter' || event.key === ' ') &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.metaKey &&
  !event.shiftKey;

export const useGridExpansion = <T>(options: GridExpansionOptions<T>): GridExpansion => {
  const loading = shallowRef<ReadonlySet<GridNodeId>>(new Set());

  const context = computed<GroupContext>(() => ({
    revision: options.revision.value,
    offset: options.offset(),
    keys: options.keys(),
    locale: options.locale(),
    texts: options.messages.value,
    rows: new Map(),
  }));

  const groupLabel = (node: GridGroupNode, current: GroupContext): string => {
    const text = valueTextOf(
      options.columnAt(node.key),
      cellValueFrom(node.value),
      undefined,
      current.locale,
      current.texts,
    );

    return text === '' ? current.texts.blank : text;
  };

  const rowLabel = (node: GridRowNode<T>, current: GroupContext): string => {
    const key = options.treeKey();
    return key === undefined
      ? String(node.id)
      : cellTextOf(options.columnAt(key), node.row, current.locale, current.texts);
  };

  const cellOf = (
    node: GridGroupNode,
    key: string,
    current: GroupContext,
  ): GridGroupCell | undefined => {
    if (key === node.key) {
      return {
        kind: 'toggle',
        text: groupLabel(node, current),
        count: `(${formatNumber(node.count, current.locale)})`,
      };
    }
    const column = options.columnAt(key);

    if (column.aggregate === undefined) {
      return undefined;
    }
    const text = aggregateTextOf(column, node.aggregates[key], current.locale, current.texts);
    return text === '' ? undefined : { kind: 'value', text };
  };

  const build = (node: GridGroupNode, current: GroupContext): GridGroupRow => {
    const cells: Record<string, GridGroupCell> = {};

    for (const key of current.keys) {
      const cell = cellOf(node, key, current);

      if (cell !== undefined) {
        cells[key] = cell;
      }
    }
    return { id: node.id, cells };
  };

  const rowAt = (position: number): GridGroupRow | undefined => {
    const current = context.value;
    const known = current.rows.get(position);

    if (known !== undefined) {
      return known ?? undefined;
    }
    const node = options.engine.value.nodeAt(current.offset + position);
    const row = node?.kind === 'group' ? build(node, current) : null;

    current.rows.set(position, row);
    return row ?? undefined;
  };

  const setLoading = (id: GridNodeId, active: boolean): void => {
    const next = new Set(loading.value);

    if (active) {
      next.add(id);
    } else {
      next.delete(id);
    }
    loading.value = next;
  };

  const announceToggle = (node: GridNode<T>, opening: boolean): void => {
    const texts = options.messages.value;

    if (node.kind === 'group') {
      const group = groupLabel(node, context.value);
      options.announce(opening ? texts.groupExpanded({ group }) : texts.groupCollapsed({ group }));
      return;
    }
    const row = rowLabel(node, context.value);
    options.announce(opening ? texts.rowExpanded({ row }) : texts.rowCollapsed({ row }));
  };

  const toggle = (position: number): void => {
    const node = options.engine.value.nodeAt(options.offset() + position);

    if (node === undefined || (node.kind === 'row' && !node.expandable)) {
      return;
    }
    const opening = !node.expanded;
    const ids = options.expanded.value;

    options.expanded.value = opening ? [...ids, node.id] : ids.filter((id) => id !== node.id);

    if (node.kind === 'row' && node.unloaded) {
      setLoading(node.id, opening);

      if (opening) {
        options.load(node.row);
      }
    }
    announceToggle(node, opening);
  };

  const togglesAt = (node: GridNode<T> | undefined, col: number): boolean => {
    if (node?.kind === 'group') {
      return true;
    }
    return node?.expandable === true && options.keyAt(col) === options.treeKey();
  };

  return {
    loading,
    rowAt,
    toggle,
    settle: () => {
      if (loading.value.size > 0) {
        loading.value = new Set();
      }
    },
    onKeydown: (event, active) => {
      const node = options.engine.value.nodeAt(options.offset() + active.row);

      if (!plainToggle(event) || !togglesAt(node, active.col)) {
        return false;
      }
      event.preventDefault();
      toggle(active.row);
      return true;
    },
  };
};
