<template>
  <div ref="root" class="nui-table" :class="rootClass" :style="rootStyle">
    <p v-if="hasCaption" :id="captionId" class="nui-table__caption">
      <slot name="caption">{{ caption }}</slot>
    </p>
    <div ref="frame" class="nui-table__frame">
      <div
        ref="viewport"
        class="nui-table__viewport"
        :style="windowFrame.canvasStyle.value"
        @scroll.passive="onViewportScroll"
        v-on="viewportEvents"
      >
        <table
          :id="gridId"
          class="nui-table__grid"
          :role="gridRole"
          :style="windowFrame.windowStyle.value"
          v-bind="gridAria"
        >
          <caption v-if="slots.overlay" class="nui-table__overlay" aria-hidden="true">
            <div class="nui-table__plane" :style="overlay.planeStyle.value">
              <slot name="overlay" v-bind="overlay.scope.value" />
            </div>
          </caption>
          <NuiTableTracks :tracks="rowCells.tracks" />
          <thead class="nui-table__header" @click="header.onClick">
            <NuiTableRow
              v-for="(band, level) in bands.rows"
              :key="level"
              :cells="band"
              :row-index="level + 1"
              part="band"
              :heads="header.heads.value"
              @resize="resize.start"
            >
              <template #default="{ column }">
                <span class="nui-table__text">{{ bands.labels.get(column) }}</span>
              </template>
            </NuiTableRow>
            <NuiTableRow
              :cells="rowCells"
              :row-index="headRows"
              part="head"
              :active="focus.activeIn(-1)"
              :marks="columnMarks"
              :heads="header.heads.value"
              @resize="resize.start"
            >
              <template #utility="{ column }">
                <NuiTableUtilityCell v-bind="headUtility(column)" @toggle="selection.toggleAll()" />
              </template>
              <template #default="{ column }">
                <slot :name="`header-${column}`" v-bind="header.scope(column)">
                  <span class="nui-table__text">{{ columnAt(column).label }}</span>
                </slot>
                <NuiTableHeaderMarks
                  :state="header.heads.value[column]"
                  :hint="header.sortHint(column)"
                  :filter-label="messages.filterColumn({ column: columnAt(column).label })"
                  :expanded="header.expanded(column)"
                  :menu-label="menu.labelOf(column)"
                  :menu-expanded="menu.expanded(column)"
                  :grip="order.gripOf(column)"
                  @filter="header.openFilter(column, $event)"
                  @menu="header.openMenu(column, $event)"
                  @grab="order.grab(column, $event)"
                />
              </template>
            </NuiTableRow>
          </thead>
          <tbody class="nui-table__pinned" @click="onRowsClick">
            <NuiTableRow
              v-for="item in pinnedItems"
              :key="item.key"
              :cells="rowCells"
              :row-index="item.index + headRows + 1"
              part="pinned"
              :position="item.index"
              :paint="pinnedPaint"
              :active="focus.activeIn(item.index)"
              :revision="revision"
              :selected="item.selected"
            >
              <template #utility="{ column }">
                <NuiTableUtilityCell
                  v-bind="pinnedUtility(item, column)"
                  @toggle="selection.toggle(item.row)"
                />
              </template>
              <template #default="{ column }">
                <CellContent :row="item.row" :position="item.index" :column="column" pinned />
              </template>
            </NuiTableRow>
          </tbody>
          <tbody class="nui-table__body" @click="onRowsClick">
            <NuiTableRow
              v-for="item in skeletonRows"
              :key="item.key"
              :cells="rowCells"
              :row-index="item.index + pinnedCount + headRows + 1"
              part="skeleton"
            >
              <template #utility>
                <NuiTableUtilityCell v-bind="SKELETON_UTILITY" />
              </template>
              <template #default>
                <NuiSkeleton v-bind="TEXT_SKELETON" />
              </template>
            </NuiTableRow>
            <template v-for="item in bodyRows" :key="item.key">
              <NuiTableDetailRow
                v-if="item.part === 'detail'"
                :row-index="item.index + pinnedCount + headRows + 1"
                :span="layout.visual.length"
                :colspan="rowCells.tracks.length"
                :level="item.level"
                :active="focus.activeIn(item.index + pinnedCount) > 0"
              >
                <slot name="detail" v-bind="detailScope(item.index)" />
              </NuiTableDetailRow>
              <NuiTableRow
                v-else
                :cells="rowCells"
                :row-index="item.index + pinnedCount + headRows + 1"
                :position="item.index"
                :paint="bodyPaint"
                :active="focus.activeIn(item.index + pinnedCount)"
                :revision="item.revision"
                :revision-of="revisionOf"
                :level="item.level"
                :group="item.group"
                :expanded="item.expanded"
                :loading="item.loading"
                :selected="item.selected"
                :stripe="item.stripe"
                :dragging="rowDrag.dragging.value === item.index"
                :ranged="rangedOf(item)"
                :ranged-at="rangedAt"
                :spans="spansOf(item)"
                :ally="allyOf(item)"
                :sized="item.sized"
                :frozen="item.frozen"
                :edge="item.edge"
                :sizable="sizableOf(item)"
                :sizing="rowResize.active.value === item.index"
                @resize="(_, event) => rowResize.start(item.index, event)"
                @reset-size="rowResize.reset(item.index)"
              >
                <template #utility="{ column }">
                  <NuiTableUtilityCell
                    v-bind="rowUtility(item, column)"
                    @toggle="selection.toggle(rowAt(item.index))"
                  />
                </template>
                <template #default="{ column, merge, revision: cellRevision }">
                  <CellContent
                    :item="item"
                    :position="item.index"
                    :column="column"
                    :merge="merge"
                    :revision="cellRevision"
                  />
                </template>
              </NuiTableRow>
            </template>
          </tbody>
          <tbody v-if="status" class="nui-table__status">
            <tr class="nui-table__empty" role="row" :aria-rowindex="headRows + 1">
              <td
                class="nui-table__empty-cell"
                role="gridcell"
                :aria-colspan="layout.visual.length"
                :colspan="rowCells.tracks.length"
              >
                <div class="nui-table__empty-body">
                  <slot :name="status">
                    <NuiEmpty :title="emptyText" size="sm" />
                  </slot>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot v-if="footRows" class="nui-table__footer">
            <NuiTableRow
              :cells="rowCells"
              :row-index="pinnedCount + visibleRows + headRows + 1"
              part="foot"
              :wraps="!windowed"
              :active="focus.activeIn(pinnedCount + visibleRows)"
              :revision="revision"
            >
              <template #default="{ column }">
                <slot :name="`footer-${column}`" v-bind="totals.scope(column)">
                  <NuiTableFooterCell
                    :text="totals.scope(column).text"
                    :count-text="totals.countText(totals.scope(column).count)"
                  />
                </slot>
              </template>
            </NuiTableRow>
          </tfoot>
        </table>
      </div>
      <NuiTableDragLayer :drop="order.drop.value" :ghost="order.ghost.value" />
      <NuiTableDragLayer axis="y" :drop="rowDrag.drop.value" :ghost="rowDrag.ghost.value" />
      <div v-if="busy" class="nui-table__busy" role="presentation"></div>
      <span
        ref="context-anchor"
        class="nui-table__anchor"
        tabindex="-1"
        aria-hidden="true"
        @focus="refocusActive"
      ></span>
    </div>
    <div v-if="paginationProps" class="nui-table__pagination">
      <NuiPagination
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="totalCount"
        :size="size"
        v-bind="paginationProps"
      />
    </div>
    <NuiTableFilter
      v-if="header.target.value"
      :key="header.target.value.key"
      v-model:open="header.open.value"
      :title="messages.filterColumn({ column: columnAt(header.target.value.key).label })"
      :kind="header.target.value.kind"
      :column-key="header.target.value.key"
      :filter="header.filterOf(header.target.value.key)"
      :anchor="header.target.value.anchor"
      :locale="resolvedLocale"
      :load-values="loadValues"
      :value-label="valueLabel"
      @apply="header.applyFilter"
    />
    <NuiMenu
      ref="menu-node"
      v-model:open="menu.open.value"
      :anchor="menuAnchor"
      :items="menu.items.value"
      :label="menu.label.value"
    />
    <NuiMenu
      ref="cell-menu"
      v-model:open="cellMenu.open.value"
      class="nui-table__cell-menu"
      :anchor="cellMenu.target.value"
      :items="cellMenu.items.value"
      :label="messages.cellMenu"
      :offset="0"
    />
    <div class="nui-table__hidden" role="status" aria-live="polite">{{ announcement }}</div>
  </div>
</template>

<script setup lang="ts" generic="T">
import {
  computed,
  h,
  onMounted,
  ref,
  renderSlot,
  shallowReactive,
  shallowRef,
  useSlots,
  useTemplateRef,
  watch,
  type VNode,
} from 'vue';
import { clamp, onLongPress, useElementSize } from '@vueuse/core';
import { formRulesMessages } from '@numior/forms';
import {
  createIntent,
  useControlId,
  useControls,
  useDirection,
  useLocale,
  useMessages,
  useVirtualFrame,
  useVirtualList,
  type VirtualFrame,
} from '@numior/primitives';
import {
  NuiEmpty,
  NuiMenu,
  NuiPagination,
  NuiSkeleton,
  type NuiMenuExposed,
  type NuiSkeletonProps,
} from '@numior/vue';
import {
  createSourceEngine,
  createTableEngine,
  type TableDetailNode,
  type TableDistinct,
  type TableEngine,
  type TableFilter,
  type TableFilterValue,
  type TableQuery,
  type TableNode,
  type TableNodeId,
} from '../engine';
import NuiTableCellEditor from './NuiTableCellEditor.vue';
import NuiTableDetailRow from './NuiTableDetailRow.vue';
import NuiTableDragLayer from './NuiTableDragLayer.vue';
import NuiTableRowGrip from './NuiTableRowGrip.vue';
import NuiTableGroupCell from './NuiTableGroupCell.vue';
import NuiTableRow from './NuiTableRow.vue';
import NuiTableTracks from './NuiTableTracks.vue';
import NuiTableTreeToggle from './NuiTableTreeToggle.vue';
import NuiTableUtilityCell from './NuiTableUtilityCell.vue';
import { tableMessages } from './table.messages';
import {
  countBelow,
  detailsBefore,
  detailSpotsOf,
  NO_DETAILS,
  NO_SPOTS,
  sameSpots,
} from './table-detail';
import {
  anchorOf,
  consecutiveRuns,
  createMergeIndex,
  expandToMerges,
  keepSpans,
  leaveMerge,
  leaveMergeBy,
  mergeSpans,
  pieceOf,
} from './table-merges';
import { alignOfCell, floodRow, paneOfCell, type TableFloodRow } from './table-flood';
import { paintOf } from './table-paint';
import { ownCellAt, ownDetailOf } from './table-dom';
import { cellTextOf, cellValueOf, engineColumnOf, valueTextOf } from './table-format';
import { columnTreeOf, headerBandsOf } from './table-columns';
import { orderLeaves } from './table-order';
import {
  centreIndexOf,
  dataKeyAt,
  dataKeysOf,
  pinsFit,
  revealOffset,
  ROW_HEAD_KEY,
  rowCellsOf,
  rowHeadWidth,
  SELECT_KEY,
  sizedRowStyle,
  mergeIndices,
  sameIndices,
  tableLayout,
  wrappedCentreOf,
} from './table-layout';
import { pageWindowOf, resolvePagination } from './table-pages';
import NuiTableFilter from './NuiTableFilter.vue';
import NuiTableFooterCell from './NuiTableFooterCell.vue';
import NuiTableHeaderMarks from './NuiTableHeaderMarks.vue';
import { useTableFocus } from './use-table-focus';
import { useTableOverlay } from './use-table-overlay';
import { useTableClipboard, type TableCopyCell } from './use-table-clipboard';
import { useTableContextMenu } from './use-table-context-menu';
import { useTableCellEditor } from './use-table-cell-editor';
import { createEchoes } from './table-echoes';
import { useTablePicking } from './use-table-picking';
import { useTableEditing } from './use-table-editing';
import { useTableExport } from './use-table-export';
import { editorPlan } from './table-editors';
import { parseCell } from './table-parse';
import { ruleFailure } from './table-rules';
import { boxOf, clampPosition, columnSpansOf, type RangeBox } from './table-ranges';
import { useTableRanges } from './use-table-ranges';
import { pageRowsOf, pageStepOf } from './table-keys';
import { useTableExpansion } from './use-table-expansion';
import { useTableHeader, type TableHeader } from './use-table-header';
import { useTableMenu, type TableMenu } from './use-table-menu';
import { useTableColumnOrder } from './use-table-column-order';
import { useTableQuery } from './use-table-query';
import { useTableResize } from './use-table-resize';
import { useTableRowDrag } from './use-table-row-drag';
import { useTableRowResize } from './use-table-row-resize';
import { useTableRowSizes } from './use-table-row-sizes';
import { useTableTotals } from './use-table-totals';
import { useTableSelection, type TableSelectionKey } from './use-table-selection';
import type {
  TableBodyRow,
  TableCellContentProps,
  TableCellLayout,
  TableCellPaint,
  TableCellPosition,
  TableCellSpan,
  TableLeadSpan,
  TableMergeLayout,
  TableMergeSlot,
  TableRowPaint,
  TableRowSpan,
  TableDetailSpot,
  TablePinnedRow,
  TableReveal,
  TableRevealAxis,
  TableRowMode,
  TableRowPainter,
  TableSkeletonRow,
  TableStatusSlot,
  NuiTableCellSlot,
  NuiTableDetailSlot,
  NuiTableEvents,
  NuiTableExpanded,
  NuiTableExposed,
  NuiTableGroupBy,
  NuiTableHidden,
  NuiTablePins,
  NuiTableProps,
  NuiTableSlots,
  NuiTableFilters,
  NuiTableSort,
  NuiTableUtilityCellProps,
  NuiTableColumn,
  NuiTableColumnOrder,
  NuiTableContextScope,
  NuiTableCellValue,
  NuiTableDraft,
  NuiTableEdgeDirection,
  NuiTableRanges,
  NuiTableRowHeaders,
  NuiTableRowHeights,
  NuiTableWidths,
  TableRowRanges,
} from './table.types';

const ROW_SIZES = { sm: 32, md: 40, lg: 48 } as const;
const CANVAS_LIMIT = 15_000_000;
const STILL_FRAME: VirtualFrame = { lead: 0, rest: 0, clampStart: 0, clampEnd: 0 };
const NO_GROUPS: readonly string[] = [];
const NO_COLUMNS: readonly number[] = [];

const awaited = (
  node: TableNode<unknown> | undefined,
  pending: ReadonlySet<TableNodeId>,
): boolean => node !== undefined && (pending.has(node.id) || (node.kind === 'row' && node.loading));

const INITIAL_ROWS = 30;
const INITIAL_COLUMNS = 12;
const ROW_OVERSCAN = 6;
const DISTINCT_LIMIT = 100;
const COLUMN_OVERSCAN = 2;
const NO_ROW_HEAD = {} as const;
const NO_HEIGHTS: NuiTableRowHeights = {};
const NO_MERGE_INDEX = createMergeIndex([], { rows: 0, cols: 0 });
const NO_UTILITY: NuiTableUtilityCellProps = { control: 'none' };
const SKELETON_UTILITY: NuiTableUtilityCellProps = { control: 'skeleton' };
const TEXT_SKELETON: NuiSkeletonProps = { shape: 'text', width: '100%' };

const CLICK_GUARD =
  '.nui-table__cell--select, .nui-table__cell--rowhead, .nui-table__row-grip, .nui-table__toggle, .nui-table__group, .nui-table__editor';

const NEST_DELAY = 600;
const COPY_LIMIT = 200_000;
const BLOCK_SIZE = 100;
const SKELETON_ROWS = 5;
const LONG_PRESS = 500;

const sameSpot = (a: TableCellPosition | undefined, b: TableCellPosition | undefined): boolean =>
  a?.row === b?.row && a?.col === b?.col;

const {
  columns,
  rows = [],
  source,
  blockSize = BLOCK_SIZE,
  getKey,
  id,
  size = 'md',
  rowHeight,
  height,
  locale,
  label,
  emptyLabel,
  totalsLabel,
  getChildren,
  hasChildren,
  hasDetail,
  cellStyle,
  merges = [],
  bordered = false,
  rowHeaders = undefined,
  treeColumn,
  columnMenu = true,
  selectable,
  striped = false,
  caption,
  loading = false,
  loadingRows,
  selectLabel,
  selectAllLabel,
  pagination = undefined,
  remote = false,
  total,
  pinnedRows = [],
  frozenRows = 0,
  nextEdge,
  keepEditing,
  picking,
  rowDrag: rowDragOn = false,
  nestDelay = NEST_DELAY,
  dragLabel,
  rowLabel,
  cellSelection = false,
  contextMenu = undefined,
  copyLimit = COPY_LIMIT,
  clipboard: clipboardHooks,
  commands,
  controls,
} = defineProps<NuiTableProps<T>>();

const sort = defineModel<NuiTableSort>('sort', { default: () => [] });
const filters = defineModel<NuiTableFilters>('filters', { default: () => [] });
const quick = defineModel<string>('quick', { default: '' });
const groupBy = defineModel<NuiTableGroupBy>('groupBy', { default: () => [] });
const expanded = defineModel<NuiTableExpanded>('expanded', { default: () => [] });
const pins = defineModel<NuiTablePins>('pins', { default: () => ({}) });
const hidden = defineModel<NuiTableHidden>('hidden', { default: () => [] });
const widths = defineModel<NuiTableWidths>('widths', { default: () => ({}) });
const columnOrder = defineModel<NuiTableColumnOrder>('columnOrder', { default: () => [] });
const selected = defineModel<readonly T[]>('selected', { default: () => [] });
const page = defineModel<number>('page', { default: 1 });
const pageSize = defineModel<number>('pageSize', { default: 20 });
const ranges = defineModel<NuiTableRanges>('ranges', { default: () => [] });
const rowHeights = defineModel<NuiTableRowHeights>('rowHeights', { default: () => ({}) });
const activeCell = defineModel<TableCellPosition | undefined>('active');
const draft = defineModel<NuiTableDraft | undefined>('draft');
const activeEchoes = createEchoes<TableCellPosition | undefined>(sameSpot);
const draftEchoes = createEchoes<NuiTableDraft | undefined>(Object.is);
const emit = defineEmits<NuiTableEvents<T>>();
const slots = defineSlots<NuiTableSlots<T>>();
const rawSlots = useSlots();

const root = useTemplateRef<HTMLElement>('root');
const viewport = useTemplateRef<HTMLElement>('viewport');
const frame = useTemplateRef<HTMLElement>('frame');
const tree = computed(() => columnTreeOf(columns));
const orderedLeaves = computed(() => orderLeaves(tree.value.leaves, columnOrder.value));
const gridId = useControlId(() => id);
const resolvedLocale = useLocale(() => locale);
const messages = useMessages(tableMessages, resolvedLocale);
const direction = useDirection(viewport);

const paginationProps = computed(() =>
  resolvePagination(
    source !== undefined && height === undefined && pagination === undefined ? true : pagination,
  ),
);

const sourceChanges = ref(0);

const onSourceChange = (): void => {
  sourceChanges.value += 1;
};

const onSourceError = (error: unknown): void => {
  emit('error', error);
  announcement.value = messages.value.loadFailed;
};

const detailTest = (): ((row: T) => boolean) | undefined =>
  slots.detail === undefined ? undefined : (row) => hasDetail?.(row) ?? true;

const createEngine = (): TableEngine<T> =>
  source === undefined
    ? createTableEngine({
        columns: tree.value.leaves.map(engineColumnOf),
        keyOf: getKey,
        children: getChildren,
        hasChildren,
        detail: detailTest(),
        defaultExpanded: false,
      })
    : createSourceEngine({
        source,
        keyOf: getKey,
        hasChildren,
        detail: detailTest(),
        blockSize: () => (paginationProps.value === undefined ? blockSize : pageSize.value),
        onChange: onSourceChange,
        onError: onSourceError,
      });

const engine = shallowRef(createEngine());
const waiting = ref(!engine.value.settled());
const loadingNow = computed(() => loading || waiting.value);
const rowCount = ref(0);
const revision = ref(0);
const touched = shallowReactive(new Map<number, number>());
let stamp = 0;
const arrangement = ref(0);
const announcement = ref('');
const rowsIntent = createIntent<'rows'>();
const selectOn = computed(() => selectable !== undefined);

const treeOn = computed(() =>
  source === undefined ? getChildren !== undefined : source.children !== undefined,
);

const detailOn = computed(() => slots.detail !== undefined && !treeOn.value);
const grouping = computed(() => (treeOn.value ? NO_GROUPS : groupBy.value));

const detailPositions = computed(() => {
  void revision.value;
  return detailOn.value ? engine.value.details() : NO_DETAILS;
});

const pageWindow = computed(() =>
  paginationProps.value === undefined || remote
    ? { start: 0, end: rowCount.value, page: 1, pages: 1 }
    : pageWindowOf(rowCount.value, page.value, pageSize.value, detailPositions.value),
);

const pageStart = computed(() => pageWindow.value.start);
const pinnedCount = computed(() => pinnedRows.length);

const visibleRows = computed(() =>
  loadingNow.value ? 0 : pageWindow.value.end - pageWindow.value.start,
);

const totalCount = computed(() =>
  remote ? (total ?? rows.length) : rowCount.value - detailPositions.value.length,
);

const keyOf = (row: T): TableSelectionKey<T> => (getKey === undefined ? row : getKey(row));

const rowHead = computed<NuiTableRowHeaders<T> | undefined>(() => {
  if (rowHeaders === undefined || rowHeaders === false) {
    return undefined;
  }
  return rowHeaders === true ? NO_ROW_HEAD : rowHeaders;
});

const rowHeadSize = computed(() =>
  rowHead.value === undefined ? 0 : rowHeadWidth(totalCount.value, rowHead.value.width),
);

const sizedHeights = computed(() => (source === undefined ? rowHeights.value : NO_HEIGHTS));

const ordinalBase = computed(() =>
  remote ? (Math.max(1, page.value) - 1) * pageSize.value : pageStart.value,
);

const ordinalOf = (position: number): number =>
  ordinalBase.value + position + 1 - countBelow(detailPositions.value, pageStart.value + position);

const quickKeys = computed(() => {
  if (hidden.value.length === 0) {
    return undefined;
  }
  const hiddenKeys = new Set(hidden.value);

  return tree.value.leaves.flatMap((column) => (hiddenKeys.has(column.key) ? [] : [column.key]));
});

const queryFilters = (): readonly TableFilter[] => {
  const text = quick.value.trim();

  return text === ''
    ? filters.value
    : [...filters.value, { kind: 'quick', value: text, keys: quickKeys.value }];
};

const totals = useTableTotals({
  engine,
  columns: () => tree.value.leaves,
  keys: () => dataKeysOf(layout.value),
  columnAt: (key) => columnAt(key),
  locale: () => resolvedLocale.value,
  messages,
  label: () => totalsLabel,
  rowCount: () => (loadingNow.value ? undefined : engine.value.rowCount()),
});

const currentQuery = (): TableQuery => {
  const list = queryFilters();
  const sorting = sort.value;

  return remote
    ? {}
    : { sort: sorting, filters: list, groupBy: grouping.value, totals: totals.wanted(list) };
};

const query = useTableQuery({
  engine,
  query: currentQuery,
  onSettled: (count, ran) => {
    totals.take(ran);
    rearrange();
    clampActive();

    if (rowsIntent.take() === 'rows') {
      announcement.value = messages.value.rowsShown({ count });
    }
    emit('settle', { rows: count });
  },
  onProgress: (progress) => {
    emit('progress', progress);
  },
});

const runNow = (): void => {
  totals.take(query.runNow());
};

engine.value.setRows(rows);
engine.value.setToggled(expanded.value);
runNow();
rowCount.value = engine.value.count();

const active = ref<TableCellPosition>({ row: rowCount.value > 0 ? 0 : -1, col: 0 });

const { width: room } = useElementSize(viewport);

const layoutOptions = computed(() => ({
  pins: pins.value,
  hidden: hidden.value,
  widths: widths.value,
  select: selectOn.value,
  room: room.value,
  wrap: height === undefined || rowHeight === 'auto',
  rowHeader: rowHeadSize.value,
}));

const pinnedLayout = computed(() =>
  tableLayout(orderedLeaves.value, { ...layoutOptions.value, sticky: true }),
);

const sticky = computed(() => pinsFit(pinnedLayout.value, room.value));

const layout = computed(() =>
  sticky.value
    ? pinnedLayout.value
    : tableLayout(orderedLeaves.value, { ...layoutOptions.value, sticky: false }),
);

const headRows = computed(() => tree.value.depth + 1);

const columnByKey = computed(
  () => new Map(tree.value.leaves.map((column) => [column.key, column])),
);

const rowSize = computed(() => (typeof rowHeight === 'number' ? rowHeight : ROW_SIZES[size]));

const rowMode = computed<TableRowMode>(() => {
  if (height === undefined) {
    return 'flow';
  }
  return rowHeight === 'auto' ? 'fluid' : 'fixed';
});

const windowed = computed(() => rowMode.value !== 'flow');
const fluid = computed(() => rowMode.value === 'fluid');
const labelText = computed(() => label ?? messages.value.label);
const hasCaption = computed(() => caption !== undefined || slots.caption !== undefined);
const captionId = computed(() => `${gridId.value}-caption`);
const selectText = computed(() => selectLabel ?? messages.value.select);
const selectAllText = computed(() => selectAllLabel ?? messages.value.selectAll);
const emptyText = computed(() => emptyLabel ?? messages.value.empty);
const booleanTexts = computed(() => ({ yes: messages.value.yes, no: messages.value.no }));
const centreWidths = computed(() => layout.value.centre.map((column) => column.width));

const footRows = computed(() => (totals.enabled.value ? 1 : 0));

const hierarchical = computed(() => treeOn.value || detailOn.value || grouping.value.length > 0);

const frozenCount = computed(() =>
  windowed.value && !hierarchical.value && !loadingNow.value && source === undefined
    ? clamp(Math.floor(frozenRows) || 0, 0, visibleRows.value)
    : 0,
);

const gridRole = computed(() => (hierarchical.value ? 'treegrid' : 'grid'));

const detailSpots = computed<readonly TableDetailSpot[]>((previous) => {
  void revision.value;

  const next = loadingNow.value
    ? NO_SPOTS
    : detailSpotsOf(engine.value, detailPositions.value, pageStart.value, visibleRows.value);

  return previous !== undefined && sameSpots(previous, next) ? previous : next;
});

const rowSizes = useTableRowSizes({
  viewport,
  engine,
  mode: () => rowMode.value,
  rowSize: () => rowSize.value,
  count: () => visibleRows.value,
  pageStart: () => pageStart.value,
  leading: () => headRows.value + pinnedCount.value,
  spots: () => detailSpots.value,
  heights: () => sizedHeights.value,
  arrangement: () => arrangement.value,
  rendered: () => [bodyRows.value, rowCells.value],
  resize: (sizes) => {
    rowWindow.resize(sizes);
  },
});

const activeRow = (): number | undefined => {
  const body = active.value.row - pinnedCount.value;
  return body >= 0 && body < visibleRows.value ? body : undefined;
};

const activeCentre = (): number | undefined => centreIndexOf(layout.value, active.value.col);

const rowWindow = useVirtualList(viewport, {
  enabled: windowed,
  count: () => visibleRows.value,
  itemSize: rowSizes.itemSize,
  overscan: ROW_OVERSCAN,
  initialCount: INITIAL_ROWS,
  pinned: activeRow,
  frozen: frozenCount,
  maxSize: CANVAS_LIMIT,
  inset: () => rowSize.value * (headRows.value + pinnedCount.value + footRows.value),
  listen: false,
});

const frozenSize = computed(() => rowWindow.offsetOf(frozenCount.value));

const columnWindow = useVirtualList(viewport, {
  enabled: windowed,
  axis: 'x',
  count: () => layout.value.centre.length,
  itemSize: () => {
    const sizes = centreWidths.value;
    return (index: number) => sizes[index] ?? 0;
  },
  overscan: COLUMN_OVERSCAN,
  initialCount: INITIAL_COLUMNS,
  pinned: activeCentre,
  inset: () => layout.value.startWidth + layout.value.endWidth,
  listen: false,
});

const onViewportScroll = (): void => {
  if (windowed.value) {
    rowWindow.measure();
    columnWindow.measure();
  }
};

const wrappedCentre = computed(() => (fluid.value ? wrappedCentreOf(layout.value) : NO_COLUMNS));

const shownCentre = computed<readonly number[]>((previous) => {
  const shown = columnWindow.items.value.map((item) => item.index);
  const kept = wrappedCentre.value;
  const next = kept.length === 0 ? shown : mergeIndices(shown, kept);

  return previous !== undefined && sameIndices(previous, next) ? previous : next;
});

const rowCells = computed(() => rowCellsOf(layout.value, shownCentre.value));

const bands = computed(() => headerBandsOf(layout.value, tree.value, rowCells.value));

const rootStyle = computed(() => ({
  '--_row': `${rowSize.value}px`,
  '--_head-rows': String(headRows.value),
  '--_pinned-rows': String(pinnedCount.value),
  '--_frozen': `${frozenSize.value}px`,
  '--_height': height,
  '--_start': `${layout.value.startWidth}px`,
  '--_end': `${layout.value.endWidth}px`,
  '--_canvas': `${layout.value.canvasWidth}px`,
  ...(room.value > 0 ? { '--_room': `${room.value}px` } : {}),
}));

const bodySpan = computed(() =>
  Math.max(
    0,
    rowWindow.viewport.value -
      rowSize.value * (headRows.value + pinnedCount.value + footRows.value) -
      frozenSize.value,
  ),
);

const fittingRows = computed(() => Math.ceil(bodySpan.value / rowSize.value));

const pageRows = (body: number, forward: boolean): number =>
  body < 0 || body >= visibleRows.value || typeof rowSizes.itemSize.value === 'number'
    ? pageRowsOf(rowWindow.viewport.value - frozenSize.value, rowSize.value)
    : pageStepOf(
        { span: bodySpan.value, offsetOf: rowWindow.offsetOf, indexAt: rowWindow.indexAt },
        body,
        forward,
      );

const skeletonCount = computed(() => {
  if (!loadingNow.value || slots.loading !== undefined) {
    return 0;
  }
  return (
    loadingRows ?? (windowed.value ? Math.max(SKELETON_ROWS, fittingRows.value) : SKELETON_ROWS)
  );
});

const windowFrame = useVirtualFrame(viewport, () => {
  if (!windowed.value) {
    return undefined;
  }
  return loadingNow.value ? STILL_FRAME : rowWindow.frame.value;
});

const rootClass = computed(() => [
  `nui-table--size-${size}`,
  {
    'nui-table--busy': query.busy.value,
    'nui-table--totals': totals.enabled.value,
    'nui-table--auto': !windowed.value,
    'nui-table--fluid': fluid.value,
    'nui-table--captioned': hasCaption.value,
    'nui-table--paged': paginationProps.value !== undefined,
    'nui-table--striped': striped,
    'nui-table--bordered': bordered,
    'nui-table--slack': room.value > layout.value.canvasWidth,
    'nui-table--loading': loadingNow.value,
    'nui-table--underlay': windowed.value && (pinnedCount.value > 0 || frozenCount.value > 0),
    'nui-table--resizing': resize.active.value !== undefined,
    'nui-table--sizing': rowResize.active.value !== undefined,
    'nui-table--dragging':
      order.dragging.value !== undefined || rowDrag.dragging.value !== undefined,
    'nui-table--ranging': rangeSelect.dragging.value,
    'nui-table--cell-selection': cellSelection && !loadingNow.value,
    'nui-table--ranged': ranges.value.length > 0,
    'nui-table--deselected': rangeSelect.deselected.value,
    'nui-table--cell-menu': cellMenu.open.value,
  },
]);

const status = computed<TableStatusSlot | undefined>(() => {
  if (loadingNow.value) {
    return slots.loading === undefined ? undefined : 'loading';
  }
  return rowCount.value === 0 ? 'empty' : undefined;
});

const focus = useTableFocus({
  viewport,
  active,
  rows: rowWindow,
  columns: columnWindow,
  rowCount: () => pinnedCount.value + visibleRows.value + footRows.value,
  bodyRows: () => visibleRows.value,
  pinnedRows: () => pinnedCount.value,
  headRows: () => headRows.value,
  colCount: () => layout.value.visual.length,
  firstCol: () => dataOffset.value,
  pageRows: (row, forward) => pageRows(row - pinnedCount.value, forward),
  centreIndexOf: (visual) => centreIndexOf(layout.value, visual),
  columnIndexOf: (key) => layout.value.visual.findIndex((column) => column.key === key),
  isRtl: direction.isRtl,
  windowed: () => windowed.value,
  lead: () => activeLead.value,
  settle: (focused) => settleFocus(focused),
  leave: (from, key) => leaveFrom(from, key),
  edge: (from, toward) => {
    const data = dataCellOf(from);
    const target = data === undefined ? undefined : edgeOfData(data, toward);

    return target === undefined ? undefined : visualCellOf(target);
  },
});

const columnAt = (key: string): NuiTableColumn<T> => {
  const column = columnByKey.value.get(key);

  if (column === undefined) {
    throw new Error(`NuiTable has no column "${key}"`);
  }
  return column;
};

const rowAt = (position: number): T => {
  const node = engine.value.nodeAt(pageStart.value + position);

  if (node?.kind !== 'row') {
    throw new Error(`NuiTable has no row at position ${position}`);
  }
  return node.row;
};

const detailAt = (position: number): TableDetailNode<T> => {
  const node = engine.value.nodeAt(pageStart.value + position);

  if (node?.kind !== 'detail') {
    throw new Error(`NuiTable has no detail at position ${position}`);
  }
  return node;
};

const detailScope = (position: number): NuiTableDetailSlot<T> => ({
  row: detailAt(position).row,
  position: position - 1,
});

const inDetail = (event: Event): boolean => ownDetailOf(event.target, viewport.value) !== null;

const resize = useTableResize<T>({
  widths,
  layout: () => layout.value,
  room: () => room.value,
  columnAt,
  isRtl: direction.isRtl,
  messages,
  announce: (text) => {
    announcement.value = text;
  },
});

const order = useTableColumnOrder<T>({
  order: columnOrder,
  leaves: () => tree.value.leaves,
  layout: () => layout.value,
  viewport: () => viewport.value,
  frame: () => frame.value,
  columnAt,
  isRtl: direction.isRtl,
  messages,
  announce: (text) => {
    announcement.value = text;
  },
  refocus: (key) => {
    focus.focusHeader({ kind: 'column', key });
  },
});

const header: TableHeader<T> = useTableHeader({
  keys: () => dataKeysOf(layout.value),
  keyAt: (visual) => dataKeyAt(layout.value, visual),
  columnAt,
  sort,
  filters,
  messages,
  announce: (text) => {
    announcement.value = text;
  },
  filtered: () => {
    rowsIntent.set('rows');
  },
  menu: (key, anchor, focusOn) => menu.openAt(key, anchor, focusOn),
  resizable: resize.resizable,
  resizing: (key) => resize.active.value === key,
  resize: resize.onKeydown,
  reorderable: order.reorderable,
  dragging: (key) => order.dragging.value === key,
  reorder: order.onKeydown,
});

const menuNode = useTemplateRef<NuiMenuExposed>('menu-node');
const menuAnchor = computed(() => menu.target.value?.anchor ?? null);

const selection = useTableSelection<T>({
  mode: () => selectable,
  selected,
  keyOf,
  engine,
  revision,
  scope: () => ({ start: pageStart.value, end: pageStart.value + visibleRows.value }),
  disabled: () => loadingNow.value,
  selectKeyAt: (visual) => layout.value.visual[visual]?.kind === 'select',
});

const gridAria = computed(() => {
  const captioned = hasCaption.value && label === undefined;

  return {
    'aria-label': captioned ? undefined : labelText.value,
    'aria-labelledby': captioned ? captionId.value : undefined,
    'aria-rowcount': pinnedCount.value + visibleRows.value + headRows.value + footRows.value,
    'aria-colcount': layout.value.visual.length,
    'aria-busy': loadingNow.value || query.busy.value || undefined,
    'aria-multiselectable': selection.multiple.value || cellSelection || undefined,
  };
});

const headUtility = (column: string): NuiTableUtilityCellProps => {
  if (column === ROW_HEAD_KEY) {
    return { control: 'corner', label: messages.value.rowHeaders };
  }
  return column === SELECT_KEY && selection.multiple.value
    ? {
        control: 'checkbox',
        checked: selection.headerState.value === 'checked',
        indeterminate: selection.headerState.value === 'indeterminate',
        disabled: selection.headerDisabled.value,
        label: selectAllText.value,
      }
    : NO_UTILITY;
};

const dragEnabled = computed(
  () =>
    rowDragOn &&
    !remote &&
    source === undefined &&
    !loadingNow.value &&
    sort.value.length === 0 &&
    filters.value.length === 0 &&
    quick.value.trim() === '' &&
    groupBy.value.length === 0,
);

const labelOf = (row: T): string => {
  const keys = dataKeysOf(layout.value);
  const first = keys.find((key) => columnAt(key).type === 'text') ?? keys[0];

  return rowLabel?.(row) ?? (first === undefined ? '' : textOf(row, first));
};

const rowHeadText = (item: TableBodyRow): string => {
  const labelOfRow = rowHead.value?.label;
  const row = item.pending ? undefined : rowAtPosition(item.index);

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
    : { control: 'checkbox', checked: item.selected, label: selectText.value };
};

const gripOf = (item: TableBodyRow): VNode =>
  h(NuiTableRowGrip, {
    label:
      dragLabel?.(rowAt(item.index)) ?? messages.value.dragRow({ row: labelOf(rowAt(item.index)) }),
    disabled: !dragEnabled.value,
    active: rowDrag.dragging.value === item.index,
    onGrab: (event: PointerEvent) => rowDrag.grab(item.index, event),
  });

const menu: TableMenu = useTableMenu({
  enabled: () => columnMenu !== false,
  extra: (key, anchor) =>
    typeof columnMenu === 'function' ? columnMenu({ column: columnAt(key), anchor }) : [],
  leaves: () => tree.value.leaves,
  layout: () => layout.value,
  columnAt,
  heads: () => header.heads.value,
  sort,
  groupBy,
  pins,
  hidden,
  widths,
  resetWidth: resize.reset,
  treeMode: () => treeOn.value,
  messages,
  announce: (text) => {
    announcement.value = text;
  },
  openFilter: (key, anchor) => {
    header.openFilterAt(key, anchor);
  },
  show: (focusOn) => {
    menuNode.value?.show(focusOn);
  },
  refocus: focus.focusHeader,
});

const treeKey = computed(() =>
  treeOn.value || detailOn.value ? (treeColumn ?? dataKeysOf(layout.value)[0]) : undefined,
);

const expansion = useTableExpansion({
  engine,
  expanded,
  revision,
  offset: () => pageStart.value,
  keys: () => dataKeysOf(layout.value),
  keyAt: (visual) => dataKeyAt(layout.value, visual),
  treeKey: () => treeKey.value,
  columnAt,
  locale: () => resolvedLocale.value,
  messages,
  announce: (text) => {
    announcement.value = text;
  },
  load: (row) => {
    emit('load', row);
  },
});

const levelOf = (node: TableNode<T> | undefined): number | undefined =>
  hierarchical.value && node !== undefined ? node.level + 1 : undefined;

const selectedOf = (node: TableNode<T> | undefined): boolean | undefined =>
  selectOn.value && node?.kind === 'row' ? selection.has(node.row) : undefined;

const expandedOf = (node: TableNode<T> | undefined): boolean | undefined =>
  node?.kind === 'group' || (node?.kind === 'row' && node.expandable) ? node.expanded : undefined;

const sizedOf = (node: TableNode<T> | undefined): Readonly<Record<string, string>> | undefined => {
  const pixels = node?.kind === 'row' ? sizedHeights.value[String(node.id)] : undefined;

  return pixels === undefined ? undefined : sizedRowStyle(pixels, rowMode.value);
};

const skeletonRows = computed((): TableSkeletonRow[] =>
  Array.from({ length: skeletonCount.value }, (_, index) => ({
    index,
    key: `skeleton-${index}`,
  })),
);

const bodyRows = computed((): TableBodyRow[] => {
  const current = revision.value;

  if (loadingNow.value) {
    return [];
  }
  const pending = expansion.loading.value;
  const spots = detailSpots.value;
  const frozen = frozenCount.value;

  return rowWindow.items.value.map((item) => {
    const node = engine.value.nodeAt(pageStart.value + item.index);
    const level = levelOf(node);
    const unloaded = engine.value.pendingAt(pageStart.value + item.index);
    const detail = node?.kind === 'detail';

    return {
      index: item.index,
      key: detail ? `detail-${node.id}` : item.slot,
      part: detail ? 'detail' : 'body',
      revision: current,
      sized: sizedOf(node),
      frozen: item.index < frozen ? rowWindow.offsetOf(item.index) : undefined,
      edge: item.index === frozen - 1,
      level,
      treeLevel: Math.max(0, (level ?? 1) - 1),
      group: expansion.rowAt(item.index),
      expanded: expandedOf(node),
      loading: unloaded || awaited(node, pending),
      pending: unloaded,
      selected: selectedOf(node),
      stripe: striped && !detail && (item.index - detailsBefore(spots, item.index)) % 2 === 1,
    };
  });
});

const bodyPosition = (row: number): number | undefined => {
  const body = row - pinnedCount.value;
  return body >= 0 && body < visibleRows.value ? pageStart.value + body : undefined;
};

const rowFor = (visual: number): T | undefined => {
  if (visual >= 0 && visual < pinnedCount.value) {
    return pinnedRows[visual];
  }
  const position = bodyPosition(visual);
  const node = position === undefined ? undefined : engine.value.nodeAt(position);

  return node?.kind === 'row' ? node.row : undefined;
};

const pinnedItems = computed((): TablePinnedRow<T>[] =>
  pinnedRows.map((row, index) => ({
    row,
    index,
    key: getKey === undefined ? index : getKey(row),
    selected: selectOn.value ? selection.has(row) : undefined,
  })),
);

const rowLabelAt = (position: number): string => {
  const row = rowAtPosition(position);
  const custom = row === undefined ? undefined : rowHead.value?.label?.(row, position);

  return custom ?? String(ordinalOf(position));
};

const rowResize = useTableRowResize({
  enabled: () => rowHead.value?.resizable === true && source === undefined && !loadingNow.value,
  heights: rowHeights,
  rowSize: () => rowSize.value,
  keyAt: (position) => {
    const node = engine.value.nodeAt(pageStart.value + position);
    return node?.kind === 'row' ? String(node.id) : undefined;
  },
  labelAt: rowLabelAt,
  messages,
  announce: (text) => {
    announcement.value = text;
  },
});

const sizableOf = (item: TableBodyRow): boolean =>
  rowHead.value?.resizable === true && source === undefined && item.group === undefined;

const pinnedUtility = (item: TablePinnedRow<T>, column: string): NuiTableUtilityCellProps =>
  item.selected === undefined || column === ROW_HEAD_KEY
    ? NO_UTILITY
    : { control: 'checkbox', checked: item.selected, label: selectText.value };

const movedRow = createIntent<T>();

const gripKey = computed(() =>
  rowDragOn ? (treeKey.value ?? dataKeysOf(layout.value)[0]) : undefined,
);

const positionOf = (row: T): number | undefined => {
  const key = keyOf(row);
  const count = engine.value.count();

  for (let index = pageStart.value; index < count; index += 1) {
    const node = engine.value.nodeAt(index);

    if (node?.kind === 'row' && keyOf(node.row) === key) {
      return index - pageStart.value;
    }
  }
  return undefined;
};

const refocusMoved = (): void => {
  const row = movedRow.take();
  const position = row === undefined ? undefined : positionOf(row);

  if (position !== undefined) {
    focus.focusCell({ row: position + pinnedCount.value, col: active.value.col });
  }
};

const rowDrag = useTableRowDrag<T>({
  enabled: () => dragEnabled.value,
  engine,
  viewport: () => viewport.value,
  frame: () => frame.value,
  pageStart: () => pageStart.value,
  rowCount: () => visibleRows.value,
  rowSize: () => rowSize.value,
  headRows: () => headRows.value,
  nestDelay: () => nestDelay,
  isRtl: direction.isRtl,
  canNest: (row) =>
    getChildren !== undefined && (getChildren(row) !== undefined || hasChildren?.(row) !== true),
  childCount: (row) => getChildren?.(row)?.length ?? 0,
  labelOf,
  messages,
  announce: (text) => {
    announcement.value = text;
  },
  refocus: (row) => {
    movedRow.set(row);
  },
  emit: (event) => {
    emit('reorder', event);
  },
});

const dataKeys = computed(() => dataKeysOf(layout.value));

const dataOffset = computed(() =>
  Math.max(
    0,
    layout.value.visual.findIndex((column) => column.kind === 'data'),
  ),
);

const dataOffsets = computed(() => {
  const offsets = [0];

  for (const column of layout.value.visual) {
    if (column.kind === 'data') {
      offsets.push((offsets.at(-1) ?? 0) + column.width);
    }
  }
  return offsets;
});

const mergeIndex = computed(() =>
  merges.length > 0 && !hierarchical.value && !loadingNow.value
    ? createMergeIndex(merges, { rows: visibleRows.value, cols: dataKeys.value.length })
    : NO_MERGE_INDEX,
);

const mergeSlots = computed((): TableMergeSlot[] =>
  rowCells.value.cells.map((cell) => ({
    key: cell.key,
    pane: cell.pin ?? 'centre',
    col: cell.kind === 'data' ? cell.colIndex - 1 - dataOffset.value : undefined,
    edge: cell.edge,
    tail: cell.kind !== 'gap' && cell.tail === true,
  })),
);

const mergeLayout = computed<TableMergeLayout<RangeBox> | undefined>((previous) => {
  const index = mergeIndex.value;

  if (index.size === 0) {
    return undefined;
  }

  const runs = consecutiveRuns(
    rowWindow.items.value.map((item) => item.index),
    frozenCount.value,
  );

  const found = new Set(runs.flatMap((run) => index.within(run[0] ?? 0, run.at(-1) ?? 0)));

  const next = mergeSpans([...found], runs, mergeSlots.value, {
    rowOffset: rowWindow.offsetOf,
    colOffset: (col) => dataOffsets.value[col] ?? 0,
  });

  return { spans: keepSpans(next.spans, previous?.spans), pieces: next.pieces };
});

const spansOf = (item: TableBodyRow): TableRowSpan | undefined =>
  mergeLayout.value?.spans.get(item.index);

const dataCellOf = (visual: TableCellPosition): TableCellPosition | undefined => {
  const row = visual.row - pinnedCount.value;
  const col = visual.col - dataOffset.value;

  return row >= 0 && row < visibleRows.value && col >= 0 && col < dataKeys.value.length
    ? { row, col }
    : undefined;
};

const visualCellOf = (data: TableCellPosition): TableCellPosition => ({
  row: data.row + pinnedCount.value,
  col: data.col + dataOffset.value,
});

const edgeOfData = (
  from: TableCellPosition,
  toward: NuiTableEdgeDirection,
): TableCellPosition | undefined =>
  nextEdge === undefined
    ? undefined
    : clampPosition(nextEdge(from, toward), {
        rows: visibleRows.value,
        cols: dataKeys.value.length,
      });

const activeMerge = computed(() => {
  const data = mergeIndex.value.size === 0 ? undefined : dataCellOf(active.value);

  return data === undefined ? undefined : mergeIndex.value.at(data.row, data.col);
});

const activeAnchor = computed((): TableCellPosition | undefined => {
  const merge = activeMerge.value;

  return merge === undefined ? undefined : { row: merge.top, col: merge.start };
});

const allyOf = (item: TableBodyRow): TableCellPosition | undefined => {
  const merge = activeMerge.value;

  return merge !== undefined && item.index >= merge.top && item.index <= merge.bottom
    ? activeAnchor.value
    : undefined;
};

const activeLead = computed((): TableCellPosition => {
  const current = active.value;
  const merge = activeMerge.value;
  const data = merge === undefined ? undefined : dataCellOf(current);

  const piece =
    merge === undefined || data === undefined
      ? undefined
      : pieceOf(mergeLayout.value?.pieces.get(merge), data);

  return piece === undefined ? current : visualCellOf({ row: piece.top, col: piece.start });
});

const hostsCursor = (span: TableLeadSpan): boolean => {
  const lead = activeLead.value;
  const piece = visualCellOf({ row: span.row, col: span.col });

  return lead.row === piece.row && lead.col === piece.col;
};

const settleFocus = (focused: TableCellPosition): TableCellPosition => {
  const lead = activeLead.value;

  return focused.row === lead.row && focused.col === lead.col ? active.value : focused;
};

const leaveFrom = (from: TableCellPosition, key: string): TableCellPosition => {
  const data = mergeIndex.value.size === 0 ? undefined : dataCellOf(from);

  return data === undefined
    ? from
    : visualCellOf(leaveMerge(mergeIndex.value, data, key, direction.isRtl()));
};

const cellOfTarget = (target: EventTarget | null): TableCellPosition | undefined => {
  const cell = rangeSelect.cellAt(target);

  return cell === undefined ? undefined : anchorOf(mergeIndex.value, cell);
};

const activeData = (): TableCellPosition | undefined => {
  const body = bodyActive();
  const col = body === undefined ? -1 : body.col - dataOffset.value;

  return body !== undefined && col >= 0 && col < dataKeys.value.length
    ? anchorOf(mergeIndex.value, { row: body.row, col })
    : undefined;
};

const shownActive = computed<TableCellPosition | undefined>((previous) => {
  const next = activeData();

  return sameSpot(next, previous) ? previous : next;
});

const rangeAnchor = (): TableCellPosition | undefined =>
  viewport.value?.contains(document.activeElement) === true ? activeData() : undefined;

const revealed = createIntent<TableReveal>();

const revealCorner = (corner: TableCellPosition, axis: TableRevealAxis): void => {
  const target = { row: corner.row + pinnedCount.value, col: corner.col + dataOffset.value };

  if (windowed.value) {
    focus.reveal(target, axis);
  } else {
    revealed.set({ target, axis });
  }
};

const revealColumnInFlow = (visual: number): void => {
  const element = viewport.value;
  const placed = layout.value.visual[visual];

  if (element === null || placed?.pane !== 'centre') {
    return;
  }
  const span = element.clientWidth - layout.value.startWidth - layout.value.endWidth;
  const current = Math.abs(element.scrollLeft);
  const next = revealOffset(current, placed.offset, placed.width, span);

  if (next !== current) {
    element.scrollLeft = direction.isRtl() ? -next : next;
  }
};

const revealInFlow = ({ target, axis }: TableReveal): void => {
  const cell = viewport.value?.querySelector(
    ownCellAt(target.row + headRows.value + 1, target.col + 1),
  );

  switch (axis) {
    case 'both':
      cell?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      break;
    case 'row':
      cell?.parentElement?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      break;
    case 'col':
      revealColumnInFlow(target.col);
      break;
    case 'none':
      break;
  }
};

const columnMarks = computed(() =>
  rowHead.value === undefined ? undefined : columnSpansOf(ranges.value, dataOffset.value),
);

const announce = (text: string): void => {
  announcement.value = text;
};

const rangeSelect = useTableRanges({
  enabled: () => cellSelection && !loadingNow.value,
  lines: () => rowHead.value !== undefined,
  ranges,
  viewport: () => viewport.value,
  inside: (target) =>
    root.value?.contains(target) === true ||
    (target instanceof Element && keepEditing?.(target) === true),
  bounds: () => ({ rows: visibleRows.value, cols: dataKeys.value.length }),
  offset: () => dataOffset.value,
  headRows: () => headRows.value,
  pinnedRows: () => pinnedCount.value,
  footRows: () => footRows.value,
  rowSize: () => rowSize.value,
  pageRows,
  isRtl: direction.isRtl,
  anchor: rangeAnchor,
  cursor: () => activeData(),
  sorts: (col) => header.heads.value[dataKeys.value[col] ?? '']?.sortable === true,
  merges: () => mergeIndex.value,
  edge: edgeOfData,
  focus: (position) => {
    focus.focusCell(
      { row: position.row + pinnedCount.value, col: position.col + dataOffset.value },
      false,
    );
  },
  reveal: revealCorner,
  resetOn: [
    sort,
    filters,
    quick,
    groupBy,
    expanded,
    pageStart,
    () => rows,
    () => dataKeys.value.join('\u0000'),
  ],
  messages,
  announce,
});

const rangedAt = computed(() => (mergeIndex.value.size === 0 ? undefined : rangeSelect.segmentsOf));

const rangedOf = (item: TableBodyRow): TableRowRanges | undefined =>
  item.group === undefined ? rangeSelect.segmentsOf(item.index) : undefined;

const copyCell = (): TableCopyCell<T> | undefined => {
  const row = rowFor(active.value.row);
  const key = dataKeyAt(layout.value, active.value.col);

  return row === undefined || key === undefined ? undefined : { row, key };
};

const rowAtPosition = (position: number): T | undefined => {
  const node = engine.value.nodeAt(pageStart.value + position);
  return node?.kind === 'row' ? node.row : undefined;
};

const paintedKeys = computed(() =>
  rowCells.value.cells.flatMap((cell) => (cell.kind === 'data' ? [cell.key] : [])),
);

const paintCell = (
  row: T,
  key: string,
  position: number,
  pinned: boolean,
): TableCellPaint | undefined =>
  paintOf(cellStyle?.({ row, column: columnAt(key), position, pinned }));

const paintSpan = (span: TableCellSpan): TableCellPaint | undefined => {
  if (span.kind === 'covered') {
    return undefined;
  }
  const row = rowAtPosition(span.anchor.row);
  const key = dataKeys.value[span.anchor.col];

  return row === undefined || key === undefined
    ? undefined
    : paintCell(row, key, span.anchor.row, false);
};

const widthOfCell = (cell: TableCellLayout | undefined): number => {
  const col = cell?.kind === 'data' ? cell.colIndex - 1 - dataOffset.value : -1;

  return (dataOffsets.value[col + 1] ?? 0) - (dataOffsets.value[col] ?? 0);
};

const plainText = (row: T, position: number, key: string): string | undefined => {
  const session = cellEditor.session.value;
  const edited = session?.position.row === position && session.key === key;
  const custom = edited || key === treeKey.value || key === gripKey.value;

  return custom || rawSlots[`cell-${key}`] !== undefined ? undefined : textOf(row, key);
};

const floodRowOf = (row: T, position: number, spans: TableRowSpan | undefined): TableFloodRow => {
  const cells = rowCells.value.cells;

  const textAt = (index: number): string | undefined => {
    const cell = cells[index];

    return cell?.kind === 'data' && spans?.get(cell.key) === undefined
      ? plainText(row, position, cell.key)
      : undefined;
  };

  return {
    count: cells.length,
    keyAt: (index) => cells[index]?.key,
    paneAt: (index) => paneOfCell(cells[index]),
    widthAt: (index) => widthOfCell(cells[index]),
    alignAt: (index) => alignOfCell(cells[index]),
    freeAt: (index) => textAt(index) === '',
    flowsAt: (index) => (textAt(index) ?? '') !== '',
  };
};

const paintRow = (
  row: T | undefined,
  position: number,
  pinned: boolean,
  spans?: TableRowSpan,
): TableRowPaint => {
  const painted = new Map<string, TableCellPaint>();
  let flows = false;

  if (row === undefined) {
    return painted;
  }
  for (const key of paintedKeys.value) {
    const span = spans?.get(key);
    const paint = span === undefined ? paintCell(row, key, position, pinned) : paintSpan(span);

    if (paint !== undefined) {
      painted.set(key, paint);
      flows ||= paint.overflow && !pinned;
    }
  }
  return flows ? floodRow(painted, floodRowOf(row, position, spans)) : painted;
};

const paintBody: TableRowPainter = (position, spans) =>
  paintRow(rowAtPosition(position), position, false, spans);

const paintPinned: TableRowPainter = (position) => paintRow(pinnedRows[position], position, true);
const bodyPaint = computed(() => (cellStyle === undefined ? undefined : paintBody));
const pinnedPaint = computed(() => (cellStyle === undefined ? undefined : paintPinned));

const clipboard = useTableClipboard<T>({
  ranges: () => ranges.value,
  cell: copyCell,
  position: activeData,
  serialize: () => clipboardHooks?.serialize,
  rowAt: rowAtPosition,
  keyAt: (col) => dataKeys.value[col],
  labelOf: (key) => columnAt(key).label,
  textOf: (row, key) => textOf(row, key),
  limit: () => copyLimit,
  messages,
  announce,
});

const canEdit = computed(() =>
  tree.value.leaves.some((column) => column.editable !== undefined && column.editable !== false),
);

const editableOf = (row: T, key: string): boolean => {
  const editable = columnAt(key).editable;
  return typeof editable === 'function' ? editable(row) : editable === true;
};

const rowByKey = computed(() =>
  getKey === undefined || getChildren !== undefined
    ? undefined
    : new Map(rows.map((row) => [getKey(row), row])),
);

const clipboardOf = (): Clipboard | undefined =>
  typeof navigator === 'undefined' || !('clipboard' in navigator) ? undefined : navigator.clipboard;

const readClipboard = async (): Promise<string | null> => {
  try {
    return (await clipboardOf()?.readText()) ?? null;
  } catch {
    return null;
  }
};

const ownsCell = (element: Element | null): boolean =>
  element instanceof HTMLElement &&
  element.matches('.nui-table__cell') &&
  viewport.value?.contains(element) === true;

const resolveRow = (row: T): T | undefined =>
  getKey === undefined || source !== undefined || rowByKey.value === undefined
    ? row
    : rowByKey.value.get(getKey(row));

const ruleTexts = useMessages(formRulesMessages, resolvedLocale);
const kitControls = useControls();

const editOn = computed(() => !loadingNow.value && canEdit.value);

const checkCell = (row: T, key: string, value: NuiTableCellValue): string | undefined => {
  const column = columnAt(key);

  return ruleFailure(column, value, {
    name: key,
    label: column.label,
    values: row,
    messages: ruleTexts.value,
  });
};

const editing = useTableEditing<T>({
  enabled: () => editOn.value,
  ranges: () => ranges.value,
  cell: activeData,
  rowAt: rowAtPosition,
  keyAt: (col) => dataKeys.value[col],
  editable: editableOf,
  valueOf: (row, key) => cellValueOf(columnAt(key), row),
  resolve: resolveRow,
  limit: () => copyLimit,
  copy: () => clipboard.copy(false),
  emit: (event) => {
    emit('edit', event);
  },
  sink: () => commands,
  keys: () => dataKeys.value,
  applied: (keys) => {
    applyChanged(keys);
  },
  parse: (row, key, text) =>
    parseCell(columnAt(key), text, row, resolvedLocale.value, booleanTexts.value),
  readBlock: (data, target) => clipboardHooks?.parse?.(data, target),
  check: checkCell,
  bounds: () => ({ rows: visibleRows.value, cols: dataKeys.value.length }),
  select: (next) => {
    rangeSelect.replace(next);
  },
  readable: () => typeof clipboardOf()?.readText === 'function',
  read: readClipboard,
  owns: ownsCell,
  messages,
  announce,
});

const cellEditor = useTableCellEditor<T>({
  enabled: () => editOn.value,
  cell: activeData,
  rowAt: rowAtPosition,
  keyAt: (col) => dataKeys.value[col],
  labelOf: (key) => columnAt(key).label,
  editable: editableOf,
  valueOf: (row, key) => cellValueOf(columnAt(key), row),
  plan: (row, key) =>
    editorPlan(
      columnAt(key),
      cellValueOf(columnAt(key), row),
      controls ?? kitControls,
      resolvedLocale.value,
    ),
  check: checkCell,
  invalid: () => ruleTexts.value.invalid,
  save: (row, key, value) => {
    editing.commitCell(row, key, value);
  },
  fill: (key, value) => {
    const type = columnAt(key).type;

    editing.fillCells(value, (target) => columnAt(target).type === type);
  },
  share: (next) => {
    draftEchoes.sent(next);
    draft.value = next;
  },
  refuse: (row, key, reason) => {
    emit('editRefused', { row, key, reason });
  },
  bounds: () => ({ rows: visibleRows.value, cols: dataKeys.value.length }),
  locate: (target) => cellOfTarget(target),
  leave: (from, move) => leaveMergeBy(mergeIndex.value, from, move),
  focus: (position) => {
    const current = activeData();
    const stays = current?.row === position.row && current.col === position.col;

    focus.focusCell(stays ? active.value : visualCellOf(position));
  },
  resetOn: [
    sort,
    filters,
    quick,
    groupBy,
    expanded,
    pageStart,
    () => rows,
    () => columns,
    () => dataKeys.value.join('\u0000'),
  ],
  messages,
  announce,
});

const picker = useTablePicking({
  active: () => {
    const now = cellEditor.current();

    return now !== undefined && picking?.(now) === true;
  },
  origin: () => cellEditor.session.value?.position,
  locate: (target) => {
    const cell =
      target instanceof Element && target.closest('.nui-table__editor') === null
        ? cellOfTarget(target)
        : undefined;

    return sameSpot(cell, cellEditor.session.value?.position) ? undefined : cell;
  },
  cellAt: (x, y) => rangeSelect.cellAtPoint(x, y),
  whole: (range) =>
    expandToMerges(mergeIndex.value, range, {
      rows: visibleRows.value,
      cols: dataKeys.value.length,
    }),
  leave: (from, move) => leaveMergeBy(mergeIndex.value, from, move),
  bounds: () => ({ rows: visibleRows.value, cols: dataKeys.value.length }),
  isRtl: direction.isRtl,
  reveal: (position) => {
    focus.reveal(visualCellOf(position));
  },
  pick: (range) => {
    emit('pick', range);
  },
});

const selectForMenu = (target: TableCellPosition): NuiTableRanges => {
  const body = { row: target.row - pinnedCount.value, col: target.col - dataOffset.value };

  if (body.row >= 0 && rangeSelect.contains(body)) {
    return ranges.value;
  }

  const focused =
    active.value.row === target.row &&
    active.value.col === target.col &&
    viewport.value?.contains(document.activeElement) === true;

  rangeSelect.clear();

  if (!focused) {
    focus.focusCell(target, false);
  }
  return [];
};

const contextScopeOf = (
  focused: TableCellPosition,
  current: NuiTableRanges,
): NuiTableContextScope<T> | undefined => {
  const data = dataCellOf(focused);
  const target = data === undefined ? focused : visualCellOf(anchorOf(mergeIndex.value, data));
  const row = rowFor(target.row);
  const key = dataKeyAt(layout.value, target.col);
  const pinned = target.row < pinnedCount.value;

  return row === undefined || key === undefined
    ? undefined
    : {
        ...scopeOf(row, pinned ? target.row : target.row - pinnedCount.value, key, pinned),
        ranges: current,
      };
};

const cellMenuNode = useTemplateRef<NuiMenuExposed>('cell-menu');
const contextAnchor = useTemplateRef<HTMLElement>('context-anchor');

const cellMenu = useTableContextMenu<T>({
  enabled: () => (contextMenu === undefined ? cellSelection : contextMenu !== false),
  extra: () => (contextMenu === false ? undefined : contextMenu),
  frame: () => frame.value,
  anchor: () => contextAnchor.value,
  viewport: () => viewport.value,
  headRows: () => headRows.value,
  scopeOf: contextScopeOf,
  select: selectForMenu,
  copyable: () => clipboard.copyable(),
  copy: (headers) => {
    void clipboard.copy(headers);
  },
  editable: () => canEdit.value,
  clearable: () => editing.clearable(),
  cut: () => {
    void editing.cut();
  },
  clear: () => {
    editing.clear();
  },
  pastable: () => editing.pastable(),
  paste: () => {
    void editing.pasteFromClipboard();
  },
  show: (focusOn) => {
    cellMenuNode.value?.show(focusOn);
  },
  isRtl: direction.isRtl,
  messages,
});

const exporter = useTableExport<T>({
  rows: (signal) => engine.value.collect(signal),
  keys: () => dataKeys.value,
  labelOf: (key) => columnAt(key).label,
  textOf: (row, key) => textOf(row, key),
  messages,
  announce,
});

const busy = computed(() => query.busy.value || clipboard.busy.value || exporter.busy.value);

const refocusActive = (): void => {
  focus.focusCell(active.value);
};

onLongPress(
  viewport,
  (event) => {
    if (!inDetail(event) && cellMenu.onLongPress(event)) {
      rangeSelect.swallowClick();
    }
  },
  { delay: LONG_PRESS },
);

watch(
  ranges,
  () => {
    const pending = revealed.take();

    if (pending !== undefined) {
      revealInFlow(pending);
    }
  },
  { flush: 'post' },
);

const onRowsClick = (event: MouseEvent): void => {
  const target = event.target;

  if (
    rangeSelect.takeClick() ||
    !(target instanceof Element) ||
    inDetail(event) ||
    target.closest(CLICK_GUARD) !== null
  ) {
    return;
  }

  const visual =
    Number(target.closest('[role="row"]')?.getAttribute('aria-rowindex')) - headRows.value - 1;

  const row = Number.isInteger(visual) ? rowFor(visual) : undefined;

  if (row !== undefined) {
    emit('rowClick', row, event);
  }
};

const bodyActive = (): TableCellPosition | undefined => {
  const row = active.value.row - pinnedCount.value;
  return row >= 0 && row < visibleRows.value ? { row, col: active.value.col } : undefined;
};

const activeRowHead = (): number | undefined =>
  layout.value.visual[active.value.col]?.kind === 'rowhead' ? bodyActive()?.row : undefined;

const onKeydown = (event: KeyboardEvent): void => {
  if (
    cellMenu.onKeydown(event) ||
    clipboard.onKeydown(event) ||
    cellEditor.onKeydown(event) ||
    editing.onKeydown(event) ||
    rangeSelect.onKeydown(event)
  ) {
    return;
  }
  if (rowResize.onKeydown(event, activeRowHead()) || rowDrag.onKeydown(event, bodyActive())) {
    return;
  }
  if (selection.onKeydown(event, active.value, rowFor(active.value.row))) {
    return;
  }
  const body = bodyActive();

  if (!header.onKeydown(event) && !(body !== undefined && expansion.onKeydown(event, body))) {
    focus.onKeydown(event);
  }
};

const outsideDetail =
  <E extends Event>(handler: (event: E) => void) =>
  (event: E): void => {
    if (!inDetail(event)) {
      handler(event);
    }
  };

const viewportEvents = {
  keydown: outsideDetail(onKeydown),
  focusin: (event: FocusEvent): void => {
    cellEditor.onFocusin(event);
    focus.onFocusin(ownDetailOf(event.target, viewport.value)?.parentElement ?? event.target);
  },
  pointerdown: outsideDetail((event: PointerEvent) => {
    if (!picker.onPointerdown(event)) {
      rangeSelect.onPointerdown(event);
    }
  }),
  mousedown: outsideDetail((event: MouseEvent) => {
    if (!picker.onMousedown(event)) {
      rangeSelect.onMousedown(event);
    }
  }),
  contextmenu: outsideDetail(cellMenu.onContextmenu),
  paste: outsideDetail(editing.onPaste),
  click: outsideDetail((event: MouseEvent) => {
    if (!picker.onClick(event)) {
      rangeSelect.onClick(event);
      cellEditor.onClick(event);
    }
  }),
  dblclick: outsideDetail(cellEditor.onDblclick),
  pointerup: outsideDetail(cellEditor.onPointerup),
};

const loadValues = (): Promise<TableDistinct | null> => {
  const current = header.target.value;

  return current === null
    ? Promise.resolve(null)
    : engine.value.distinct(current.key, { limit: DISTINCT_LIMIT });
};

const valueLabel = (value: TableFilterValue): string => {
  const current = header.target.value;

  const text =
    current === null
      ? ''
      : valueTextOf(
          columnAt(current.key),
          value,
          undefined,
          resolvedLocale.value,
          booleanTexts.value,
        );

  return text === '' ? messages.value.blank : text;
};

const scopeOf = (row: T, position: number, key: string, pinned: boolean): NuiTableCellSlot<T> => {
  const column = columnAt(key);

  return {
    row,
    column,
    position,
    pinned,
    value: cellValueOf(column, row),
    text: cellTextOf(column, row, resolvedLocale.value, booleanTexts.value),
  };
};

const textOf = (row: T, key: string): string =>
  cellTextOf(columnAt(key), row, resolvedLocale.value, booleanTexts.value);

const treeToggleOf = (item: TableBodyRow): VNode[] => {
  const level = treeOn.value ? item.treeLevel : 0;
  const expandable = item.expanded !== undefined;

  return expandable || item.loading || level > 0
    ? [
        h(NuiTableTreeToggle, {
          level,
          expandable,
          loading: item.loading,
          onToggle: () => expansion.toggle(item.index),
        }),
      ]
    : [];
};

const editorOf = (position: number, column: string): VNode | undefined => {
  const current = cellEditor.session.value;

  if (current?.position.row !== position || current.key !== column) {
    return undefined;
  }
  return h(NuiTableCellEditor, {
    spec: current.spec,
    value: cellEditor.draft.value,
    label: current.label,
    errorId: `${gridId.value}-error`,
    error: cellEditor.error.value,
    typed: current.typed,
    passive: current.passive,
    keep: keepEditing,
    pick: picker.onKeydown,
    attach: cellEditor.attach,
    commit: cellEditor.commit,
    cancel: cellEditor.cancel,
    onUpdate: (value: unknown) => {
      picker.reset();
      cellEditor.input(value);
    },
  });
};

const mergedContent = (merge: TableLeadSpan): VNode | VNode[] => {
  const key = dataKeys.value[merge.anchor.col];
  const row = rowAtPosition(merge.anchor.row);

  if (key === undefined || row === undefined) {
    return [];
  }
  const editor = editorOf(merge.anchor.row, key);

  return editor !== undefined && hostsCursor(merge)
    ? editor
    : renderSlot(rawSlots, `cell-${key}`, { ...scopeOf(row, merge.anchor.row, key, false) }, () => [
        h('span', { class: 'nui-table__text' }, textOf(row, key)),
      ]);
};

const CellContent = (props: TableCellContentProps<T>): VNode | VNode[] => {
  const { item, column } = props;

  if (props.merge !== undefined) {
    return mergedContent(props.merge);
  }
  if (item?.pending === true) {
    return h(NuiSkeleton, TEXT_SKELETON);
  }
  if (item?.group !== undefined) {
    return h(NuiTableGroupCell, {
      cell: item.group.cells[column],
      onToggle: () => expansion.toggle(item.index),
    });
  }
  const row = props.row ?? rowAt(props.position);
  const editor = item === undefined ? undefined : editorOf(props.position, column);

  const content =
    editor ??
    renderSlot(
      rawSlots,
      `cell-${column}`,
      { ...scopeOf(row, props.position, column, props.pinned === true) },
      () => [h('span', { class: 'nui-table__text' }, textOf(row, column))],
    );

  const parts = [
    ...(item !== undefined && column === gripKey.value ? [gripOf(item)] : []),
    ...(item !== undefined && column === treeKey.value ? treeToggleOf(item) : []),
  ];

  return parts.length === 0 ? content : [...parts, content];
};

const neededRange = computed(() => {
  if (paginationProps.value !== undefined) {
    const from = waiting.value ? (Math.max(1, page.value) - 1) * pageSize.value : pageStart.value;

    return { from, to: Math.max(from + pageSize.value, pageWindow.value.end) };
  }
  const range = rowWindow.range.value;

  return { from: pageStart.value + range.start, to: pageStart.value + range.end };
});

const ensureRows = (): void => {
  engine.value.ensure(neededRange.value.from, neededRange.value.to);
};

const sync = (): void => {
  stamp += 1;
  rowCount.value = engine.value.count();
  revision.value = stamp;

  if (touched.size > 0) {
    touched.clear();
  }
};

const applyChanged = (keys: readonly string[]): void => {
  totals.reset();

  const ran = currentQuery();

  engine.value.patch(ran, keys);
  totals.take(ran);
  sync();
};

const queryActive = (): boolean =>
  footRows.value > 0 ||
  quick.value !== '' ||
  sort.value.length > 0 ||
  filters.value.length > 0 ||
  grouping.value.length > 0;

const revisionOf = (position: number): number => touched.get(position) ?? 0;

const touchRows = (list: NuiTableRanges): void => {
  const boxes = list.map(boxOf);

  stamp += 1;

  for (const item of rowWindow.items.value) {
    if (boxes.some((box) => item.index >= box.top && item.index <= box.bottom)) {
      touched.set(item.index, stamp);
    }
  }
};

const invalidate = (list?: NuiTableRanges): void => {
  if (list === undefined || queryActive()) {
    applyChanged(dataKeys.value);
    return;
  }
  touchRows(list);
};

const rearrange = (): void => {
  arrangement.value += 1;
  sync();
};

const clampActive = (): void => {
  const rowsInFocus = visibleRows.value + footRows.value;
  const lastRow = rowsInFocus > 0 ? rowsInFocus - 1 : -1;
  const lastCol = Math.max(0, layout.value.visual.length - 1);
  const row = Math.min(active.value.row, lastRow);
  const col = Math.min(active.value.col, lastCol);

  if (row !== active.value.row || col !== active.value.col) {
    active.value = { row, col };
  }
};

watch(quick, () => {
  rowsIntent.set('rows');
});

const moveActiveTo = (position: TableCellPosition): boolean => {
  if (
    position.row < 0 ||
    position.row >= visibleRows.value ||
    position.col < 0 ||
    position.col >= dataKeys.value.length
  ) {
    return false;
  }
  const target = visualCellOf(anchorOf(mergeIndex.value, position));

  if (viewport.value?.contains(document.activeElement) === true) {
    focus.focusCell(target);
  } else {
    active.value = target;

    if (viewport.value !== null) {
      focus.reveal(target);
    }
  }
  return true;
};

const shareActive = (next: TableCellPosition | undefined): void => {
  activeEchoes.sent(next);
  activeCell.value = next;
};

watch(
  activeCell,
  (next) => {
    if (
      activeEchoes.echoed(next) ||
      next === undefined ||
      sameSpot(next, shownActive.value) ||
      moveActiveTo(next)
    ) {
      return;
    }
    shareActive(shownActive.value);
  },
  { immediate: true },
);

watch(shownActive, shareActive, { immediate: true });

watch(draft, (next) => {
  if (!draftEchoes.echoed(next)) {
    cellEditor.receive(next);
  }
});

watch(cellEditor.session, () => {
  picker.reset();
});

watch(visibleRows, clampActive);

watch(pageStart, () => {
  if (windowed.value) {
    rowWindow.scrollTo(0, { align: 'start' });
  }
});

watch(
  layout,
  (next, previous) => {
    const key = previous.visual[active.value.col]?.key;
    const index = key === undefined ? -1 : next.visual.findIndex((column) => column.key === key);

    const col =
      index >= 0 ? index : Math.min(active.value.col, Math.max(0, next.visual.length - 1));

    if (col !== active.value.col) {
      active.value = { ...active.value, col };
    }
  },
  { flush: 'sync' },
);

watch(expanded, (ids) => {
  engine.value.setToggled(ids);
  rearrange();
  clampActive();
});

watch(
  () => rows,
  (next) => {
    engine.value.setRows(next);
    engine.value.setToggled(expanded.value);
    expansion.settle();
    totals.reset();

    if (getKey === undefined) {
      editing.reset();
    }
    runNow();
    rearrange();
    clampActive();
    refocusMoved();
  },
);

watch([() => columns, () => source], () => {
  engine.value.dispose();
  engine.value = createEngine();
  waiting.value = !engine.value.settled();
  engine.value.setRows(rows);
  engine.value.setToggled(expanded.value);
  editing.reset();
  totals.reset();
  runNow();
  rearrange();
  clampActive();
  ensureRows();
});

watch(sourceChanges, () => {
  waiting.value = !engine.value.settled();
  totals.sync();
  sync();
  clampActive();
});

onMounted(() => {
  watch(neededRange, ensureRows, { immediate: true });
});

const overlay = useTableOverlay({
  viewport,
  rows: rowWindow,
  columns: columnWindow,
  layout: () => layout.value,
  dataKeys: () => dataKeys.value,
  rowCount: () => visibleRows.value,
  headSize: () => rowSize.value * (headRows.value + pinnedCount.value),
  headRows: () => headRows.value,
  pinnedRows: () => pinnedCount.value,
  dataOffset: () => dataOffset.value,
  onWindow: (next) => {
    emit('window', next);
  },
});

defineExpose<NuiTableExposed>({
  scrollToRow: (position) => {
    rowWindow.scrollTo(position, { align: 'start' });
  },
  scrollToColumn: (key) => {
    const index = layout.value.centre.findIndex((column) => column.key === key);

    if (index >= 0) {
      columnWindow.scrollTo(index, { align: 'start' });
    }
  },
  copy: (options) => clipboard.copy(options?.headers === true),
  undo: () => editing.undo(),
  redo: () => editing.redo(),
  exportCsv: (options) => exporter.exportCsv(options),
  refresh: () => {
    engine.value.refresh();
  },
  rectOf: overlay.rectOf,
  cellFromPoint: overlay.cellFromPoint,
  startEdit: (mode, options) => cellEditor.start(mode, options?.focus ?? true),
  commitEdit: (move = 'stay') => cellEditor.commit(move),
  cancelEdit: () => {
    cellEditor.cancel();
  },
  invalidate,
});
</script>
