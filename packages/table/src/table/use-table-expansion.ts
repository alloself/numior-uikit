import { computed, shallowRef, type ComputedRef, type Ref, type ShallowRef } from 'vue';
import { formatNumber } from '@numior/primitives';
import type { TableEngine, TableGroupNode, TableNode, TableNodeId, TableRowNode } from '../engine';
import type { NuiTableMessages } from './table.messages';
import { aggregateTextOf, cellTextOf, cellValueFrom, valueTextOf } from './table-format';
import type {
  TableCellPosition,
  TableGroupCell,
  TableGroupRow,
  NuiTableColumn,
} from './table.types';

export interface TableExpansionOptions<T> {
  readonly engine: Readonly<ShallowRef<TableEngine<T>>>;
  readonly expanded: Ref<readonly TableNodeId[]>;
  readonly revision: Readonly<Ref<number>>;
  readonly offset: () => number;
  readonly keys: () => readonly string[];
  readonly keyAt: (visual: number) => string | undefined;
  readonly treeKey: () => string | undefined;
  readonly columnAt: (key: string) => NuiTableColumn<T>;
  readonly locale: () => string;
  readonly messages: ComputedRef<NuiTableMessages>;
  readonly announce: (text: string) => void;
  readonly load: (row: T) => void;
}

export interface TableExpansion {
  readonly loading: Readonly<ShallowRef<ReadonlySet<TableNodeId>>>;
  rowAt(position: number): TableGroupRow | undefined;
  toggle(position: number): void;
  settle(): void;
  onKeydown(event: KeyboardEvent, active: TableCellPosition): boolean;
}

interface GroupContext {
  readonly revision: number;
  readonly offset: number;
  readonly keys: readonly string[];
  readonly locale: string;
  readonly texts: NuiTableMessages;
  readonly rows: Map<number, TableGroupRow | null>;
}

const plainToggle = (event: KeyboardEvent): boolean =>
  (event.key === 'Enter' || event.key === ' ') &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.metaKey &&
  !event.shiftKey;

export const useTableExpansion = <T>(options: TableExpansionOptions<T>): TableExpansion => {
  const loading = shallowRef<ReadonlySet<TableNodeId>>(new Set());

  const context = computed<GroupContext>(() => ({
    revision: options.revision.value,
    offset: options.offset(),
    keys: options.keys(),
    locale: options.locale(),
    texts: options.messages.value,
    rows: new Map(),
  }));

  const groupLabel = (node: TableGroupNode, current: GroupContext): string => {
    const text = valueTextOf(
      options.columnAt(node.key),
      cellValueFrom(node.value),
      undefined,
      current.locale,
      current.texts,
    );

    return text === '' ? current.texts.blank : text;
  };

  const rowLabel = (node: TableRowNode<T>, current: GroupContext): string => {
    const key = options.treeKey();
    return key === undefined
      ? String(node.id)
      : cellTextOf(options.columnAt(key), node.row, current.locale, current.texts);
  };

  const cellOf = (
    node: TableGroupNode,
    key: string,
    current: GroupContext,
  ): TableGroupCell | undefined => {
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

  const build = (node: TableGroupNode, current: GroupContext): TableGroupRow => {
    const cells: Record<string, TableGroupCell> = {};

    for (const key of current.keys) {
      const cell = cellOf(node, key, current);

      if (cell !== undefined) {
        cells[key] = cell;
      }
    }
    return { id: node.id, cells };
  };

  const rowAt = (position: number): TableGroupRow | undefined => {
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

  const setLoading = (id: TableNodeId, active: boolean): void => {
    const next = new Set(loading.value);

    if (active) {
      next.add(id);
    } else {
      next.delete(id);
    }
    loading.value = next;
  };

  const announceToggle = (node: TableRowNode<T> | TableGroupNode, opening: boolean): void => {
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

    if (node === undefined || node.kind === 'detail' || (node.kind === 'row' && !node.expandable)) {
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

  const togglesAt = (node: TableNode<T> | undefined, col: number): boolean => {
    if (node?.kind === 'group') {
      return true;
    }
    return node?.kind === 'row' && node.expandable && options.keyAt(col) === options.treeKey();
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
