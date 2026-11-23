import {
  computed,
  onBeforeUpdate,
  shallowRef,
  type ComputedRef,
  type ShallowRef,
  type Slots,
} from 'vue';
import { NuiCheckState } from '@numior/vue';
import { TableNodeKind, type TableNode, type TableNodeId } from '../../engine';
import { keptRows, keptViews } from '../kept-rows';
import { countBelow, detailsBefore } from '../table-detail';
import { dataKeysOf, ROW_HEAD_KEY, SELECT_KEY, sizedRowStyle } from '../table-layout';
import type { TableSelection } from '../use-table-selection';
import {
  NuiTableColumnType,
  TableBodyPart,
  type NuiTableCellEditorProps,
  type NuiTableCellPosition,
  type NuiTableRowHeaders,
  type NuiTableRowHeights,
  type NuiTableRowProps,
  type NuiTableUtilityCellProps,
  type TableBodyRow,
  type TableBodyRowContext,
  type TableBodyRowView,
  type TableCellContent,
  type TableCellLead,
  type TableCellView,
  type TableLeadSpan,
  type TablePinnedRow,
  type TableRowMode,
  type TableRowPainter,
  type TableRowRanges,
  type TableRowSpan,
  type TableSkeletonRow,
} from '../table.types';
import type { GroupsArea } from './groups-area';
import type { RowMovesArea } from './row-moves-area';
import type { TableContext } from './table-context';

export interface ViewsAreaOptions<T> {
  readonly slots: Slots;
  readonly rowHead: () => NuiTableRowHeaders<T> | undefined;
  readonly rowLabel: () => ((row: T) => string) | undefined;
  readonly dragLabel: () => ((row: T) => string) | undefined;
  readonly striped: () => boolean;
  readonly grips: () => boolean;
  readonly selectable: () => boolean;
  readonly pinned: () => readonly T[];
  readonly getKey: () => ((row: T) => TableNodeId) | undefined;
  readonly heights: () => NuiTableRowHeights;
  readonly rowMode: () => TableRowMode;
  readonly skeletons: () => number;
  readonly firstOrdinal: () => number;
  readonly selectText: () => string;
  readonly selectAllText: () => string;
  readonly selection: TableSelection<T>;
  readonly groups: Pick<
    GroupsArea<T>,
    | 'treeOn'
    | 'treeKey'
    | 'detailPositions'
    | 'detailSpots'
    | 'detailScope'
    | 'expansion'
    | 'levelOf'
    | 'expandedOf'
  >;
  readonly moves: Pick<
    RowMovesArea,
    | 'dragEnabled'
    | 'rowDrag'
    | 'rowResize'
    | 'sizableOf'
    | 'grabAt'
    | 'onRowResize'
    | 'onRowResetSize'
  >;
  readonly editingCell: () =>
    | { readonly position: NuiTableCellPosition; readonly key: string }
    | undefined;
  readonly editor: () => NuiTableCellEditorProps | undefined;
  readonly update: (value: unknown) => void;
  readonly paint: () => TableRowPainter | undefined;
  readonly activeIn: (position: number) => number;
  readonly revisionOf: (position: number) => number;
  readonly segmentsOf: (row: number) => TableRowRanges | undefined;
  readonly merged: () => boolean;
  readonly spans: (item: TableBodyRow) => TableRowSpan | undefined;
  readonly ally: (item: TableBodyRow) => NuiTableCellPosition | undefined;
  readonly hostsCursor: (span: TableLeadSpan) => boolean;
  readonly sync: () => void;
}

export interface ViewsArea<T> {
  readonly skeletonRows: ComputedRef<TableSkeletonRow[]>;
  readonly bodyRows: ComputedRef<readonly TableBodyRow[]>;
  readonly bodyViews: ComputedRef<readonly TableBodyRowView<T>[]>;
  readonly pinnedItems: ComputedRef<TablePinnedRow<T>[]>;
  readonly pinnedUtility: (item: TablePinnedRow<T>, column: string) => NuiTableUtilityCellProps;
  readonly headUtility: (column: string) => NuiTableUtilityCellProps;
  readonly bodyContext: TableBodyRowContext<T>;
  readonly cellSlots: Readonly<ShallowRef<Array<`cell-${string}`>>>;
  readonly cellSlotted: ComputedRef<boolean>;
  readonly labelOf: (row: T) => string;
  readonly rowLabelAt: (position: number) => string;
  readonly plainText: (row: T, position: number, key: string) => string | undefined;
}

const NO_UTILITY: NuiTableUtilityCellProps = { control: 'none' };

const awaited = (
  node: TableNode<unknown> | undefined,
  pending: ReadonlySet<TableNodeId>,
): boolean =>
  node !== undefined && (pending.has(node.id) || (node.kind === TableNodeKind.Row && node.loading));

const isCellSlot = (name: string): name is `cell-${string}` => name.startsWith('cell-');

export const useViewsArea = <T>(table: TableContext<T>, own: ViewsAreaOptions<T>): ViewsArea<T> => {
  const { groups, moves, selection } = own;

  const ordinalBase = computed(own.firstOrdinal);

  const ordinalOf = (position: number): number =>
    ordinalBase.value +
    position +
    1 -
    countBelow(groups.detailPositions.value, table.pageStart() + position);

  const headUtility = (column: string): NuiTableUtilityCellProps => {
    if (column === ROW_HEAD_KEY) {
      return { control: 'corner', label: table.messages.value.rowHeaders };
    }
    return column === SELECT_KEY && selection.multiple.value
      ? {
          control: 'checkbox',
          checked: selection.headerState.value === NuiCheckState.Checked,
          indeterminate: selection.headerState.value === NuiCheckState.Indeterminate,
          disabled: selection.headerDisabled.value,
          label: own.selectAllText(),
        }
      : NO_UTILITY;
  };

  const labelOf = (row: T): string => {
    const keys = dataKeysOf(table.layout());

    const first =
      keys.find((key) => table.columnAt(key).type === NuiTableColumnType.Text) ?? keys[0];

    return own.rowLabel()?.(row) ?? (first === undefined ? '' : table.textOf(row, first));
  };

  const rowHeadText = (item: TableBodyRow): string => {
    const labelOfRow = own.rowHead()?.label;
    const row = item.pending ? undefined : table.rowAtPosition(item.index);

    if (labelOfRow === undefined) {
      return item.group === undefined ? String(ordinalOf(item.index)) : '';
    }
    return row === undefined ? '' : labelOfRow(row, item.index);
  };

  const rowUtility = (item: TableBodyRow, column: string): NuiTableUtilityCellProps => {
    if (column === ROW_HEAD_KEY) {
      return { control: 'label', text: rowHeadText(item) };
    }
    return item.selected === undefined
      ? NO_UTILITY
      : { control: 'checkbox', checked: item.selected, label: own.selectText() };
  };

  const gripLabel = (item: TableBodyRow): string =>
    own.dragLabel()?.(table.rowAt(item.index)) ??
    table.messages.value.dragRow({ row: labelOf(table.rowAt(item.index)) });

  const selectedOf = (node: TableNode<T> | undefined): boolean | undefined =>
    own.selectable() && node?.kind === TableNodeKind.Row ? selection.has(node.row) : undefined;

  const sizedOf = (
    node: TableNode<T> | undefined,
  ): Readonly<Record<string, string>> | undefined => {
    const pixels = node?.kind === TableNodeKind.Row ? own.heights()[String(node.id)] : undefined;

    return pixels === undefined ? undefined : sizedRowStyle(pixels, own.rowMode());
  };

  const skeletonRows = computed((): TableSkeletonRow[] =>
    Array.from({ length: own.skeletons() }, (_, index) => ({
      index,
      key: `skeleton-${index}`,
    })),
  );

  const bodyRows = computed((previous?: readonly TableBodyRow[]): readonly TableBodyRow[] => {
    const current = table.revision.stamp;

    if (table.loading()) {
      return [];
    }
    const pending = groups.expansion.loading.value;
    const spots = groups.detailSpots.value;
    const frozen = table.frozenRows();
    const rowWindow = table.rowWindow();
    const engine = table.engine.value;
    const start = table.pageStart();

    const fresh = rowWindow.items.value.map((item): TableBodyRow => {
      const node = engine.nodeAt(start + item.index);
      const level = groups.levelOf(node);
      const unloaded = engine.pendingAt(start + item.index);
      const detail = node?.kind === TableNodeKind.Detail;

      return {
        index: item.index,
        key: detail ? `detail-${node.id}` : item.slot,
        node: node?.id,
        part: detail ? 'detail' : 'body',
        revision: current,
        sized: sizedOf(node),
        frozen: item.index < frozen ? rowWindow.offsetOf(item.index) : undefined,
        level,
        treeLevel: Math.max(0, (level ?? 1) - 1),
        group: groups.expansion.rowAt(item.index),
        expanded: groups.expandedOf(node),
        loading: unloaded || awaited(node, pending),
        pending: unloaded,
        selected: selectedOf(node),
        stripe:
          own.striped() && !detail && (item.index - detailsBefore(spots, item.index)) % 2 === 1,
      };
    });

    return keptRows(fresh, previous);
  });

  const pinnedItems = computed((): TablePinnedRow<T>[] => {
    const getKey = own.getKey();

    return own.pinned().map((row, index) => ({
      row,
      index,
      key: getKey === undefined ? index : getKey(row),
      selected: own.selectable() ? selection.has(row) : undefined,
    }));
  });

  const rowLabelAt = (position: number): string => {
    const row = table.rowAtPosition(position);
    const custom = row === undefined ? undefined : own.rowHead()?.label?.(row, position);

    return custom ?? String(ordinalOf(position));
  };

  const pinnedUtility = (item: TablePinnedRow<T>, column: string): NuiTableUtilityCellProps =>
    item.selected === undefined || column === ROW_HEAD_KEY
      ? NO_UTILITY
      : { control: 'checkbox', checked: item.selected, label: own.selectText() };

  const gripKey = computed(() =>
    own.grips() ? (groups.treeKey.value ?? dataKeysOf(table.layout())[0]) : undefined,
  );

  const rangedAt = computed(() => (own.merged() ? own.segmentsOf : undefined));

  const rangedOf = (item: TableBodyRow): TableRowRanges | undefined =>
    item.group === undefined ? own.segmentsOf(item.index) : undefined;

  const plainText = (row: T, position: number, key: string): string | undefined => {
    const session = own.editingCell();
    const edited = session?.position.row === position && session.key === key;
    const custom = edited || key === groups.treeKey.value || key === gripKey.value;

    return custom || own.slots[`cell-${key}`] !== undefined ? undefined : table.textOf(row, key);
  };

  const treeLevelOf = (item: TableBodyRow): number => (groups.treeOn.value ? item.treeLevel : 0);

  const hasTreeToggle = (item: TableBodyRow): boolean =>
    item.expanded !== undefined || item.loading || treeLevelOf(item) > 0;

  const contentOf = (
    item: TableBodyRow,
    column: string,
    merge: TableLeadSpan | undefined,
  ): TableCellContent<T> => {
    const key = merge === undefined ? undefined : table.dataKeys()[merge.anchor.col];
    const row = merge === undefined ? undefined : table.rowAtPosition(merge.anchor.row);

    return merge === undefined || key === undefined || row === undefined
      ? { position: item.index, key: column, row: table.rowAt(item.index) }
      : { position: merge.anchor.row, key, row };
  };

  const editsCell = (cell: TableCellContent<T>, merge: TableLeadSpan | undefined): boolean => {
    const current = own.editingCell();

    return (
      current?.position.row === cell.position &&
      current.key === cell.key &&
      (merge === undefined || own.hostsCursor(merge))
    );
  };

  const leadsOf = (item: TableBodyRow, column: string): TableCellLead[] => {
    const grip: TableCellLead[] =
      column === gripKey.value
        ? [
            {
              kind: 'grip',
              label: gripLabel(item),
              disabled: !moves.dragEnabled.value,
              active: moves.rowDrag.dragging.value === item.index,
            },
          ]
        : [];

    return column === groups.treeKey.value && hasTreeToggle(item)
      ? [
          ...grip,
          {
            kind: 'toggle',
            node: item.node,
            level: treeLevelOf(item),
            expandable: item.expanded !== undefined,
            loading: item.loading,
          },
        ]
      : grip;
  };

  const cellViewOf = (
    item: TableBodyRow,
    column: string,
    merge: TableLeadSpan | undefined,
  ): TableCellView<T> => {
    if (merge === undefined && item.pending) {
      return { kind: 'skeleton' };
    }
    if (merge === undefined && item.group !== undefined) {
      return { kind: 'group', cell: item.group.cells[column] };
    }
    const cell = contentOf(item, column, merge);

    return {
      kind: 'data',
      leads: merge === undefined ? leadsOf(item, column) : [],
      editing: editsCell(cell, merge),
      scope: table.scopeOf(cell.row, cell.position, cell.key, false),
    };
  };

  const cellViewAt = (
    item: TableBodyRow | undefined,
    column: string,
    merge: TableLeadSpan | undefined,
  ): TableCellView<T> =>
    item === undefined ? { kind: 'skeleton' } : cellViewOf(item, column, merge);

  const utilityAt = (item: TableBodyRow | undefined, column: string): NuiTableUtilityCellProps =>
    item === undefined ? NO_UTILITY : rowUtility(item, column);

  const selectAt = (position: number | undefined): void => {
    if (position === undefined) {
      return;
    }

    selection.toggle(table.rowAt(position));
  };

  const expandAt = (position: number | undefined): void => {
    if (position === undefined) {
      return;
    }

    groups.expansion.toggle(position);
  };

  const plainTextAt = (position: number, key: string): string | undefined => {
    const at = table.pageStart() + position;
    const node = table.engine.value.nodeAt(at);

    return node?.kind !== TableNodeKind.Row || table.engine.value.pendingAt(at)
      ? undefined
      : plainText(node.row, position, key);
  };

  const bodyRowProps = (item: TableBodyRow): NuiTableRowProps => ({
    cells: table.rowCells(),
    rowIndex: item.index + table.pinnedRows() + table.headRows() + 1,
    position: item.index,
    paint: own.paint(),
    active: own.activeIn(item.index + table.pinnedRows()),
    revision: item.revision,
    revisionOf: own.revisionOf,
    level: item.level,
    group: item.group,
    expanded: item.expanded,
    loading: item.loading,
    selected: item.selected,
    stripe: item.stripe,
    dragging: moves.rowDrag.dragging.value === item.index,
    ranged: rangedOf(item),
    rangedAt: rangedAt.value,
    spans: own.spans(item),
    ally: own.ally(item),
    sized: item.sized,
    frozen: item.frozen,
    sizable: moves.sizableOf(item),
    sizing: moves.rowResize.active.value === item.index,
    plainText: plainTextAt,
  });

  const bodyRowView = (item: TableBodyRow): TableBodyRowView<T> =>
    item.part === TableBodyPart.Detail
      ? {
          kind: 'detail',
          item,
          props: {
            rowIndex: item.index + table.pinnedRows() + table.headRows() + 1,
            span: table.layout().visual.length,
            colspan: table.rowCells().tracks.length,
            level: item.level,
            active: own.activeIn(item.index + table.pinnedRows()) > 0,
          },
          scope: groups.detailScope(item.index),
        }
      : { kind: 'row', item, props: bodyRowProps(item) };

  const bodyViews = computed((previous: readonly TableBodyRowView<T>[] | undefined) =>
    keptViews(bodyRows.value.map(bodyRowView), previous),
  );

  const bodyContext: TableBodyRowContext<T> = {
    utilityAt,
    cellViewAt,
    editor: own.editor,
    selectAt,
    expandAt,
    grabAt: moves.grabAt,
    resize: moves.onRowResize,
    resetSize: moves.onRowResetSize,
    update: own.update,
  };

  const cellSlotNames = (): Array<`cell-${string}`> => Object.keys(own.slots).filter(isCellSlot);
  const cellSlots = shallowRef(cellSlotNames());
  const cellSlotted = computed(() => cellSlots.value.length > 0);

  onBeforeUpdate(() => {
    const names = cellSlotNames();

    if (names.join() === cellSlots.value.join()) {
      return;
    }

    cellSlots.value = names;
    own.sync();
  });

  return {
    skeletonRows,
    bodyRows,
    bodyViews,
    pinnedItems,
    pinnedUtility,
    headUtility,
    bodyContext,
    cellSlots,
    cellSlotted,
    labelOf,
    rowLabelAt,
    plainText,
  };
};
