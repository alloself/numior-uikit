<template>
  <div class="nui-table" :class="rootClass" :style="rootStyle">
    <p v-if="hasCaption" :id="captionId" class="nui-table__caption">
      <slot name="caption">{{ caption }}</slot>
    </p>
    <div ref="frame" class="nui-table__frame">
      <div
        ref="viewport"
        class="nui-table__viewport"
        @scroll.passive="onViewportScroll"
        @keydown="onKeydown"
        @focusin="focus.onFocusin"
        @pointerdown="rangeSelect.onPointerdown"
        @mousedown="rangeSelect.onMousedown"
        @contextmenu="cellMenu.onContextmenu"
        @paste="editing.onPaste"
        @click="cellEditor.onClick"
        @dblclick="cellEditor.onDblclick"
        @pointerup="cellEditor.onPointerup"
      >
        <table
          :id="gridId"
          class="nui-table__grid"
          :role="hierarchical ? 'treegrid' : 'grid'"
          v-bind="gridAria"
        >
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
              :active="focus.activeIn(item.index)"
              :revision="revision"
              :selected="item.selected"
            >
              <template #utility>
                <NuiTableUtilityCell
                  v-bind="pinnedUtility(item)"
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
            <NuiTableRow
              v-for="item in bodyRows"
              :key="item.key"
              :cells="rowCells"
              :row-index="item.index + pinnedCount + headRows + 1"
              :top="item.top"
              :active="focus.activeIn(item.index + pinnedCount)"
              :revision="item.revision"
              :level="item.level"
              :group="item.group"
              :expanded="item.expanded"
              :loading="item.loading"
              :selected="item.selected"
              :stripe="item.stripe"
              :dragging="rowDrag.dragging.value === item.index"
              :ranged="rangedOf(item)"
            >
              <template #utility>
                <NuiTableUtilityCell
                  v-bind="rowUtility(item)"
                  @toggle="selection.toggle(rowAt(item.index))"
                />
              </template>
              <template #default="{ column }">
                <CellContent :item="item" :position="item.index" :column="column" />
              </template>
            </NuiTableRow>
          </tbody>
          <tbody v-if="canvasRest > 0" class="nui-table__canvas">
            <tr ref="rest" class="nui-table__rest" role="presentation" :style="restStyle">
              <td :colspan="rowCells.tracks.length"></td>
            </tr>
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
      :anchor="menu.target.value?.anchor ?? null"
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
  ref,
  renderSlot,
  shallowRef,
  useSlots,
  useTemplateRef,
  watch,
  type VNode,
} from 'vue';
import { onLongPress, useElementSize } from '@vueuse/core';
import { formRulesMessages } from '@numior/forms';
import {
  createIntent,
  useControlId,
  useControls,
  useDirection,
  useLocale,
  useMessages,
  useVirtualList,
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
  createTableEngine,
  type TableDistinct,
  type TableEngine,
  type TableFilter,
  type TableFilterValue,
  type TableQuery,
  type TableNode,
} from '../engine';
import NuiTableCellEditor from './NuiTableCellEditor.vue';
import NuiTableDragLayer from './NuiTableDragLayer.vue';
import NuiTableRowGrip from './NuiTableRowGrip.vue';
import NuiTableGroupCell from './NuiTableGroupCell.vue';
import NuiTableRow from './NuiTableRow.vue';
import NuiTableTracks from './NuiTableTracks.vue';
import NuiTableTreeToggle from './NuiTableTreeToggle.vue';
import NuiTableUtilityCell from './NuiTableUtilityCell.vue';
import { tableMessages } from './table.messages';
import { cellTextOf, cellValueOf, engineColumnOf, valueTextOf } from './table-format';
import { columnTreeOf, headerBandsOf } from './table-columns';
import { orderLeaves } from './table-order';
import {
  centreIndexOf,
  dataKeyAt,
  dataKeysOf,
  pinsFit,
  rowCellsOf,
  SELECT_KEY,
  tableLayout,
} from './table-layout';
import { pageWindowOf, resolvePagination } from './table-pages';
import NuiTableFilter from './NuiTableFilter.vue';
import NuiTableFooterCell from './NuiTableFooterCell.vue';
import NuiTableHeaderMarks from './NuiTableHeaderMarks.vue';
import { useTableFocus } from './use-table-focus';
import { useTableClipboard, type TableCopyCell } from './use-table-clipboard';
import { useTableContextMenu } from './use-table-context-menu';
import { useTableCellEditor } from './use-table-cell-editor';
import { useTableEditing } from './use-table-editing';
import { useTableExport } from './use-table-export';
import { editorPlan } from './table-editors';
import { parseCell } from './table-parse';
import { ruleFailure } from './table-rules';
import { useTableRanges } from './use-table-ranges';
import { pageRowsOf } from './table-keys';
import { useTableExpansion } from './use-table-expansion';
import { useTableHeader, type TableHeader } from './use-table-header';
import { useTableMenu, type TableMenu } from './use-table-menu';
import { useTableColumnOrder } from './use-table-column-order';
import { useTableQuery } from './use-table-query';
import { useTableResize } from './use-table-resize';
import { useTableRowDrag } from './use-table-row-drag';
import { useTableTotals } from './use-table-totals';
import { useTableSelection, type TableSelectionKey } from './use-table-selection';
import type {
  TableBodyRow,
  TableCellContentProps,
  TableCellPosition,
  TablePinnedRow,
  TableSkeletonRow,
  TableStatusSlot,
  NuiTableCellSlot,
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
  NuiTableRanges,
  NuiTableWidths,
  TableRowRanges,
} from './table.types';

const ROW_SIZES = { sm: 32, md: 40, lg: 48 } as const;
const CANVAS_LIMIT = 15_000_000;
const INITIAL_ROWS = 30;
const INITIAL_COLUMNS = 12;
const ROW_OVERSCAN = 6;
const DISTINCT_LIMIT = 100;
const COLUMN_OVERSCAN = 2;
const NO_UTILITY: NuiTableUtilityCellProps = { control: 'none' };
const SKELETON_UTILITY: NuiTableUtilityCellProps = { control: 'skeleton' };
const TEXT_SKELETON: NuiSkeletonProps = { shape: 'text', width: '100%' };

const CLICK_GUARD =
  '.nui-table__cell--select, .nui-table__row-grip, .nui-table__toggle, .nui-table__group, .nui-table__editor';

const NEST_DELAY = 600;
const COPY_LIMIT = 200_000;
const LONG_PRESS = 500;

const {
  columns,
  rows,
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
  treeColumn,
  columnMenu = true,
  selectable,
  striped = false,
  caption,
  loading = false,
  loadingRows = 5,
  selectLabel,
  selectAllLabel,
  pagination = undefined,
  remote = false,
  total,
  pinnedRows = [],
  rowDrag: rowDragOn = false,
  nestDelay = NEST_DELAY,
  dragLabel,
  rowLabel,
  cellSelection = true,
  contextMenu = undefined,
  copyLimit = COPY_LIMIT,
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
const emit = defineEmits<NuiTableEvents<T>>();
const slots = defineSlots<NuiTableSlots<T>>();
const rawSlots = useSlots();

const viewport = useTemplateRef<HTMLElement>('viewport');
const frame = useTemplateRef<HTMLElement>('frame');
const tree = computed(() => columnTreeOf(columns));
const orderedLeaves = computed(() => orderLeaves(tree.value.leaves, columnOrder.value));
const gridId = useControlId(() => id);
const resolvedLocale = useLocale(() => locale);
const messages = useMessages(tableMessages, resolvedLocale);
const direction = useDirection(viewport);

const createEngine = (): TableEngine<T> =>
  createTableEngine({
    columns: tree.value.leaves.map(engineColumnOf),
    keyOf: getKey,
    children: getChildren,
    hasChildren,
    defaultExpanded: false,
  });

const engine = shallowRef(createEngine());
const rowCount = ref(0);
const revision = ref(0);
const announcement = ref('');
const rowsIntent = createIntent<'rows'>();
const selectOn = computed(() => selectable !== undefined);
const paginationProps = computed(() => resolvePagination(pagination));

const pageWindow = computed(() =>
  paginationProps.value === undefined || remote
    ? { start: 0, end: rowCount.value, page: 1, pages: 1 }
    : pageWindowOf(rowCount.value, page.value, pageSize.value),
);

const pageStart = computed(() => pageWindow.value.start);
const pinnedCount = computed(() => pinnedRows.length);
const visibleRows = computed(() => (loading ? 0 : pageWindow.value.end - pageWindow.value.start));
const totalCount = computed(() => (remote ? (total ?? rows.length) : rowCount.value));

const keyOf = (row: T): TableSelectionKey<T> => (getKey === undefined ? row : getKey(row));

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
  rowCount: () => engine.value.rowCount(),
});

const currentQuery = (): TableQuery => {
  const list = queryFilters();
  const sorting = sort.value;
  const grouping = getChildren === undefined ? groupBy.value : [];

  return remote
    ? {}
    : { sort: sorting, filters: list, groupBy: grouping, totals: totals.wanted(list) };
};

const query = useTableQuery({
  engine,
  query: currentQuery,
  onSettled: (count, ran) => {
    totals.take(ran);
    sync();
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
  wrap: height === undefined,
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

const rowSize = computed(() => rowHeight ?? ROW_SIZES[size]);
const windowed = computed(() => height !== undefined);
const labelText = computed(() => label ?? messages.value.label);
const hasCaption = computed(() => caption !== undefined || slots.caption !== undefined);
const captionId = computed(() => `${gridId.value}-caption`);
const selectText = computed(() => selectLabel ?? messages.value.select);
const selectAllText = computed(() => selectAllLabel ?? messages.value.selectAll);
const emptyText = computed(() => emptyLabel ?? messages.value.empty);
const booleanTexts = computed(() => ({ yes: messages.value.yes, no: messages.value.no }));
const centreWidths = computed(() => layout.value.centre.map((column) => column.width));

const footRows = computed(() => (totals.enabled.value ? 1 : 0));
const hierarchical = computed(() => groupBy.value.length > 0 || getChildren !== undefined);

const activeRow = (): number | undefined => {
  const body = active.value.row - pinnedCount.value;
  return body >= 0 && body < visibleRows.value ? body : undefined;
};

const activeCentre = (): number | undefined => centreIndexOf(layout.value, active.value.col);

const rowWindow = useVirtualList(viewport, {
  enabled: windowed,
  count: () => visibleRows.value,
  itemSize: rowSize,
  overscan: ROW_OVERSCAN,
  initialCount: INITIAL_ROWS,
  pinned: activeRow,
  maxSize: CANVAS_LIMIT,
  inset: () => rowSize.value * (headRows.value + pinnedCount.value + footRows.value),
  listen: false,
});

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

const rowCells = computed(() =>
  rowCellsOf(
    layout.value,
    columnWindow.items.value.map((item) => item.index),
  ),
);

const bands = computed(() => headerBandsOf(layout.value, tree.value, rowCells.value));

const rootStyle = computed(() => ({
  '--_row': `${rowSize.value}px`,
  '--_head-rows': String(headRows.value),
  '--_pinned-rows': String(pinnedCount.value),
  '--_height': height,
  '--_start': `${layout.value.startWidth}px`,
  '--_end': `${layout.value.endWidth}px`,
  '--_canvas': `${layout.value.canvasWidth}px`,
  ...(room.value > 0 ? { '--_room': `${room.value}px` } : {}),
}));

const skeletonCount = computed(() => (loading && slots.loading === undefined ? loadingRows : 0));

const canvasSize = computed(() =>
  loading ? skeletonCount.value * rowSize.value : rowWindow.canvasSize.value,
);

const canvasRest = computed(() => {
  if (!windowed.value || loading) {
    return 0;
  }
  const rendered = rowWindow.items.value.reduce((sum, item) => sum + item.size, 0);

  return Math.max(0, canvasSize.value - rendered);
});

const restStyle = computed(() => ({ '--_rest': `${canvasRest.value}px` }));
const rest = useTemplateRef<HTMLElement>('rest');
const bodyTop = computed(() => rowSize.value * (headRows.value + pinnedCount.value));

watch(canvasRest, (next, previous) => {
  if (next > previous) {
    rest.value?.style.setProperty('--_rest', `${next}px`);
  }
});

const rootClass = computed(() => [
  `nui-table--size-${size}`,
  {
    'nui-table--busy': query.busy.value,
    'nui-table--totals': totals.enabled.value,
    'nui-table--auto': !windowed.value,
    'nui-table--captioned': hasCaption.value,
    'nui-table--paged': paginationProps.value !== undefined,
    'nui-table--striped': striped,
    'nui-table--loading': loading,
    'nui-table--resizing': resize.active.value !== undefined,
    'nui-table--dragging':
      order.dragging.value !== undefined || rowDrag.dragging.value !== undefined,
    'nui-table--ranging': rangeSelect.dragging.value,
    'nui-table--cell-selection': cellSelection && !loading,
    'nui-table--ranged': ranges.value.length > 0 || rangeSelect.deselected.value,
  },
]);

const status = computed<TableStatusSlot | undefined>(() => {
  if (loading) {
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
  rowSize: () => rowSize.value,
  centreIndexOf: (visual) => centreIndexOf(layout.value, visual),
  columnIndexOf: (key) => layout.value.visual.findIndex((column) => column.key === key),
  isRtl: direction.isRtl,
  windowed: () => windowed.value,
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

const selection = useTableSelection<T>({
  mode: () => selectable,
  selected,
  keyOf,
  engine,
  revision,
  scope: () => ({ start: pageStart.value, end: pageStart.value + visibleRows.value }),
  disabled: () => loading,
  selectKeyAt: (visual) => layout.value.visual[visual]?.kind === 'select',
});

const gridAria = computed(() => {
  const captioned = hasCaption.value && label === undefined;

  return {
    'aria-label': captioned ? undefined : labelText.value,
    'aria-labelledby': captioned ? captionId.value : undefined,
    'aria-rowcount': pinnedCount.value + visibleRows.value + headRows.value + footRows.value,
    'aria-colcount': layout.value.visual.length,
    'aria-busy': loading || query.busy.value || undefined,
    'aria-multiselectable': selection.multiple.value || cellSelection || undefined,
  };
});

const headUtility = (column: string): NuiTableUtilityCellProps =>
  column === SELECT_KEY && selection.multiple.value
    ? {
        control: 'checkbox',
        checked: selection.headerState.value === 'checked',
        indeterminate: selection.headerState.value === 'indeterminate',
        disabled: selection.headerDisabled.value,
        label: selectAllText.value,
      }
    : NO_UTILITY;

const dragEnabled = computed(
  () =>
    rowDragOn &&
    !remote &&
    !loading &&
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

const rowUtility = (item: TableBodyRow): NuiTableUtilityCellProps =>
  item.selected === undefined
    ? NO_UTILITY
    : { control: 'checkbox', checked: item.selected, label: selectText.value };

const gripOf = (item: TableBodyRow): VNode =>
  h(NuiTableRowGrip, {
    label:
      dragLabel?.(rowAt(item.index)) ?? messages.value.dragRow({ row: labelOf(rowAt(item.index)) }),
    disabled: !dragEnabled.value,
    active: rowDrag.dragging.value === item.index,
    onGrab: (event: PointerEvent) => rowDrag.grab(item.index, event),
  });

const menu: TableMenu = useTableMenu({
  enabled: () => columnMenu,
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
  treeMode: () => getChildren !== undefined,
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
  getChildren === undefined ? undefined : (treeColumn ?? dataKeysOf(layout.value)[0]),
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
  node?.kind === 'group' || node?.expandable === true ? node.expanded : undefined;

const skeletonRows = computed((): TableSkeletonRow[] =>
  Array.from({ length: skeletonCount.value }, (_, index) => ({
    index,
    key: `skeleton-${index}`,
  })),
);

const bodyRows = computed((): TableBodyRow[] => {
  const current = revision.value;

  if (loading) {
    return [];
  }
  const pending = expansion.loading.value;
  const top = bodyTop.value - rowWindow.scrollTop.value;

  return rowWindow.items.value.map((item) => {
    const node = engine.value.nodeAt(pageStart.value + item.index);
    const level = levelOf(node);

    return {
      index: item.index,
      top: windowed.value ? top + item.start : undefined,
      key: item.slot,
      revision: current,
      level,
      treeLevel: Math.max(0, (level ?? 1) - 1),
      group: expansion.rowAt(item.index),
      expanded: expandedOf(node),
      loading: node !== undefined && pending.has(node.id),
      selected: selectedOf(node),
      stripe: striped && item.index % 2 === 1,
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

const pinnedUtility = (item: TablePinnedRow<T>): NuiTableUtilityCellProps =>
  item.selected === undefined
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

const activeData = (): TableCellPosition | undefined => {
  const body = bodyActive();
  const col = body === undefined ? -1 : body.col - dataOffset.value;

  return body !== undefined && col >= 0 && col < dataKeys.value.length
    ? { row: body.row, col }
    : undefined;
};

const rangeAnchor = (): TableCellPosition | undefined =>
  viewport.value?.contains(document.activeElement) === true ? activeData() : undefined;

const revealed = createIntent<TableCellPosition>();

const revealCorner = (corner: TableCellPosition): void => {
  const target = { row: corner.row + pinnedCount.value, col: corner.col + dataOffset.value };

  if (windowed.value) {
    focus.reveal(target);
  } else {
    revealed.set(target);
  }
};

const announce = (text: string): void => {
  announcement.value = text;
};

const rangeSelect = useTableRanges({
  enabled: () => cellSelection && !loading,
  ranges,
  viewport: () => viewport.value,
  bounds: () => ({ rows: visibleRows.value, cols: dataKeys.value.length }),
  offset: () => dataOffset.value,
  headRows: () => headRows.value,
  pinnedRows: () => pinnedCount.value,
  footRows: () => footRows.value,
  rowSize: () => rowSize.value,
  pageRows: () => pageRowsOf(rowWindow.viewport.value, rowSize.value),
  isRtl: direction.isRtl,
  anchor: rangeAnchor,
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

const clipboard = useTableClipboard<T>({
  ranges: () => ranges.value,
  cell: copyCell,
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
  getKey === undefined || rowByKey.value === undefined ? row : rowByKey.value.get(getKey(row));

const ruleTexts = useMessages(formRulesMessages, resolvedLocale);
const kitControls = useControls();

const editOn = computed(() => cellSelection && !loading && canEdit.value);

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
  applied: (keys) => {
    totals.reset();

    const ran = currentQuery();

    engine.value.patch(ran, keys);
    totals.take(ran);
    sync();
  },
  parse: (row, key, text) =>
    parseCell(columnAt(key), text, row, resolvedLocale.value, booleanTexts.value),
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
  refuse: (row, key, reason) => {
    emit('editRefused', { row, key, reason });
  },
  bounds: () => ({ rows: visibleRows.value, cols: dataKeys.value.length }),
  locate: (target) => rangeSelect.cellAt(target),
  focus: (position) => {
    focus.focusCell({
      row: position.row + pinnedCount.value,
      col: position.col + dataOffset.value,
    });
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
  target: TableCellPosition,
  current: NuiTableRanges,
): NuiTableContextScope<T> | undefined => {
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
  enabled: () => contextMenu !== false,
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
  editable: () => cellSelection && canEdit.value,
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
  indices: () => engine.value.visibleIndices(),
  rowAt: (index) => engine.value.rowAt(index),
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
    if (cellMenu.onLongPress(event)) {
      rangeSelect.swallowClick();
    }
  },
  { delay: LONG_PRESS },
);

watch(
  ranges,
  () => {
    const target = revealed.take();

    const cell =
      target === undefined
        ? null
        : viewport.value?.querySelector(
            `[aria-rowindex="${target.row + headRows.value + 1}"] > [aria-colindex="${target.col + 1}"]`,
          );

    cell?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  },
  { flush: 'post' },
);

const onRowsClick = (event: MouseEvent): void => {
  const target = event.target;

  if (
    rangeSelect.takeClick() ||
    !(target instanceof Element) ||
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
  if (rowDrag.onKeydown(event, bodyActive())) {
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

const treeToggleOf = (item: TableBodyRow): VNode =>
  h(NuiTableTreeToggle, {
    level: item.treeLevel,
    expandable: item.expanded !== undefined,
    loading: item.loading,
    onToggle: () => expansion.toggle(item.index),
  });

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
    commit: cellEditor.commit,
    cancel: cellEditor.cancel,
    onUpdate: cellEditor.input,
  });
};

const CellContent = (props: TableCellContentProps<T>): VNode | VNode[] => {
  const { item, column } = props;

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
    ...(item !== undefined && column === treeKey.value ? [treeToggleOf(item)] : []),
  ];

  return parts.length === 0 ? content : [...parts, content];
};

const sync = (): void => {
  rowCount.value = engine.value.count();
  revision.value += 1;
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
  sync();
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
    sync();
    clampActive();
    refocusMoved();
  },
);

watch(
  () => columns,
  () => {
    engine.value.dispose();
    engine.value = createEngine();
    engine.value.setRows(rows);
    engine.value.setToggled(expanded.value);
    editing.reset();
    totals.reset();
    runNow();
    sync();
    clampActive();
  },
);

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
});
</script>
