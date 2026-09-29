<template>
  <div class="nui-table" :class="rootClass" :style="rootStyle">
    <p v-if="hasCaption" :id="captionId" class="nui-table__caption">
      <slot name="caption">{{ caption }}</slot>
    </p>
    <div ref="frame" class="nui-table__frame">
      <div
        ref="viewport"
        class="nui-table__viewport"
        @keydown="onKeydown"
        @focusin="focus.onFocusin"
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
              <template #utility>
                <NuiTableUtilityCell v-bind="headUtility" @toggle="selection.toggleAll()" />
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
              :gap="item.gap"
              :active="focus.activeIn(item.index + pinnedCount)"
              :revision="item.revision"
              :level="item.level"
              :group="item.group"
              :expanded="item.expanded"
              :loading="item.loading"
              :selected="item.selected"
              :stripe="item.stripe"
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
            <NuiTableGap :size="tailGap" />
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
      <div v-if="query.busy.value" class="nui-table__busy" role="presentation"></div>
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
import { useElementSize } from '@vueuse/core';
import {
  createIntent,
  useControlId,
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
  type TableNode,
} from '../engine';
import NuiTableDragLayer from './NuiTableDragLayer.vue';
import NuiTableGap from './NuiTableGap.vue';
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
  tableLayout,
} from './table-layout';
import { pageWindowOf, resolvePagination } from './table-pages';
import NuiTableFilter from './NuiTableFilter.vue';
import NuiTableFooterCell from './NuiTableFooterCell.vue';
import NuiTableHeaderMarks from './NuiTableHeaderMarks.vue';
import { useTableFocus } from './use-table-focus';
import { useTableExpansion } from './use-table-expansion';
import { useTableHeader, type TableHeader } from './use-table-header';
import { useTableMenu, type TableMenu } from './use-table-menu';
import { useTableColumnOrder } from './use-table-column-order';
import { useTableQuery } from './use-table-query';
import { useTableResize } from './use-table-resize';
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
  NuiTableWidths,
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
const TEXT_SKELETON: NuiSkeletonProps = { shape: 'text', width: '60%' };
const CLICK_GUARD = '.nui-table__cell--select, .nui-table__toggle, .nui-table__group';

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

const quickKeys = computed(() =>
  hidden.value.length === 0
    ? undefined
    : tree.value.leaves
        .filter((column) => !hidden.value.includes(column.key))
        .map((column) => column.key),
);

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

const query = useTableQuery({
  engine,
  query: () => {
    const list = queryFilters();
    const sorting = sort.value;
    const grouping = getChildren === undefined ? groupBy.value : [];

    return remote
      ? {}
      : { sort: sorting, filters: list, groupBy: grouping, totals: totals.wanted(list) };
  },
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
});

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

const tailGap = computed(() => {
  if (!windowed.value || loading) {
    return 0;
  }
  const last = rowWindow.items.value.at(-1);

  return Math.max(0, canvasSize.value - (last === undefined ? 0 : last.offset + last.size));
});

const rootClass = computed(() => [
  `nui-table--size-${size}`,
  {
    'nui-table--busy': query.busy.value,
    'nui-table--totals': totals.enabled.value,
    'nui-table--auto': !windowed.value,
    'nui-table--striped': striped,
    'nui-table--loading': loading,
    'nui-table--resizing': resize.active.value !== undefined,
    'nui-table--dragging': order.dragging.value !== undefined,
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
    'aria-multiselectable': selection.multiple.value || undefined,
  };
});

const headUtility = computed<NuiTableUtilityCellProps>(() =>
  selection.multiple.value
    ? {
        control: 'checkbox',
        checked: selection.headerState.value === 'checked',
        indeterminate: selection.headerState.value === 'indeterminate',
        disabled: selection.headerDisabled.value,
        label: selectAllText.value,
      }
    : NO_UTILITY,
);

const rowUtility = (item: TableBodyRow): NuiTableUtilityCellProps =>
  item.selected === undefined
    ? NO_UTILITY
    : { control: 'checkbox', checked: item.selected, label: selectText.value };

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
  let cursor = 0;

  return rowWindow.items.value.map((item) => {
    const node = engine.value.nodeAt(pageStart.value + item.index);
    const level = levelOf(node);
    const gap = windowed.value ? Math.max(0, item.offset - cursor) : 0;

    cursor = item.offset + item.size;

    return {
      index: item.index,
      gap,
      key: node?.id ?? item.index,
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

const onRowsClick = (event: MouseEvent): void => {
  const target = event.target;

  if (!(target instanceof Element) || target.closest(CLICK_GUARD) !== null) {
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

const CellContent = (props: TableCellContentProps<T>): VNode | VNode[] => {
  const { item, column } = props;

  if (item?.group !== undefined) {
    return h(NuiTableGroupCell, {
      cell: item.group.cells[column],
      onToggle: () => expansion.toggle(item.index),
    });
  }
  const row = props.row ?? rowAt(props.position);

  const content = renderSlot(
    rawSlots,
    `cell-${column}`,
    { ...scopeOf(row, props.position, column, props.pinned === true) },
    () => [h('span', { class: 'nui-table__text' }, textOf(row, column))],
  );

  return item !== undefined && column === treeKey.value ? [treeToggleOf(item), content] : content;
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
    runNow();
    sync();
    clampActive();
  },
);

watch(
  () => columns,
  () => {
    engine.value.dispose();
    engine.value = createEngine();
    engine.value.setRows(rows);
    engine.value.setToggled(expanded.value);
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
});
</script>
