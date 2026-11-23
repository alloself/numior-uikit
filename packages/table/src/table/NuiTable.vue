<template>
  <div ref="root" class="nui-table" :class="rootClass" :style="rootStyle">
    <p v-if="hasCaption" :id="captionId" class="nui-table__caption">
      <slot name="caption">{{ caption }}</slot>
    </p>
    <div ref="frame" class="nui-table__frame">
      <div
        ref="viewport"
        class="nui-table__viewport"
        :style="viewportStyle"
        @scroll.passive="onViewportScroll"
        @pointerdown.capture="handles.onPointerdown"
        v-on="viewportEvents"
      >
        <div class="nui-table__lane" :style="laneStyle">
          <table
            :id="gridId"
            class="nui-table__grid"
            :role="gridRole"
            :style="gridStyle"
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
                  <NuiTableUtilityCell
                    v-bind="headUtility(column)"
                    @toggle="selection.toggleAll()"
                  />
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
                  <slot
                    :name="`cell-${column}`"
                    v-bind="scopeOf(item.row, item.index, column, true)"
                  >
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
import { computed, onBeforeUpdate, ref, shallowRef, useSlots, useTemplateRef } from 'vue';
import {
  useControlId,
  useDirection,
  useLocale,
  useMessages,
  type VirtualList,
} from '@numior/primitives';
import { NuiEmpty, NuiMenu, NuiPagination, NuiSkeleton, type NuiSkeletonProps } from '@numior/vue';
import NuiTableDragLayer from './NuiTableDragLayer.vue';
import NuiTableBodyRow from './NuiTableBodyRow.vue';
import NuiTableRow from './NuiTableRow.vue';
import NuiTableTracks from './NuiTableTracks.vue';
import NuiTableUtilityCell from './NuiTableUtilityCell.vue';
import { tableMessages } from './table.messages';
import { anchorOf } from './table-merges';
import { useTextMeasure } from './use-text-measure';
import { cellTextOf, cellValueOf } from './table-format';
import { columnTreeOf } from './table-columns';
import { orderLeaves } from './table-order';
import type { TableLayout } from './table-layout';
import NuiTableFilter from './NuiTableFilter.vue';
import NuiTableFooterCell from './NuiTableFooterCell.vue';
import NuiTableHeaderMarks from './NuiTableHeaderMarks.vue';
import { useCellMenuArea } from './areas/cell-menu-area';
import { useDataArea } from './areas/data-area';
import { useColumnsArea } from './areas/columns-area';
import { useClipboardArea } from './areas/clipboard-area';
import { useEditingArea } from './areas/editing-area';
import { useFocusArea } from './areas/focus-area';
import { useHeaderArea } from './areas/header-area';
import { useKeysArea } from './areas/keys-area';
import { useOverlayArea } from './areas/overlay-area';
import { usePaintArea } from './areas/paint-area';
import { useRowMovesArea } from './areas/row-moves-area';
import { useViewsArea } from './areas/views-area';
import { useWindowsArea } from './areas/windows-area';
import type { TableFilterTarget } from './use-table-header';
import { provideTableHandles } from './table-handles';
import { keepEqual } from './table-values';
import type { TableSelectionKey } from './use-table-selection';
import {
  NuiTableRowHeight,
  NuiTableSize,
  TableStatusSlot,
  type NuiTableCellSlot,
  type NuiTableColumn,
  type NuiTableColumnOrder,
  type NuiTableDraft,
  type NuiTableEvents,
  type NuiTableExpanded,
  type NuiTableExposed,
  type NuiTableFilters,
  type NuiTableGroupBy,
  type NuiTableHidden,
  type NuiTablePins,
  type NuiTableProps,
  type NuiTableRanges,
  type NuiTableRowHeaders,
  type NuiTableRowHeights,
  type NuiTableSlots,
  type NuiTableSort,
  type NuiTableUtilityCellProps,
  type NuiTableWidths,
  type NuiTableCellPosition,
  type TableRowCells,
  type TableRowPlaces,
} from './table.types';

const NO_ROW_HEAD = {} as const;
const NO_HEIGHTS: NuiTableRowHeights = {};
const SKELETON_UTILITY: NuiTableUtilityCellProps = { control: 'skeleton' };
const TEXT_SKELETON: NuiSkeletonProps = { shape: 'text', width: '100%' };

const NEST_DELAY = 600;
const COPY_LIMIT = 200_000;
const BLOCK_SIZE = 100;

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

const gridId = useControlId(() => id);
const resolvedLocale = useLocale(() => locale);
const messages = useMessages(tableMessages, resolvedLocale);
const direction = useDirection(viewport);

const announcement = ref('');

const announce = (text: string): void => {
  announcement.value = text;
};

const {
  table,
  paginationProps,
  loadingNow,
  rowCount,
  revision,
  arrangement,
  rowsIntent,
  pageStart,
  pinnedCount,
  visibleRows,
  totalCount,
  footRows,
  queryBusy,
  treeOn,
  hierarchical,
  detailPositions,
  detailSpots,
  detailScope,
  treeKey,
  totals,
  expansion,
  levelOf,
  expandedOf,
  sync,
  applyChanged,
  revisionOf,
  invalidate,
  refresh,
  watchSources,
} = useDataArea({
  shell: {
    viewport,
    frame,
    emit,
    messages,
    announce,
    isRtl: () => direction.isRtl(),
    active: (): NuiTableCellPosition => active.value,
    ranges: () => ranges.value,
    layout: (): TableLayout => layout.value,
    columnAt: (key): NuiTableColumn<T> => columnAt(key),
    dataKeys: (): readonly string[] => dataKeys.value,
    dataOffset: (): number => dataOffset.value,
    rowCells: (): TableRowCells => rowCells.value,
    textOf: (row, key): string => textOf(row, key),
    scopeOf: (row, position, key, pinned): NuiTableCellSlot<T> =>
      scopeOf(row, position, key, pinned),
    headRows: (): number => headRows.value,
    rowSize: (): number => rowSize.value,
    frozenRows: (): number => frozenCount.value,
    rowWindow: (): VirtualList => rowWindow,
    columnWindow: (): VirtualList => columnWindow,
  },
  rows: () => rows,
  columns: () => columns,
  leaves: () => tree.value.leaves,
  source: () => source,
  getKey: () => getKey,
  getChildren: () => getChildren,
  hasChildren: () => hasChildren,
  hasDetail: () => hasDetail,
  detailSlot: () => slots.detail !== undefined,
  blockSize: () => blockSize,
  pagination: () => pagination,
  height: () => height,
  page,
  pageSize,
  remote: () => remote,
  total: () => total,
  pinned: () => pinnedRows,
  loading: () => loading,
  expanded,
  expandedNow,
  quick,
  sorting: () => sortNow.value,
  filters: () => filtersNow.value,
  groupBy: () => groupByNow.value,
  hidden: () => hidden.value,
  treeColumn: () => treeColumn,
  totalsLabel: () => totalsLabel,
  locale: () => resolvedLocale.value,
  windowed: (): boolean => windowed.value,
  clampActive: (): void => {
    clampActive();
  },
  places: (): TableRowPlaces<T> => rowPlaces,
  resetEdits: (): void => {
    editing.reset();
  },
  refocusMoved: (): void => {
    refocusMoved();
  },
});

const selectOn = computed(() => selectable !== undefined);

const keyOf = (row: T): TableSelectionKey<T> => (getKey === undefined ? row : getKey(row));

const rowHead = computed<NuiTableRowHeaders<T> | undefined>(() => {
  if (rowHeaders === undefined || rowHeaders === false) {
    return undefined;
  }
  return rowHeaders === true ? NO_ROW_HEAD : rowHeaders;
});

const sizedHeights = computed(() => (source === undefined ? rowHeights.value : NO_HEIGHTS));

const active = ref<NuiTableCellPosition>({ row: rowCount.value > 0 ? 0 : -1, col: 0 });

const {
  layout,
  headRows,
  columnAt,
  dataKeys,
  dataOffset,
  dataOffsets,
  rowCells,
  bands,
  slack,
  resize,
  fitColumn,
  order,
} = useColumnsArea(table, {
  root,
  tree: () => tree.value,
  ordered: () => orderedLeaves.value,
  widths,
  order: columnOrder,
  pins,
  hidden,
  sorting: () => sortNow.value,
  filters: () => filtersNow.value,
  menu: () => columnMenu !== false,
  opened: () => (filterOpen.value ? filterTarget.value?.key : undefined),
  size: () => size,
  gridlines: () => gridlines,
  selectable: () => selectOn.value,
  wrap: () => height === undefined || rowHeight === NuiTableRowHeight.Auto,
  rowHead: () => rowHead.value,
  totalCount: () => totalCount.value,
  shown: (): readonly number[] => shownCentre.value,
  focusHeader: (key): void => {
    focus.focusHeader({ kind: 'column', key });
  },
});

const labelText = computed(() => label ?? messages.value.label);
const hasCaption = computed(() => caption !== undefined || slots.caption !== undefined);
const captionId = computed(() => `${gridId.value}-caption`);
const selectText = computed(() => selectLabel ?? messages.value.select);
const selectAllText = computed(() => selectAllLabel ?? messages.value.selectAll);
const emptyText = computed(() => emptyLabel ?? messages.value.empty);
const booleanTexts = computed(() => ({ yes: messages.value.yes, no: messages.value.no }));
const gridRole = computed(() => (hierarchical.value ? 'treegrid' : 'grid'));

const {
  rowSize,
  rowMode,
  windowed,
  fluid,
  frozenCount,
  rowSizes,
  rowWindow,
  columnWindow,
  frozenSize,
  shownCentre,
  pageRows,
  skeletonCount,
  viewportStyle,
  laneStyle,
  gridStyle,
  columnLead,
  scrollAnchor,
  scrollToAnchor,
  onViewportScroll,
  revealCorner,
} = useWindowsArea(table, {
  size: () => size,
  rowHeight: () => rowHeight,
  height: () => height,
  frozen: () => frozenRows,
  sourced: () => source !== undefined,
  hierarchical: () => hierarchical.value,
  measured: () => overlaid.value,
  heights: () => sizedHeights.value,
  spots: () => detailSpots.value,
  arrangement,
  rendered: (): unknown => [bodyRows.value, rowCells.value, pinnedRows],
  footRows: () => footRows.value,
  loadingRows: () => loadingRows,
  loadingSlot: () => slots.loading !== undefined,
  revealCell: (target, axis): void => {
    focus.reveal(target, axis);
  },
});

const rootStyle = computed(() => ({
  '--_row': `${rowSize.value}px`,
  '--_head-rows': String(headRows.value),
  '--_pinned-rows': String(pinnedCount.value),
  '--_frozen': `${frozenSize.value}px`,
  '--_height': height,
  '--_start': `${layout.value.startWidth}px`,
  '--_end': `${layout.value.endWidth}px`,
}));

const rootClass = computed(() => [
  `nui-table--size-${size}`,
  {
    'nui-table--busy': queryBusy.value,
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

const gridAria = computed(() => {
  const captioned = hasCaption.value && label === undefined;

  return {
    'aria-label': captioned ? undefined : labelText.value,
    'aria-labelledby': captioned ? captionId.value : undefined,
    'aria-rowcount': pinnedCount.value + visibleRows.value + headRows.value + footRows.value,
    'aria-colcount': layout.value.visual.length,
    'aria-busy': loadingNow.value || queryBusy.value || undefined,
    'aria-multiselectable': selection.multiple.value || cellSelection || undefined,
  };
});

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

const {
  focus,
  selection,
  rangeSelect,
  mergeIndex,
  coveredAt,
  wholeRange,
  spansOf,
  allyOf,
  hostsCursor,
  dataCellOf,
  visualCellOf,
  cellOfTarget,
  activeData,
  bodyActive,
  activeRowHead,
  columnMarks,
  clampActive,
  focusCellAt,
  moveActiveCell,
} = useFocusArea(table, {
  root,
  active,
  activeCell,
  ranges,
  selected,
  selectMode: () => selectable,
  keyOf,
  cellSelection: () => cellSelection,
  keep: () => keepEditing,
  rowHeads: () => rowHead.value !== undefined,
  merges: () => merges,
  hierarchical: () => hierarchical.value,
  nextEdge: () => nextEdge,
  lastCell: () => lastCell,
  footRows: () => footRows.value,
  windowed: () => windowed.value,
  pageRows,
  dataOffsets: () => dataOffsets.value,
  sortable: (key) => header.head(key)?.sortable === true,
  reveal: revealCorner,
  editing: (): boolean => cellEditor.session.value !== undefined,
  carry: (position): boolean => cellEditor.carry(position),
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

const busy = computed(() => queryBusy.value || clipboard.busy.value || exporter.busy.value);

const refocusActive = (): void => {
  focus.focusCell(active.value);
};

const { onRowsClick, viewportEvents } = useKeysArea(table, {
  cellSelection: () => cellSelection,
  cellMenu,
  clipboard,
  cellEditor,
  editing,
  picker,
  ranges: rangeSelect,
  rowResize,
  rowDrag,
  selection,
  header,
  expansion,
  focus,
  bodyActive,
  activeRowHead,
});

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

watchSources();

const { overlay, cellKeyOf, cellPositionOf } = useOverlayArea(table, {
  headSize: () => rowSize.value * headRows.value + rowSizes.pinnedSize.value,
  columnLead: () => columnLead.value,
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
  refresh,
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
