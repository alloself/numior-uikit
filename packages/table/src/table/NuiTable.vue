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
        @pointerdown.capture="handles.onPointerdown"
        v-on="viewportEvents"
      >
        <table
          :id="gridId"
          class="nui-table__grid"
          :role="gridRole"
          :style="windowFrame.windowStyle.value"
          v-bind="gridAria"
        >
          <caption
            v-if="slots.overlay"
            class="nui-table__overlay"
            :style="overlay.style.value"
            aria-hidden="true"
          >
            <div
              v-for="pane in overlay.panes.value"
              :key="pane.name"
              class="nui-table__pane"
              :class="pane.classes"
            >
              <div :key="overlay.planeBase.value" class="nui-table__plane">
                <slot name="overlay" v-bind="pane.scope" />
              </div>
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
              :head="header.head"
              @resize="resize.start"
              @reset-size="fitColumn"
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
              :head="header.head"
              @resize="resize.start"
              @reset-size="fitColumn"
            >
              <template #utility="{ column }">
                <NuiTableUtilityCell v-bind="headUtility(column)" @toggle="selection.toggleAll()" />
              </template>
              <template #default="{ column }">
                <slot :name="`header-${column}`" v-bind="header.scope(column)">
                  <span class="nui-table__text">{{ columnAt(column).label }}</span>
                </slot>
                <NuiTableHeaderMarks
                  :state="header.head(column)"
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
              :wraps="!windowed"
              :paint="pinnedPaint"
              :active="focus.activeIn(item.index)"
              :revision="revision.stamp"
              :selected="item.selected"
            >
              <template #utility="{ column }">
                <NuiTableUtilityCell
                  v-bind="pinnedUtility(item, column)"
                  @toggle="selection.toggle(item.row)"
                />
              </template>
              <template #default="{ column }">
                <slot :name="`cell-${column}`" v-bind="scopeOf(item.row, item.index, column, true)">
                  <span class="nui-table__text">{{ textOf(item.row, column) }}</span>
                </slot>
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
            <NuiTableBodyRow
              v-for="view in bodyViews"
              :key="view.item.key"
              :view="view"
              :slotted="cellSlotted"
              :context="bodyContext"
            >
              <template #detail="scope">
                <slot name="detail" v-bind="scope" />
              </template>
              <template v-for="name in cellSlots" :key="name" #[name]="scope">
                <slot :name="name" v-bind="scope" />
              </template>
            </NuiTableBodyRow>
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
              :revision="revision.stamp"
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
  onBeforeUnmount,
  onBeforeUpdate,
  onMounted,
  ref,
  shallowReactive,
  shallowRef,
  useSlots,
  useTemplateRef,
  watch,
} from 'vue';
import { clamp, onLongPress, useDevicePixelRatio, useResizeObserver } from '@vueuse/core';
import {
  createIntent,
  createVersion,
  ReorderAxis,
  useControlId,
  useDirection,
  useLocale,
  useMessages,
  useVirtualFrame,
  useVirtualList,
  type VirtualFrame,
} from '@numior/primitives';
import { NuiEmpty, NuiMenu, NuiPagination, NuiSkeleton, type NuiSkeletonProps } from '@numior/vue';
import {
  createSourceEngine,
  createTableEngine,
  TableNodeKind,
  type TableEngine,
  type TableFilter,
  type TableQuery,
} from '../engine';
import NuiTableDragLayer from './NuiTableDragLayer.vue';
import NuiTableBodyRow from './NuiTableBodyRow.vue';
import NuiTableRow from './NuiTableRow.vue';
import NuiTableTracks from './NuiTableTracks.vue';
import NuiTableUtilityCell from './NuiTableUtilityCell.vue';
import { tableMessages } from './table.messages';
import {
  anchorOf,
  consecutiveRuns,
  createMergeIndex,
  expandToMerges,
  keepSpans,
  leaveMerge,
  mergeSpans,
  pieceOf,
} from './table-merges';
import { useTextMeasure } from './use-text-measure';
import { forgetCellReads } from './table-cells';
import { ownCellAt, ownDetailOf, rowPositionOf } from './table-dom';
import { cellTextOf, cellValueOf, engineColumnOf } from './table-format';
import { columnTreeOf, headerBandsOf } from './table-columns';
import { orderLeaves } from './table-order';
import {
  centreIndexOf,
  dataKeysOf,
  pinsFit,
  revealOffset,
  rowCellsOf,
  rowHeadWidth,
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
import { useCellMenuArea } from './areas/cell-menu-area';
import { useClipboardArea } from './areas/clipboard-area';
import { useEditingArea } from './areas/editing-area';
import { useGroupsArea } from './areas/groups-area';
import { useHeaderArea } from './areas/header-area';
import { useOverlayArea } from './areas/overlay-area';
import { usePaintArea } from './areas/paint-area';
import { useRowMovesArea } from './areas/row-moves-area';
import { useViewsArea } from './areas/views-area';
import type { TableContext } from './areas/table-context';
import { createEchoes } from './table-echoes';
import { boxOf, clampPosition, columnSpansOf, sameSpot, type RangeBox } from './table-ranges';
import { useTableRanges } from './use-table-ranges';
import { pageRowsOf, pageStepOf } from './table-keys';
import type { TableFilterTarget } from './use-table-header';
import { headFrameOf, headToolsOf, leastWidthOf } from './table-head-tools';
import { useTableColumnOrder } from './use-table-column-order';
import { useTableQuery } from './use-table-query';
import { useTableWarmup } from './use-table-warmup';
import { useTableResize } from './use-table-resize';
import { provideTableHandles } from './table-handles';
import { keepEqual } from './table-values';
import { useTableRowSizes } from './use-table-row-sizes';
import { useTableSelection, type TableSelectionKey } from './use-table-selection';
import {
  NuiTableRowHeight,
  NuiTableSize,
  TablePaneName,
  TablePlacementKind,
  TableRevealAxis,
  TableRowMode,
  TableStatusSlot,
  type NuiTableCellSlot,
  type NuiTableColumn,
  type NuiTableColumnOrder,
  type NuiTableDraft,
  type NuiTableEdgeDirection,
  type NuiTableEvents,
  type NuiTableExpanded,
  type NuiTableExposed,
  type NuiTableFilters,
  type NuiTableGroupBy,
  type NuiTableHidden,
  type NuiTablePins,
  type NuiTableProps,
  type NuiTableRange,
  type NuiTableRanges,
  type NuiTableScrollAnchor,
  type NuiTableRowHeaders,
  type NuiTableRowHeights,
  type NuiTableSlots,
  type NuiTableSort,
  type NuiTableUtilityCellProps,
  type NuiTableWidths,
  type TableBodyRow,
  type NuiTableCellPosition,
  type TableLeadSpan,
  type TableMergeLayout,
  type TableMergeSlot,
  type TableReveal,
  type TableRowSpan,
} from './table.types';

const ROW_SIZES = { sm: 32, md: 40, lg: 48 } as const;
const CANVAS_LIMIT = 15_000_000;
const STILL_FRAME: VirtualFrame = { lead: 0, rest: 0, clampStart: 0, clampEnd: 0 };
const NO_COLUMNS: readonly number[] = [];

const INITIAL_ROWS = 30;
const INITIAL_COLUMNS = 12;
const ROW_OVERSCAN = 6;
const COLUMN_OVERSCAN = 2;
const NO_ROW_HEAD = {} as const;
const NO_HEIGHTS: NuiTableRowHeights = {};
const NO_MERGE_INDEX = createMergeIndex([], { rows: 0, cols: 0 });
const SKELETON_UTILITY: NuiTableUtilityCellProps = { control: 'skeleton' };
const TEXT_SKELETON: NuiSkeletonProps = { shape: 'text', width: '100%' };

const CLICK_GUARD =
  '.nui-table__cell--select, .nui-table__cell--rowhead, .nui-table__row-grip, .nui-table__toggle, .nui-table__group, .nui-table__editor';

const NEST_DELAY = 600;
const COPY_LIMIT = 200_000;
const BLOCK_SIZE = 100;
const SKELETON_ROWS = 5;
const NAMED_ROWS = 10_000;
const LONG_PRESS = 500;

const {
  columns,
  rows = [],
  source,
  blockSize = BLOCK_SIZE,
  getKey,
  id,
  size = NuiTableSize.Md,
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
  gridlines = false,
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
  lastCell,
  keepEditing,
  growEditor = false,
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
const activeCell = defineModel<NuiTableCellPosition | undefined>('active');
const draft = defineModel<NuiTableDraft | undefined>('draft');
const activeEchoes = createEchoes<NuiTableCellPosition | undefined>(sameSpot);
const emit = defineEmits<NuiTableEvents<T>>();
const slots = defineSlots<NuiTableSlots<T>>();
const rawSlots = useSlots();
const overlaid = shallowRef(rawSlots.overlay !== undefined);

const root = useTemplateRef<HTMLElement>('root');
const viewport = useTemplateRef<HTMLElement>('viewport');
const frame = useTemplateRef<HTMLElement>('frame');

const handles = provideTableHandles();
const textMeasure = useTextMeasure(root, () => `${size}:${String(gridlines)}`);
const sortNow = computed<NuiTableSort>((previous) => keepEqual(sort.value, previous));
const filtersNow = computed<NuiTableFilters>((previous) => keepEqual(filters.value, previous));
const groupByNow = computed<NuiTableGroupBy>((previous) => keepEqual(groupBy.value, previous));
const expandedNow = computed<NuiTableExpanded>((previous) => keepEqual(expanded.value, previous));
const tree = computed(() => columnTreeOf(columns));
const orderedLeaves = computed(() => orderLeaves(tree.value.leaves, columnOrder.value));
const filterTarget = shallowRef<TableFilterTarget | null>(null);
const filterOpen = ref(false);

const leastWidths = computed<Readonly<Record<string, number>>>((previous) => {
  const headFrame = headFrameOf(size, gridlines);

  const facts = {
    sort: sortNow.value,
    filters: filtersNow.value,
    pins: pins.value,
    menu: columnMenu !== false,
    opened: filterOpen.value ? filterTarget.value?.key : undefined,
  };

  const next = Object.fromEntries(
    orderedLeaves.value.map((column) => [
      column.key,
      leastWidthOf(headToolsOf(column, facts), headFrame),
    ]),
  );

  return keepEqual(next, previous);
});

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
const revision = createVersion();
const touched = shallowReactive(new Map<number, number>());
let stamp = 0;
const arrangement = createVersion();
const announcement = ref('');
const rowsIntent = createIntent<true>();

const announce = (text: string): void => {
  announcement.value = text;
};

const table: TableContext<T> = {
  viewport,
  frame,
  emit,
  messages,
  announce,
  isRtl: () => direction.isRtl(),
  loading: () => loadingNow.value,
  engine,
  revision,
  pageStart: () => pageStart.value,
  bodyRows: () => visibleRows.value,
  rowAtPosition: (position) => rowAtPosition(position),
  rowAt: (position) => rowAt(position),
  rowFor: (visual) => rowFor(visual),
  active: () => active.value,
  ranges: () => ranges.value,
  layout: () => layout.value,
  columnAt: (key) => columnAt(key),
  dataKeys: () => dataKeys.value,
  dataOffset: () => dataOffset.value,
  rowCells: () => rowCells.value,
  textOf: (row, key) => textOf(row, key),
  scopeOf: (row, position, key, pinned) => scopeOf(row, position, key, pinned),
  headRows: () => headRows.value,
  rowSize: () => rowSize.value,
  pinnedRows: () => pinnedCount.value,
  frozenRows: () => frozenCount.value,
  rowWindow: () => rowWindow,
  columnWindow: () => columnWindow,
};

const selectOn = computed(() => selectable !== undefined);

const {
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
} = useGroupsArea(table, {
  tree: () => (source === undefined ? getChildren !== undefined : source.children !== undefined),
  detailSlot: () => slots.detail !== undefined,
  groupBy: () => groupByNow.value,
  expanded,
  leaves: () => tree.value.leaves,
  treeColumn: () => treeColumn,
  totalsLabel: () => totalsLabel,
  locale: () => resolvedLocale.value,
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
    ? filtersNow.value
    : [...filtersNow.value, { kind: 'quick', value: text, keys: quickKeys.value }];
};

const currentQuery = (): TableQuery => {
  const list = queryFilters();
  const sorting = sortNow.value;

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
    warming.rankSoon((ran.sort ?? []).map((entry) => entry.key));

    if (rowsIntent.take() === true) {
      announcement.value = messages.value.rowsShown({ count });
    }
    emit('settle', { rows: count });
  },
  onTotals: (ran) => {
    totals.take(ran);
  },
  deferTotals: () => source === undefined,
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

const warming = useTableWarmup({
  engine,
  columns: () => tree.value.leaves,
  enabled: () => source === undefined,
});

const active = ref<NuiTableCellPosition>({ row: rowCount.value > 0 ? 0 : -1, col: 0 });

const room = shallowRef(0);

const measureRoom = (): void => {
  room.value = viewport.value?.clientWidth ?? 0;
};

useResizeObserver(viewport, measureRoom);
onMounted(measureRoom);
const { pixelRatio } = useDevicePixelRatio();
const scale = shallowRef(1);

onMounted(() => {
  watch(
    pixelRatio,
    (ratio) => {
      scale.value = ratio;
    },
    { immediate: true },
  );
});

const flexing = computed(() =>
  orderedLeaves.value.some((column) => (column.flex ?? 0) > 0 && !(column.key in widths.value)),
);

const layoutOptions = computed(() => ({
  pins: pins.value,
  hidden: hidden.value,
  widths: widths.value,
  least: leastWidths.value,
  select: selectOn.value,
  room: flexing.value ? room.value : 0,
  wrap: height === undefined || rowHeight === NuiTableRowHeight.Auto,
  rowHeader: rowHeadSize.value,
  scale: scale.value,
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
  return rowHeight === NuiTableRowHeight.Auto ? TableRowMode.Fluid : TableRowMode.Fixed;
});

const windowed = computed(() => rowMode.value !== TableRowMode.Flow);
const fluid = computed(() => rowMode.value === TableRowMode.Fluid);
const labelText = computed(() => label ?? messages.value.label);
const hasCaption = computed(() => caption !== undefined || slots.caption !== undefined);
const captionId = computed(() => `${gridId.value}-caption`);
const selectText = computed(() => selectLabel ?? messages.value.select);
const selectAllText = computed(() => selectAllLabel ?? messages.value.selectAll);
const emptyText = computed(() => emptyLabel ?? messages.value.empty);
const booleanTexts = computed(() => ({ yes: messages.value.yes, no: messages.value.no }));
const centreWidths = computed(() => layout.value.centre.map((column) => column.width));

const footRows = computed(() => (totals.enabled.value ? 1 : 0));

const frozenCount = computed(() =>
  windowed.value && !hierarchical.value && !loadingNow.value && source === undefined
    ? clamp(Math.floor(frozenRows) || 0, 0, visibleRows.value)
    : 0,
);

const gridRole = computed(() => (hierarchical.value ? 'treegrid' : 'grid'));

const rowSizes = useTableRowSizes({
  viewport,
  engine,
  mode: () => rowMode.value,
  measured: () => overlaid.value,
  rowSize: () => rowSize.value,
  count: () => visibleRows.value,
  pageStart: () => pageStart.value,
  leading: () => headRows.value + pinnedCount.value,
  pinned: () => pinnedCount.value,
  spots: () => detailSpots.value,
  heights: () => sizedHeights.value,
  arrangement,
  rendered: () => [bodyRows.value, rowCells.value, pinnedRows],
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
  inset: () => rowSize.value * (headRows.value + footRows.value) + rowSizes.pinnedSize.value,
  listen: false,
});

const frozenSize = computed(() => rowWindow.offsetOf(frozenCount.value));

const columnWindow = useVirtualList(viewport, {
  enabled: windowed,
  axis: ReorderAxis.X,
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

const scrollAnchor = (): NuiTableScrollAnchor | undefined => {
  if (!windowed.value) {
    return undefined;
  }

  const top = rowWindow.anchor();
  const start = columnWindow.anchor();
  const centred = layout.value.centre.length > 0;

  return {
    row: top.index + pinnedCount.value,
    rowOffset: top.within,
    col: centred ? start.index + layout.value.start.length : undefined,
    colOffset: centred ? start.within : 0,
  };
};

const scrollToAnchor = (anchor: NuiTableScrollAnchor): void => {
  if (!windowed.value) {
    return;
  }

  const body = anchor.row - pinnedCount.value;
  const centre = anchor.col === undefined ? undefined : centreIndexOf(layout.value, anchor.col);

  if (body >= 0 && body < visibleRows.value) {
    rowWindow.scrollToAnchor({ index: body, within: anchor.rowOffset });
  }
  if (centre === undefined) {
    return;
  }

  columnWindow.scrollToAnchor({ index: centre, within: anchor.colOffset });
};

const onViewportScroll = (): void => {
  if (!windowed.value) {
    return;
  }

  rowWindow.measure();
  columnWindow.measure();
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
}));

const slack = computed(() => room.value > layout.value.canvasWidth);

watch(
  room,
  (width) => {
    if (width > 0) {
      root.value?.style.setProperty('--_room', `${width}px`);
    } else {
      root.value?.style.removeProperty('--_room');
    }
  },
  { flush: 'post' },
);

const bodySpan = computed(() =>
  Math.max(
    0,
    rowWindow.viewport.value -
      rowSize.value * (headRows.value + footRows.value) -
      rowSizes.pinnedSize.value -
      frozenSize.value,
  ),
);

const fittingRows = computed(() => Math.ceil(bodySpan.value / rowSize.value));

const pagesByCount = (body: number): boolean =>
  body < 0 ||
  body >= visibleRows.value ||
  !windowed.value ||
  typeof rowSizes.itemSize.value === 'number';

const pageRows = (body: number, forward: boolean): number =>
  pagesByCount(body)
    ? pageRowsOf(rowWindow.viewport.value > 0 ? bodySpan.value : undefined, rowSize.value)
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
    'nui-table--gridlines': gridlines,
    'nui-table--slack': slack.value,
    'nui-table--loading': loadingNow.value,
    'nui-table--underlay': windowed.value && (pinnedCount.value > 0 || frozenCount.value > 0),
    'nui-table--resizing': resize.active.value !== undefined,
    'nui-table--sizing': rowResize.active.value !== undefined,
    'nui-table--dragging':
      order.dragging.value !== undefined || rowDrag.dragging.value !== undefined,
    'nui-table--ranging': rangeSelect.dragging.value,
    'nui-table--reading': rangeSelect.reading.value !== undefined,
    'nui-table--cell-selection': cellSelection && !loadingNow.value,
    'nui-table--ranged': ranges.value.length > 0,
    'nui-table--deselected': rangeSelect.deselected.value,
    'nui-table--cell-menu': cellMenu.open.value,
  },
]);

const status = computed<TableStatusSlot | undefined>(() => {
  if (loadingNow.value) {
    return slots.loading === undefined ? undefined : TableStatusSlot.Loading;
  }
  return rowCount.value === 0 ? TableStatusSlot.Empty : undefined;
});

const focus = useTableFocus({
  viewport,
  active,
  rows: rowWindow,
  columns: columnWindow,
  merges: () => mergeIndex.value,
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
  last: () => {
    const target = lastOfData();

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

  if (node?.kind !== TableNodeKind.Row) {
    throw new Error(`NuiTable has no row at position ${position}`);
  }
  return node.row;
};

const inDetail = (event: Event): boolean => ownDetailOf(event.target, viewport.value) !== null;

const resize = useTableResize<T>({
  widths,
  layout: () => layout.value,
  room: () => room.value,
  columnAt,
  leastOf: (key) => leastWidths.value[key] ?? 0,
  isRtl: direction.isRtl,
  messages,
  announce: (text) => {
    announcement.value = text;
  },
  resized: (changes) => {
    emit('columnResize', changes);
  },
});

const fitColumn = (key: string): void => {
  let taken = false;

  emit('columnFit', {
    key,
    preventDefault: () => {
      taken = true;
    },
  });

  if (taken) {
    return;
  }

  resize.reset(key);
};

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

const { header, menu, menuAnchor, valueLabel, loadValues } = useHeaderArea(table, {
  sort,
  filters,
  groupBy,
  pins,
  hidden,
  widths,
  target: filterTarget,
  open: filterOpen,
  columnMenu: () => columnMenu,
  leaves: () => tree.value.leaves,
  treeMode: () => treeOn.value,
  resize,
  order,
  rowsIntent,
  focusHeader: (target) => {
    focus.focusHeader(target);
  },
  locale: () => resolvedLocale.value,
  booleanTexts: () => booleanTexts.value,
});

const selection = useTableSelection<T>({
  mode: () => selectable,
  selected,
  keyOf,
  engine,
  revision,
  scope: () => ({ start: pageStart.value, end: pageStart.value + visibleRows.value }),
  disabled: () => loadingNow.value,
  selectKeyAt: (visual) => layout.value.visual[visual]?.kind === TablePlacementKind.Select,
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

  return node?.kind === TableNodeKind.Row ? node.row : undefined;
};

const {
  dragEnabled,
  rowDrag,
  rowResize,
  sizableOf,
  grabAt,
  onRowResize,
  onRowResetSize,
  refocusMoved,
} = useRowMovesArea(table, {
  draggable: () => rowDragOn && !remote && source === undefined,
  queried: () =>
    sort.value.length > 0 ||
    filters.value.length > 0 ||
    quick.value.trim() !== '' ||
    groupBy.value.length > 0,
  sizable: () => rowHead.value?.resizable === true && source === undefined,
  heights: rowHeights,
  nestDelay: () => nestDelay,
  canNest: (row) =>
    getChildren !== undefined && (getChildren(row) !== undefined || hasChildren?.(row) !== true),
  childCount: (row) => getChildren?.(row)?.length ?? 0,
  keyOf,
  labelOf: (row): string => labelOf(row),
  labelAt: (position): string => rowLabelAt(position),
  selectRow: (position) => {
    rangeSelect.selectRow(position);
  },
  focusCell: (visual) => {
    focus.focusCell(visual);
  },
});

const dataKeys = computed(() => dataKeysOf(layout.value));

const dataOffset = computed(() =>
  Math.max(
    0,
    layout.value.visual.findIndex((column) => column.kind === TablePlacementKind.Data),
  ),
);

const dataOffsets = computed(() => {
  const offsets = [0];

  for (const column of layout.value.visual) {
    if (column.kind !== TablePlacementKind.Data) {
      continue;
    }

    offsets.push((offsets.at(-1) ?? 0) + column.width);
  }
  return offsets;
});

const mergeIndex = computed(() =>
  merges.length > 0 && !hierarchical.value && !loadingNow.value
    ? createMergeIndex(merges, { rows: visibleRows.value, cols: dataKeys.value.length })
    : NO_MERGE_INDEX,
);

const coveredAt = (row: number, col: number): boolean => {
  const merge = mergeIndex.value.at(row, col);

  return merge !== undefined && (merge.top !== row || merge.start !== col);
};

const wholeRange = (range: NuiTableRange): NuiTableRange =>
  expandToMerges(mergeIndex.value, range, {
    rows: visibleRows.value,
    cols: dataKeys.value.length,
  });

const mergeSlots = computed((): TableMergeSlot[] =>
  rowCells.value.cells.map((cell) => ({
    key: cell.key,
    pane: cell.pin ?? 'centre',
    col: cell.kind === TablePlacementKind.Data ? cell.colIndex - 1 - dataOffset.value : undefined,
    edge: cell.edge,
    tail: cell.kind !== TablePlacementKind.Gap && cell.tail === true,
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

const dataCellOf = (visual: NuiTableCellPosition): NuiTableCellPosition | undefined => {
  const row = visual.row - pinnedCount.value;
  const col = visual.col - dataOffset.value;

  return row >= 0 && row < visibleRows.value && col >= 0 && col < dataKeys.value.length
    ? { row, col }
    : undefined;
};

const visualCellOf = (data: NuiTableCellPosition): NuiTableCellPosition => ({
  row: data.row + pinnedCount.value,
  col: data.col + dataOffset.value,
});

const edgeOfData = (
  from: NuiTableCellPosition,
  toward: NuiTableEdgeDirection,
): NuiTableCellPosition | undefined =>
  nextEdge === undefined
    ? undefined
    : clampPosition(nextEdge(from, toward), {
        rows: visibleRows.value,
        cols: dataKeys.value.length,
      });

const lastOfData = (): NuiTableCellPosition | undefined => {
  const last = lastCell?.();

  return last === undefined
    ? undefined
    : clampPosition(last, { rows: visibleRows.value, cols: dataKeys.value.length });
};

const activeMerge = computed(() => {
  const data = mergeIndex.value.size === 0 ? undefined : dataCellOf(active.value);

  return data === undefined ? undefined : mergeIndex.value.at(data.row, data.col);
});

const activeAnchor = computed((): NuiTableCellPosition | undefined => {
  const merge = activeMerge.value;

  return merge === undefined ? undefined : { row: merge.top, col: merge.start };
});

const allyOf = (item: TableBodyRow): NuiTableCellPosition | undefined => {
  const merge = activeMerge.value;

  return merge !== undefined && item.index >= merge.top && item.index <= merge.bottom
    ? activeAnchor.value
    : undefined;
};

const activeLead = computed((): NuiTableCellPosition => {
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

const settleFocus = (focused: NuiTableCellPosition): NuiTableCellPosition => {
  const lead = activeLead.value;

  return focused.row === lead.row && focused.col === lead.col ? active.value : focused;
};

const leaveFrom = (from: NuiTableCellPosition, key: string): NuiTableCellPosition => {
  const data = mergeIndex.value.size === 0 ? undefined : dataCellOf(from);

  return data === undefined
    ? from
    : visualCellOf(leaveMerge(mergeIndex.value, data, key, direction.isRtl()));
};

const cellOfTarget = (target: EventTarget | null): NuiTableCellPosition | undefined => {
  const cell = rangeSelect.cellAt(target);

  return cell === undefined ? undefined : anchorOf(mergeIndex.value, cell);
};

const activeData = (): NuiTableCellPosition | undefined => {
  const body = bodyActive();
  const col = body === undefined ? -1 : body.col - dataOffset.value;

  return body !== undefined && col >= 0 && col < dataKeys.value.length
    ? anchorOf(mergeIndex.value, { row: body.row, col })
    : undefined;
};

const shownActive = computed<NuiTableCellPosition | undefined>((previous) => {
  const next = activeData();

  return sameSpot(next, previous) ? previous : next;
});

const rangeAnchor = (): NuiTableCellPosition | undefined =>
  viewport.value?.contains(document.activeElement) === true ? activeData() : undefined;

const revealed = createIntent<TableReveal>();

const revealCorner = (corner: NuiTableCellPosition, axis: TableRevealAxis): void => {
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

  if (element === null || placed?.pane !== TablePaneName.Centre) {
    return;
  }
  const span = element.clientWidth - layout.value.startWidth - layout.value.endWidth;
  const current = Math.abs(element.scrollLeft);
  const next = revealOffset(current, placed.offset, placed.width, span);

  if (next === current) {
    return;
  }

  element.scrollLeft = direction.isRtl() ? -next : next;
};

const revealInFlow = ({ target, axis }: TableReveal): void => {
  const cell = viewport.value?.querySelector(
    ownCellAt(target.row + headRows.value + 1, target.col + 1),
  );

  switch (axis) {
    case TableRevealAxis.Both:
      cell?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      break;
    case TableRevealAxis.Row:
      cell?.parentElement?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      break;
    case TableRevealAxis.Col:
      revealColumnInFlow(target.col);
      break;
    case TableRevealAxis.None:
      break;
  }
};

const columnMarks = computed(() =>
  rowHead.value === undefined ? undefined : columnSpansOf(ranges.value, dataOffset.value),
);

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
  sorts: (col) => header.head(dataKeys.value[col] ?? '')?.sortable === true,
  merges: () => mergeIndex.value,
  edge: edgeOfData,
  last: lastOfData,
  focus: (position) => {
    focus.focusCell(
      { row: position.row + pinnedCount.value, col: position.col + dataOffset.value },
      false,
    );
  },
  reveal: revealCorner,
  resetOn: [
    sortNow,
    filtersNow,
    quick,
    groupByNow,
    expandedNow,
    pageStart,
    () => dataKeys.value.join('\u0000'),
  ],
  messages,
  announce,
});

const rowAtPosition = (position: number): T | undefined => {
  const node = engine.value.nodeAt(pageStart.value + position);
  return node?.kind === TableNodeKind.Row ? node.row : undefined;
};

const { bodyPaint, pinnedPaint } = usePaintArea(table, {
  cellStyle: () => cellStyle,
  pinned: () => pinnedRows,
  merges: () => mergeIndex.value,
  plainText: (row, position, key): string | undefined => plainText(row, position, key),
  measure: textMeasure,
});

const { clipboard, exporter } = useClipboardArea(table, {
  position: activeData,
  serialize: () => clipboardHooks?.serialize,
  limit: () => copyLimit,
  last: () => lastCell?.(),
});

const { canEdit, editing, cellEditor, picker, rowPlaces, editorProps, onEditorUpdate } =
  useEditingArea(table, {
    leaves: () => tree.value.leaves,
    rows: () => rows,
    getKey: () => getKey,
    nested: () => getChildren !== undefined,
    sourced: () => source !== undefined,
    locale: () => resolvedLocale.value,
    booleanTexts: () => booleanTexts.value,
    controls: () => controls,
    grow: () => growEditor,
    keep: () => keepEditing,
    picking: () => picking,
    hooks: () => clipboardHooks,
    commands: () => commands,
    copyLimit: () => copyLimit,
    errorId: () => `${gridId.value}-error`,
    draft,
    clipboard,
    ranges: rangeSelect,
    position: activeData,
    covered: coveredAt,
    merges: () => mergeIndex.value,
    whole: wholeRange,
    locate: cellOfTarget,
    focusData: (position) => {
      const current = activeData();
      const stays = current?.row === position.row && current.col === position.col;

      focus.focusCell(stays ? active.value : visualCellOf(position));
    },
    reveal: (position) => {
      focus.reveal(visualCellOf(position));
    },
    move: (position) => moveActiveCell(position),
    select: (next) => {
      ranges.value = next;
    },
    applied: (keys, changed) => {
      applyChanged(keys, changed);
    },
    resetOn: [
      sortNow,
      filtersNow,
      quick,
      groupByNow,
      expandedNow,
      pageStart,
      () => dataKeys.value.join('\u0000'),
    ],
  });

const cellMenu = useCellMenuArea(table, {
  option: () => contextMenu,
  cellSelection: () => cellSelection,
  editable: () => canEdit.value,
  clipboard,
  editing,
  ranges: rangeSelect,
  anchorOf: (visual) => {
    const data = dataCellOf(visual);

    return data === undefined ? visual : visualCellOf(anchorOf(mergeIndex.value, data));
  },
  focusCell: (visual) => {
    focus.focusCell(visual, false);
  },
});

const busy = computed(() => query.busy.value || clipboard.busy.value || exporter.busy.value);

const refocusActive = (): void => {
  focus.focusCell(active.value);
};

let unmounted = false;

onBeforeUnmount(() => {
  unmounted = true;
});

onLongPress(
  viewport,
  (event) => {
    if (unmounted || inDetail(event) || !cellMenu.onLongPress(event)) {
      return;
    }

    rangeSelect.swallowClick();
  },
  { delay: LONG_PRESS },
);

watch(
  ranges,
  () => {
    const pending = revealed.take();

    if (pending === undefined) {
      return;
    }

    revealInFlow(pending);
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

  const visual = rowPositionOf(target.closest('[role="row"]'), headRows.value);

  const row = Number.isInteger(visual) ? rowFor(visual) : undefined;

  if (row === undefined) {
    return;
  }

  emit('rowClick', row, event);
};

const bodyActive = (): NuiTableCellPosition | undefined => {
  const row = active.value.row - pinnedCount.value;
  return row >= 0 && row < visibleRows.value ? { row, col: active.value.col } : undefined;
};

const activeRowHead = (): number | undefined =>
  layout.value.visual[active.value.col]?.kind === TablePlacementKind.Rowhead
    ? bodyActive()?.row
    : undefined;

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

  if (header.onKeydown(event) || (body !== undefined && expansion.onKeydown(event, body))) {
    return;
  }

  focus.onKeydown(event);
};

const outsideDetail =
  <E extends Event>(handler: (event: E) => void) =>
  (event: E): void => {
    if (inDetail(event)) {
      return;
    }

    handler(event);
  };

const viewportEvents = {
  keydown: outsideDetail(onKeydown),
  focusin: (event: FocusEvent): void => {
    cellEditor.onFocusin(event);
    focus.onFocusin(ownDetailOf(event.target, viewport.value)?.parentElement ?? event.target);
  },
  pointerdown: outsideDetail((event: PointerEvent) => {
    focus.notePress(event.target);

    if (picker.onPointerdown(event)) {
      return;
    }

    rangeSelect.onPointerdown(event);
  }),
  mousedown: outsideDetail((event: MouseEvent) => {
    if (picker.onMousedown(event)) {
      return;
    }

    rangeSelect.onMousedown(event);
  }),
  contextmenu: outsideDetail(cellMenu.onContextmenu),
  paste: outsideDetail(editing.onPaste),
  click: outsideDetail((event: MouseEvent) => {
    if (picker.onClick(event)) {
      return;
    }

    rangeSelect.onClick(event);
    cellEditor.onClick(event);

    if (!cellSelection) {
      return;
    }

    focus.reclaim();
  }),
  dblclick: outsideDetail((event: MouseEvent) => {
    if (cellEditor.onDblclick(event)) {
      return;
    }

    rangeSelect.onDblclick(event);
  }),
  pointerup: outsideDetail(cellEditor.onPointerup),
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

onBeforeUpdate(() => {
  overlaid.value = rawSlots.overlay !== undefined;
});

const {
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
} = useViewsArea(table, {
  slots: rawSlots,
  rowHead: () => rowHead.value,
  rowLabel: () => rowLabel,
  dragLabel: () => dragLabel,
  striped: () => striped,
  grips: () => rowDragOn,
  selectable: () => selectOn.value,
  pinned: () => pinnedRows,
  getKey: () => getKey,
  heights: () => sizedHeights.value,
  rowMode: () => rowMode.value,
  skeletons: () => skeletonCount.value,
  firstOrdinal: () => (remote ? (Math.max(1, page.value) - 1) * pageSize.value : pageStart.value),
  selectText: () => selectText.value,
  selectAllText: () => selectAllText.value,
  selection,
  groups: {
    treeOn,
    treeKey,
    detailPositions,
    detailSpots,
    detailScope,
    expansion,
    levelOf,
    expandedOf,
  },
  moves: { dragEnabled, rowDrag, rowResize, sizableOf, grabAt, onRowResize, onRowResetSize },
  editingCell: () => cellEditor.session.value,
  editor: () => editorProps.value,
  update: onEditorUpdate,
  paint: () => bodyPaint.value,
  activeIn: (position) => focus.activeIn(position),
  revisionOf: (position) => revisionOf(position),
  segmentsOf: (row) => rangeSelect.segmentsOf(row),
  merged: () => mergeIndex.value.size > 0,
  spans: spansOf,
  ally: allyOf,
  hostsCursor,
  sync: () => {
    sync();
  },
});

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
  rowCount.value = engine.value.count();
  revision.bump();

  if (touched.size === 0) {
    return;
  }

  touched.clear();
};

const applyChanged = (keys: readonly string[], changed?: readonly T[]): void => {
  totals.reset();

  const ran = currentQuery();

  const moved = engine.value.patch(ran, keys, changed);

  totals.take(ran);

  if (moved) {
    rearrange();
    clampActive();
    return;
  }

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
    if (!boxes.some((box) => item.index >= box.top && item.index <= box.bottom)) {
      continue;
    }

    touched.set(item.index, stamp);
  }
};

const rowsIn = (list: NuiTableRanges): T[] | undefined => {
  const boxes = list.map(boxOf);
  const count = boxes.reduce((sum, box) => sum + box.bottom - box.top + 1, 0);

  if (count > NAMED_ROWS) {
    return undefined;
  }
  return boxes.reduce<T[]>((found, box) => {
    for (let position = box.top; position <= box.bottom; position += 1) {
      const row = rowAtPosition(position);

      if (row === undefined) {
        continue;
      }

      found.push(row);
    }
    return found;
  }, []);
};

const invalidate = (list?: NuiTableRanges): void => {
  forgetCellReads();

  if (list === undefined || queryActive()) {
    applyChanged(dataKeys.value, list === undefined ? undefined : rowsIn(list));
    return;
  }
  touchRows(list);
};

const rearrange = (): void => {
  arrangement.bump();
  sync();
};

const clampActive = (): void => {
  const rowsInFocus = visibleRows.value + footRows.value;
  const lastRow = rowsInFocus > 0 ? rowsInFocus - 1 : -1;
  const lastCol = Math.max(0, layout.value.visual.length - 1);
  const row = Math.min(active.value.row, lastRow);
  const col = Math.min(active.value.col, lastCol);

  if (row === active.value.row && col === active.value.col) {
    return;
  }

  active.value = { row, col };
};

watch(quick, () => {
  rowsIntent.set(true);
});

const inBody = (position: NuiTableCellPosition): boolean =>
  position.row >= 0 &&
  position.row < visibleRows.value &&
  position.col >= 0 &&
  position.col < dataKeys.value.length;

const moveActiveTo = (position: NuiTableCellPosition): boolean => {
  if (!inBody(position)) {
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

const focusCellAt = (position: NuiTableCellPosition, scroll = true): boolean => {
  if (!inBody(position)) {
    return false;
  }
  focus.focusCell(visualCellOf(anchorOf(mergeIndex.value, position)), scroll);
  return true;
};

const moveActiveCell = (position: NuiTableCellPosition): boolean => {
  if (!inBody(position)) {
    return false;
  }
  const target = visualCellOf(position);

  if (cellEditor.session.value !== undefined) {
    if (!cellEditor.carry(position)) {
      return false;
    }
    active.value = target;
    focus.reveal(target);
    return true;
  }
  if (viewport.value?.contains(document.activeElement) === true) {
    focus.focusCell(target, false);
  } else {
    active.value = target;
  }
  return true;
};

const shareActive = (next: NuiTableCellPosition | undefined): void => {
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

watch(visibleRows, clampActive);

watch(pageStart, () => {
  if (!windowed.value) {
    return;
  }

  rowWindow.scrollTo(0, { align: 'start' });
});

watch(
  layout,
  (next, previous) => {
    const key = previous.visual[active.value.col]?.key;
    const index = key === undefined ? -1 : next.visual.findIndex((column) => column.key === key);

    const col =
      index >= 0 ? index : Math.min(active.value.col, Math.max(0, next.visual.length - 1));

    if (col === active.value.col) {
      return;
    }

    active.value = { ...active.value, col };
  },
  { flush: 'sync' },
);

watch(expandedNow, (ids) => {
  engine.value.setToggled(ids);
  rearrange();
  clampActive();
});

watch(
  () => rows,
  (next) => {
    const held = rowPlaces.hold();

    engine.value.setRows(next);
    engine.value.setToggled(expanded.value);
    expansion.settle();
    totals.reset();

    if (getKey === undefined) {
      editing.reset();
    }
    runNow();
    rearrange();
    rowPlaces.restore(held);
    clampActive();
    refocusMoved();
    warming.restart();
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
  warming.restart();
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

const { overlay, cellKeyOf, cellPositionOf } = useOverlayArea(table, {
  headSize: () => rowSize.value * headRows.value + rowSizes.pinnedSize.value,
  expand: wholeRange,
});

defineExpose<NuiTableExposed>({
  scrollToRow: (position) => {
    rowWindow.scrollTo(position, { align: 'start' });
  },
  scrollToColumn: (key) => {
    const index = layout.value.centre.findIndex((column) => column.key === key);

    if (index < 0) {
      return;
    }

    columnWindow.scrollTo(index, { align: 'start' });
  },
  copy: (options) => clipboard.copy(options?.headers === true),
  undo: () => editing.undo(),
  redo: () => editing.redo(),
  exportCsv: (options) => exporter.exportCsv(options),
  refresh: () => {
    engine.value.refresh();
  },
  rectOf: overlay.rectOf,
  keyOf: cellKeyOf,
  positionOf: cellPositionOf,
  cellFromPoint: overlay.cellFromPoint,
  cellNear: overlay.cellNear,
  followEdge: overlay.followEdge,
  stopEdge: overlay.stopEdge,
  scrollPosition: () => ({
    top: viewport.value?.scrollTop ?? 0,
    left: viewport.value?.scrollLeft ?? 0,
  }),
  scrollAnchor,
  scrollToAnchor,
  startEdit: (mode, options) => cellEditor.start(mode, options?.focus ?? true),
  commitEdit: (move = 'stay') => cellEditor.commit(move),
  cancelEdit: () => {
    cellEditor.cancel();
  },
  focusCell: focusCellAt,
  moveActive: moveActiveCell,
  invalidate,
  fitWidth: (text, style) => textMeasure.widthOf(text, style?.style, style?.icon !== undefined),
});
</script>
