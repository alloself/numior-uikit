import { computed, type ComputedRef, type Ref, type ShallowRef } from 'vue';
import { formatNumber } from '@numior/primitives';
import type { GridEngine, GridGroupNode, GridNodeId } from '../engine';
import type { NuiDataGridMessages } from './data-grid.messages';
import { aggregateTextOf, cellValueFrom, valueTextOf } from './grid-format';
import type {
  GridCellPosition,
  GridGroupCell,
  GridGroupRow,
  NuiGridColumn,
} from './data-grid.types';

export interface GridGroupsOptions<T> {
  readonly engine: Readonly<ShallowRef<GridEngine<T>>>;
  readonly expanded: Ref<readonly GridNodeId[]>;
  readonly revision: Readonly<Ref<number>>;
  readonly keys: () => readonly string[];
  readonly columnAt: (key: string) => NuiGridColumn<T>;
  readonly locale: () => string;
  readonly messages: ComputedRef<NuiDataGridMessages>;
  readonly announce: (text: string) => void;
}

export interface GridGroups {
  rowAt(position: number): GridGroupRow | undefined;
  toggle(position: number): void;
  onKeydown(event: KeyboardEvent, active: GridCellPosition): boolean;
}

interface GroupContext {
  readonly revision: number;
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

export const useGridGroups = <T>(options: GridGroupsOptions<T>): GridGroups => {
  const context = computed<GroupContext>(() => ({
    revision: options.revision.value,
    keys: options.keys(),
    locale: options.locale(),
    texts: options.messages.value,
    rows: new Map(),
  }));

  const labelOf = (node: GridGroupNode, current: GroupContext): string => {
    const text = valueTextOf(
      options.columnAt(node.key),
      cellValueFrom(node.value),
      undefined,
      current.locale,
      current.texts,
    );

    return text === '' ? current.texts.blank : text;
  };

  const cellOf = (
    node: GridGroupNode,
    key: string,
    current: GroupContext,
  ): GridGroupCell | undefined => {
    if (key === node.key) {
      return {
        kind: 'toggle',
        text: labelOf(node, current),
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
    return { id: node.id, expanded: node.expanded, cells };
  };

  const rowAt = (position: number): GridGroupRow | undefined => {
    const current = context.value;
    const known = current.rows.get(position);

    if (known !== undefined) {
      return known ?? undefined;
    }
    const node = options.engine.value.nodeAt(position);
    const row = node?.kind === 'group' ? build(node, current) : null;

    current.rows.set(position, row);
    return row ?? undefined;
  };

  const toggle = (position: number): void => {
    const node = options.engine.value.nodeAt(position);

    if (node?.kind !== 'group') {
      return;
    }
    const ids = options.expanded.value;
    const texts = options.messages.value;
    const group = labelOf(node, context.value);

    options.expanded.value = node.expanded ? ids.filter((id) => id !== node.id) : [...ids, node.id];

    options.announce(
      node.expanded ? texts.groupCollapsed({ group }) : texts.groupExpanded({ group }),
    );
  };

  return {
    rowAt,
    toggle,
    onKeydown: (event, active) => {
      if (!plainToggle(event) || options.engine.value.nodeAt(active.row)?.kind !== 'group') {
        return false;
      }
      event.preventDefault();
      toggle(active.row);
      return true;
    },
  };
};
