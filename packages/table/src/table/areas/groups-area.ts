import { computed, type ComputedRef, type Ref } from 'vue';
import {
  TableNodeKind,
  type TableDetailNode,
  type TableNode,
  type TableNodeId,
} from '../../engine';
import { detailSpotsOf, NO_DETAILS, NO_SPOTS, sameSpots } from '../table-detail';
import { dataKeyAt, dataKeysOf } from '../table-layout';
import { useTableExpansion, type TableExpansion } from '../use-table-expansion';
import { useTableTotals, type TableTotals } from '../use-table-totals';
import type {
  NuiTableColumn,
  NuiTableDetailSlot,
  NuiTableGroupBy,
  TableDetailSpot,
} from '../table.types';
import type { TableContext } from './table-context';

export interface GroupsAreaOptions<T> {
  readonly tree: () => boolean;
  readonly detailSlot: () => boolean;
  readonly groupBy: () => NuiTableGroupBy;
  readonly expanded: Ref<readonly TableNodeId[]>;
  readonly leaves: () => readonly NuiTableColumn<T>[];
  readonly treeColumn: () => string | undefined;
  readonly totalsLabel: () => string | undefined;
  readonly locale: () => string;
}

export interface GroupsArea<T> {
  readonly treeOn: ComputedRef<boolean>;
  readonly grouping: ComputedRef<NuiTableGroupBy>;
  readonly hierarchical: ComputedRef<boolean>;
  readonly detailPositions: ComputedRef<readonly number[]>;
  readonly detailSpots: ComputedRef<readonly TableDetailSpot[]>;
  readonly detailScope: (position: number) => NuiTableDetailSlot<T>;
  readonly treeKey: ComputedRef<string | undefined>;
  readonly totals: TableTotals<T>;
  readonly expansion: TableExpansion;
  readonly levelOf: (node: TableNode<T> | undefined) => number | undefined;
  readonly expandedOf: (node: TableNode<T> | undefined) => boolean | undefined;
}

const NO_GROUPS: NuiTableGroupBy = [];

export const useGroupsArea = <T>(
  table: TableContext<T>,
  own: GroupsAreaOptions<T>,
): GroupsArea<T> => {
  const treeOn = computed(own.tree);
  const detailOn = computed(() => own.detailSlot() && !treeOn.value);
  const grouping = computed(() => (treeOn.value ? NO_GROUPS : own.groupBy()));

  const hierarchical = computed(() => treeOn.value || detailOn.value || grouping.value.length > 0);

  const detailPositions = computed(() =>
    table.revision.read(() => (detailOn.value ? table.engine.value.details() : NO_DETAILS)),
  );

  const detailSpots = computed<readonly TableDetailSpot[]>((previous) => {
    const next = table.loading()
      ? NO_SPOTS
      : table.revision.read(() =>
          detailSpotsOf(
            table.engine.value,
            detailPositions.value,
            table.pageStart(),
            table.bodyRows(),
          ),
        );

    return previous !== undefined && sameSpots(previous, next) ? previous : next;
  });

  const detailAt = (position: number): TableDetailNode<T> => {
    const node = table.engine.value.nodeAt(table.pageStart() + position);

    if (node?.kind !== TableNodeKind.Detail) {
      throw new Error(`NuiTable has no detail at position ${position}`);
    }
    return node;
  };

  const detailScope = (position: number): NuiTableDetailSlot<T> => ({
    row: detailAt(position).row,
    position: position - 1,
  });

  const totals = useTableTotals({
    engine: table.engine,
    columns: own.leaves,
    keys: () => dataKeysOf(table.layout()),
    columnAt: table.columnAt,
    locale: own.locale,
    messages: table.messages,
    label: own.totalsLabel,
    rowCount: () => (table.loading() ? undefined : table.engine.value.rowCount()),
  });

  const treeKey = computed(() =>
    treeOn.value || detailOn.value
      ? (own.treeColumn() ?? dataKeysOf(table.layout())[0])
      : undefined,
  );

  const expansion = useTableExpansion({
    engine: table.engine,
    expanded: own.expanded,
    revision: table.revision,
    offset: table.pageStart,
    keys: () => dataKeysOf(table.layout()),
    keyAt: (visual) => dataKeyAt(table.layout(), visual),
    treeKey: () => treeKey.value,
    columnAt: table.columnAt,
    locale: own.locale,
    messages: table.messages,
    announce: table.announce,
    load: (row) => {
      table.emit('load', row);
    },
  });

  const levelOf = (node: TableNode<T> | undefined): number | undefined =>
    hierarchical.value && node !== undefined ? node.level + 1 : undefined;

  const expandedOf = (node: TableNode<T> | undefined): boolean | undefined =>
    node?.kind === TableNodeKind.Group || (node?.kind === TableNodeKind.Row && node.expandable)
      ? node.expanded
      : undefined;

  return {
    treeOn,
    grouping,
    hierarchical,
    detailPositions,
    detailSpots,
    detailScope,
    treeKey,
    totals,
    expansion,
    levelOf,
    expandedOf,
  };
};
