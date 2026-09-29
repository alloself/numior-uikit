<template>
  <div class="nui-grid" :class="rootClass" :style="rootStyle">
    <p v-if="hasCaption" :id="captionId" class="nui-grid__caption">
      <slot name="caption">{{ caption }}</slot>
    </p>
    <div class="nui-grid__frame">
      <div
        :id="gridId"
        ref="viewport"
        class="nui-grid__viewport"
        :role="hierarchical ? 'treegrid' : 'grid'"
        v-bind="viewportAria"
        @keydown="onKeydown"
        @focusin="focus.onFocusin"
      >
        <div class="nui-grid__header" role="rowgroup" @click="header.onClick">
          <NuiDataGridRow
            v-for="(band, level) in bands.rows"
            :key="level"
            :panes="band"
            :row-index="level + 1"
            part="band"
          >
            <template #default="{ column }">
              <span class="nui-grid__text">{{ bands.labels.get(column) }}</span>
            </template>
          </NuiDataGridRow>
          <NuiDataGridRow
            :panes="panes"
            :row-index="headRows"
            part="head"
            :active="focus.activeIn(-1)"
            :heads="header.heads.value"
          >
            <template #utility>
              <NuiDataGridUtilityCell v-bind="headUtility" @toggle="selection.toggleAll()" />
            </template>
            <template #default="{ column }">
              <slot :name="`header-${column}`" v-bind="header.scope(column)">
                <span class="nui-grid__text">{{ columnAt(column).label }}</span>
              </slot>
              <NuiDataGridHeaderMarks
                :state="header.heads.value[column]"
                :hint="header.sortHint(column)"
                :filter-label="messages.filterColumn({ column: columnAt(column).label })"
                :expanded="header.expanded(column)"
                :menu-label="menu.labelOf(column)"
                :menu-expanded="menu.expanded(column)"
                @filter="header.openFilter(column, $event)"
                @menu="header.openMenu(column, $event)"
              />
            </template>
          </NuiDataGridRow>
        </div>
        <div class="nui-grid__body" role="rowgroup" :style="bodyStyle" @click="onBodyClick">
          <NuiDataGridRow
            v-for="item in skeletonRows"
            :key="item.key"
            :panes="panes"
            :row-index="item.index + headRows + 1"
            part="skeleton"
            :offset="item.offset"
          >
            <template #utility>
              <NuiDataGridUtilityCell v-bind="SKELETON_UTILITY" />
            </template>
            <template #default>
              <NuiSkeleton v-bind="TEXT_SKELETON" />
            </template>
          </NuiDataGridRow>
          <NuiDataGridRow
            v-for="item in bodyRows"
            :key="item.key"
            :panes="panes"
            :row-index="item.index + headRows + 1"
            :offset="item.offset"
            :active="focus.activeIn(item.index)"
            :revision="item.revision"
            :level="item.level"
            :group="item.group"
            :tree-key="treeKey"
            :expanded="item.expanded"
            :loading="item.loading"
            :selected="item.selected"
            :stripe="item.stripe"
            @toggle="expansion.toggle(item.index)"
          >
            <template #utility>
              <NuiDataGridUtilityCell
                v-bind="rowUtility(item)"
                @toggle="selection.toggle(rowAt(item.index))"
              />
            </template>
            <template #tree>
              <NuiDataGridTreeToggle
                :level="item.treeLevel"
                :expandable="item.expanded !== undefined"
                :loading="item.loading"
                @toggle="expansion.toggle(item.index)"
              />
            </template>
            <template #default="{ column }">
              <slot
                v-if="hasCellSlot(column)"
                :name="`cell-${column}`"
                v-bind="cellScope(item.index, column)"
              />
              <span v-else class="nui-grid__text">{{ cellText(item.index, column) }}</span>
            </template>
          </NuiDataGridRow>
        </div>
        <div v-if="status" class="nui-grid__empty" role="row" :aria-rowindex="headRows + 1">
          <div class="nui-grid__empty-cell" role="gridcell" :aria-colspan="layout.visual.length">
            <slot :name="status">
              <NuiEmpty :title="emptyText" size="sm" />
            </slot>
          </div>
        </div>
        <div v-if="footRows" class="nui-grid__footer" role="rowgroup">
          <NuiDataGridRow
            :panes="panes"
            :row-index="visibleRows + headRows + 1"
            part="foot"
            :active="focus.activeIn(visibleRows)"
            :revision="revision"
          >
            <template #default="{ column }">
              <slot :name="`footer-${column}`" v-bind="totals.scope(column)">
                <NuiDataGridFooterCell
                  :text="totals.scope(column).text"
                  :count-text="totals.countText(totals.scope(column).count)"
                />
              </slot>
            </template>
          </NuiDataGridRow>
        </div>
      </div>
      <div v-if="query.busy.value" class="nui-grid__busy" role="presentation"></div>
    </div>
    <div v-if="paginationProps" class="nui-grid__pagination">
      <NuiPagination
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="totalCount"
        :size="size"
        v-bind="paginationProps"
      />
    </div>
    <NuiDataGridFilter
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
    <div class="nui-grid__hidden" role="status" aria-live="polite">{{ announcement }}</div>
  </div>
</template>

<script setup lang="ts" generic="T">
import { computed, ref, shallowRef, useTemplateRef, watch } from 'vue';
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
  createGridEngine,
  type GridDistinct,
  type GridEngine,
  type GridFilter,
  type GridFilterValue,
  type GridNode,
} from '../engine';
import NuiDataGridRow from './NuiDataGridRow.vue';
import NuiDataGridTreeToggle from './NuiDataGridTreeToggle.vue';
import NuiDataGridUtilityCell from './NuiDataGridUtilityCell.vue';
import { dataGridMessages } from './data-grid.messages';
import { cellTextOf, cellValueOf, engineColumnOf, valueTextOf } from './grid-format';
import { columnTreeOf, headerBandsOf } from './grid-columns';
import { centreIndexOf, dataKeyAt, dataKeysOf, gridLayout, panesOf, pinsFit } from './grid-layout';
import { pageWindowOf, resolvePagination } from './grid-pages';
import NuiDataGridFilter from './NuiDataGridFilter.vue';
import NuiDataGridFooterCell from './NuiDataGridFooterCell.vue';
import NuiDataGridHeaderMarks from './NuiDataGridHeaderMarks.vue';
import { useGridFocus } from './use-grid-focus';
import { useGridExpansion } from './use-grid-expansion';
import { useGridHeader, type GridHeader } from './use-grid-header';
import { useGridMenu, type GridMenu } from './use-grid-menu';
import { useGridQuery } from './use-grid-query';
import { useGridTotals } from './use-grid-totals';
import { useTableSelection, type GridSelectionKey } from './use-table-selection';
import type {
  GridBodyRow,
  GridCellPosition,
  GridSkeletonRow,
  GridStatusSlot,
  NuiDataGridCellSlot,
  NuiDataGridEvents,
  NuiDataGridExpanded,
  NuiDataGridExposed,
  NuiDataGridGroupBy,
  NuiDataGridHidden,
  NuiDataGridPins,
  NuiDataGridProps,
  NuiDataGridSlots,
  NuiDataGridFilters,
  NuiDataGridSort,
  NuiDataGridUtilityCellProps,
  NuiGridColumn,
} from './data-grid.types';

const ROW_SIZES = { sm: 32, md: 40, lg: 48 } as const;
const CANVAS_LIMIT = 15_000_000;
const INITIAL_ROWS = 30;
const INITIAL_COLUMNS = 12;
const ROW_OVERSCAN = 6;
const DISTINCT_LIMIT = 100;
const COLUMN_OVERSCAN = 2;
const NO_UTILITY: NuiDataGridUtilityCellProps = { control: 'none' };
const SKELETON_UTILITY: NuiDataGridUtilityCellProps = { control: 'skeleton' };
const TEXT_SKELETON: NuiSkeletonProps = { shape: 'text', width: '60%' };
const CLICK_GUARD = '.nui-grid__cell--select, .nui-grid__toggle, .nui-grid__group';

const {
  columns,
  source,
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
} = defineProps<NuiDataGridProps<T>>();

const sort = defineModel<NuiDataGridSort>('sort', { default: () => [] });
const filters = defineModel<NuiDataGridFilters>('filters', { default: () => [] });
const quick = defineModel<string>('quick', { default: '' });
const groupBy = defineModel<NuiDataGridGroupBy>('groupBy', { default: () => [] });
const expanded = defineModel<NuiDataGridExpanded>('expanded', { default: () => [] });
const pins = defineModel<NuiDataGridPins>('pins', { default: () => ({}) });
const hidden = defineModel<NuiDataGridHidden>('hidden', { default: () => [] });
const selected = defineModel<readonly T[]>('selected', { default: () => [] });
const page = defineModel<number>('page', { default: 1 });
const pageSize = defineModel<number>('pageSize', { default: 20 });
const emit = defineEmits<NuiDataGridEvents<T>>();
const slots = defineSlots<NuiDataGridSlots<T>>();

const viewport = useTemplateRef<HTMLElement>('viewport');
const tree = computed(() => columnTreeOf(columns));
const gridId = useControlId(() => id);
const resolvedLocale = useLocale(() => locale);
const messages = useMessages(dataGridMessages, resolvedLocale);
const direction = useDirection(viewport);

const createEngine = (): GridEngine<T> =>
  createGridEngine({
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
const visibleRows = computed(() => (loading ? 0 : pageWindow.value.end - pageWindow.value.start));
const totalCount = computed(() => (remote ? (total ?? source.length) : rowCount.value));

const keyOf = (row: T): GridSelectionKey<T> => (getKey === undefined ? row : getKey(row));

const quickKeys = computed(() =>
  hidden.value.length === 0
    ? undefined
    : tree.value.leaves
        .filter((column) => !hidden.value.includes(column.key))
        .map((column) => column.key),
);

const queryFilters = (): readonly GridFilter[] => {
  const text = quick.value.trim();

  return text === ''
    ? filters.value
    : [...filters.value, { kind: 'quick', value: text, keys: quickKeys.value }];
};

const totals = useGridTotals({
  engine,
  columns: () => tree.value.leaves,
  keys: () => dataKeysOf(layout.value),
  columnAt: (key) => columnAt(key),
  locale: () => resolvedLocale.value,
  messages,
  label: () => totalsLabel,
  rowCount: () => engine.value.rowCount(),
});

const query = useGridQuery({
  engine,
  query: () => {
    const list = queryFilters();
    const sorting = sort.value;
    const grouping = getChildren === undefined ? groupBy.value : [];

    return remote
      ? {}
      : { sort: sorting, filters: list, groupBy: grouping, totals: totals.wanted(list) };
  },
  onSettled: (rows, ran) => {
    totals.take(ran);
    sync();
    clampActive();

    if (rowsIntent.take() === 'rows') {
      announcement.value = messages.value.rowsShown({ count: rows });
    }
    emit('settle', { rows });
  },
  onProgress: (progress) => {
    emit('progress', progress);
  },
});

const runNow = (): void => {
  totals.take(query.runNow());
};

engine.value.setRows(source);
engine.value.setToggled(expanded.value);
runNow();
rowCount.value = engine.value.count();

const active = ref<GridCellPosition>({ row: rowCount.value > 0 ? 0 : -1, col: 0 });

const room = shallowRef(0);

const layoutOptions = computed(() => ({
  pins: pins.value,
  hidden: hidden.value,
  select: selectOn.value,
}));

const pinnedLayout = computed(() =>
  gridLayout(tree.value.leaves, { ...layoutOptions.value, sticky: true }),
);

const sticky = computed(() => pinsFit(pinnedLayout.value, room.value));

const layout = computed(() =>
  sticky.value
    ? pinnedLayout.value
    : gridLayout(tree.value.leaves, { ...layoutOptions.value, sticky: false }),
);

const bands = computed(() => headerBandsOf(layout.value, tree.value));
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

const activeRow = (): number | undefined =>
  active.value.row >= 0 && active.value.row < rowCount.value ? active.value.row : undefined;

const activeCentre = (): number | undefined => centreIndexOf(layout.value, active.value.col);

const rows = useVirtualList(viewport, {
  enabled: windowed,
  count: () => visibleRows.value,
  itemSize: rowSize,
  overscan: ROW_OVERSCAN,
  initialCount: INITIAL_ROWS,
  pinned: activeRow,
  maxSize: CANVAS_LIMIT,
  inset: () => rowSize.value * (headRows.value + footRows.value),
});

const columnWindow = useVirtualList(viewport, {
  enabled: windowed,
  axis: 'x',
  count: () => layout.value.centre.length,
  itemSize: () => {
    const widths = centreWidths.value;
    return (index: number) => widths[index] ?? 0;
  },
  overscan: COLUMN_OVERSCAN,
  initialCount: INITIAL_COLUMNS,
  pinned: activeCentre,
  inset: () => layout.value.startWidth + layout.value.endWidth,
});

watch(
  columnWindow.viewport,
  (width) => {
    room.value = width;
  },
  { immediate: true, flush: 'sync' },
);

const panes = computed(() =>
  panesOf(
    layout.value,
    columnWindow.items.value.map((item) => item.index),
  ),
);

const rootStyle = computed(() => ({
  '--_row': `${rowSize.value}px`,
  '--_head-rows': String(headRows.value),
  '--_height': height,
  '--_start': `${layout.value.startWidth}px`,
  '--_centre': `${layout.value.centreWidth}px`,
  '--_end': `${layout.value.endWidth}px`,
}));

const skeletonCount = computed(() => (loading && slots.loading === undefined ? loadingRows : 0));

const canvasSize = computed(() =>
  loading ? skeletonCount.value * rowSize.value : rows.canvasSize.value,
);

const bodyStyle = computed(() =>
  windowed.value ? { blockSize: `${canvasSize.value}px` } : undefined,
);

const rootClass = computed(() => [
  `nui-grid--size-${size}`,
  {
    'nui-grid--busy': query.busy.value,
    'nui-grid--totals': totals.enabled.value,
    'nui-grid--auto': !windowed.value,
    'nui-grid--striped': striped,
    'nui-grid--loading': loading,
  },
]);

const status = computed<GridStatusSlot | undefined>(() => {
  if (loading) {
    return slots.loading === undefined ? undefined : 'loading';
  }
  return rowCount.value === 0 ? 'empty' : undefined;
});

const focus = useGridFocus({
  viewport,
  active,
  rows,
  columns: columnWindow,
  rowCount: () => visibleRows.value + footRows.value,
  bodyRows: () => visibleRows.value,
  headRows: () => headRows.value,
  colCount: () => layout.value.visual.length,
  rowSize: () => rowSize.value,
  centreIndexOf: (visual) => centreIndexOf(layout.value, visual),
  columnIndexOf: (key) => layout.value.visual.findIndex((column) => column.key === key),
  isRtl: direction.isRtl,
  windowed: () => windowed.value,
});

const columnAt = (key: string): NuiGridColumn<T> => {
  const column = columnByKey.value.get(key);

  if (column === undefined) {
    throw new Error(`NuiDataGrid has no column "${key}"`);
  }
  return column;
};

const rowAt = (position: number): T => {
  const node = engine.value.nodeAt(pageStart.value + position);

  if (node?.kind !== 'row') {
    throw new Error(`NuiDataGrid has no row at position ${position}`);
  }
  return node.row;
};

const header: GridHeader<T> = useGridHeader({
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

const viewportAria = computed(() => {
  const captioned = hasCaption.value && label === undefined;

  return {
    'aria-label': captioned ? undefined : labelText.value,
    'aria-labelledby': captioned ? captionId.value : undefined,
    'aria-rowcount': visibleRows.value + headRows.value + footRows.value,
    'aria-colcount': layout.value.visual.length,
    'aria-busy': loading || query.busy.value || undefined,
    'aria-multiselectable': selection.multiple.value || undefined,
  };
});

const headUtility = computed<NuiDataGridUtilityCellProps>(() =>
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

const rowUtility = (item: GridBodyRow): NuiDataGridUtilityCellProps =>
  item.selected === undefined
    ? NO_UTILITY
    : { control: 'checkbox', checked: item.selected, label: selectText.value };

const menu: GridMenu = useGridMenu({
  enabled: () => columnMenu,
  leaves: () => tree.value.leaves,
  layout: () => layout.value,
  columnAt,
  heads: () => header.heads.value,
  sort,
  groupBy,
  pins,
  hidden,
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

const expansion = useGridExpansion({
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

const levelOf = (node: GridNode<T> | undefined): number | undefined =>
  hierarchical.value && node !== undefined ? node.level + 1 : undefined;

const selectedOf = (node: GridNode<T> | undefined): boolean | undefined =>
  selectOn.value && node?.kind === 'row' ? selection.has(node.row) : undefined;

const expandedOf = (node: GridNode<T> | undefined): boolean | undefined =>
  node?.kind === 'group' || node?.expandable === true ? node.expanded : undefined;

const skeletonRows = computed((): GridSkeletonRow[] =>
  Array.from({ length: skeletonCount.value }, (_, index) => ({
    index,
    offset: windowed.value ? index * rowSize.value : undefined,
    key: `skeleton-${index}`,
  })),
);

const bodyRows = computed((): GridBodyRow[] => {
  const current = revision.value;

  if (loading) {
    return [];
  }
  const pending = expansion.loading.value;

  return rows.items.value.map((item) => {
    const node = engine.value.nodeAt(pageStart.value + item.index);
    const level = levelOf(node);

    return {
      index: item.index,
      offset: windowed.value ? item.offset : undefined,
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

const bodyPosition = (row: number): number | undefined =>
  row >= 0 && row < visibleRows.value ? pageStart.value + row : undefined;

const onBodyClick = (event: MouseEvent): void => {
  const target = event.target;

  if (!(target instanceof Element) || target.closest(CLICK_GUARD) !== null) {
    return;
  }
  const row = target.closest('[role="row"]');
  const position = Number(row?.getAttribute('aria-rowindex')) - headRows.value - 1;

  const node = Number.isInteger(position)
    ? engine.value.nodeAt(pageStart.value + position)
    : undefined;

  if (node?.kind === 'row') {
    emit('rowClick', node.row, event);
  }
};

const onKeydown = (event: KeyboardEvent): void => {
  if (selection.onKeydown(event, active.value, bodyPosition(active.value.row))) {
    return;
  }
  if (!header.onKeydown(event) && !expansion.onKeydown(event, active.value)) {
    focus.onKeydown(event);
  }
};

const loadValues = (): Promise<GridDistinct | null> => {
  const current = header.target.value;

  return current === null
    ? Promise.resolve(null)
    : engine.value.distinct(current.key, { limit: DISTINCT_LIMIT });
};

const valueLabel = (value: GridFilterValue): string => {
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

const hasCellSlot = (key: string): boolean => slots[`cell-${key}`] !== undefined;

const cellText = (position: number, key: string): string =>
  cellTextOf(columnAt(key), rowAt(position), resolvedLocale.value, booleanTexts.value);

const cellScope = (position: number, key: string): NuiDataGridCellSlot<T> => {
  const column = columnAt(key);
  const row = rowAt(position);

  return {
    row,
    column,
    position,
    value: cellValueOf(column, row),
    text: cellTextOf(column, row, resolvedLocale.value, booleanTexts.value),
  };
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
    rows.scrollTo(0, { align: 'start' });
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
  () => source,
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
    engine.value.setRows(source);
    engine.value.setToggled(expanded.value);
    totals.reset();
    runNow();
    sync();
    clampActive();
  },
);

defineExpose<NuiDataGridExposed>({
  scrollToRow: (position) => {
    rows.scrollTo(position, { align: 'start' });
  },
  scrollToColumn: (key) => {
    const index = layout.value.centre.findIndex((column) => column.key === key);

    if (index >= 0) {
      columnWindow.scrollTo(index, { align: 'start' });
    }
  },
});
</script>
