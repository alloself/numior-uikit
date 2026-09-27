<template>
  <div ref="root" class="nui-table" :class="rootClasses" :style="rootStyle">
    <div class="nui-table__frame">
      <div
        ref="scroller"
        class="nui-table__scroller"
        :style="{ '--_height': height }"
        :tabindex="scrollerTabindex"
        @scroll="trackScroll"
      >
        <table
          ref="table"
          class="nui-table__table"
          :style="tableStyle"
          :aria-busy="loading || undefined"
          :aria-rowcount="rowCount"
        >
          <caption v-if="caption || $slots.caption" class="nui-table__caption">
            <slot name="caption">{{ caption }}</slot>
          </caption>
          <colgroup>
            <col v-for="name in utilityCols" :key="name" class="nui-table__col--utility" />
            <col
              v-for="column in layout.ordered.value"
              :key="column.key"
              :style="layout.colStyle(column)"
            />
          </colgroup>
          <NuiTableHead
            :columns="layout.ordered.value"
            :sort="sort"
            :row-drag="rowDrag"
            :selectable="selectable"
            :selection-state="selectionState"
            :selection-disabled="loading || visibleRows.length === 0"
            :select-all-label="texts.selectAll"
            :layout="layout"
            :actions="headActions"
            :resizing="resize.active.value"
            :dragging="columnDrag.source.value"
            :resize-label="resizeText"
            :reorder-label="reorderText"
            @sort="cycle"
            @toggle-all="toggleAll"
          />
          <NuiTableBody
            v-if="tableRows.pinned.value.length > 0"
            :columns="layout.ordered.value"
            :rows="tableRows.pinned.value"
            :layout="layout"
            :options="rowOptions"
            :selectable="selectable"
            :selected-keys="selectedKeys"
            :loading="false"
            :loading-rows="0"
            :empty-label="texts.empty"
            :first-index="0"
            :spacers="undefined"
            :dragging="undefined"
            pinned
            @toggle="toggleOne"
            @row-click="(row, event) => emit('rowClick', row, event)"
          />
          <NuiTableBody
            :columns="layout.ordered.value"
            :rows="renderedRows"
            :layout="layout"
            :options="rowOptions"
            :selectable="selectable"
            :selected-keys="selectedKeys"
            :loading="loading"
            :loading-rows="loadingRows"
            :empty-label="texts.empty"
            :first-index="firstIndex"
            :spacers="spacers"
            :dragging="rowDragging"
            :pinned="false"
            @toggle="toggleOne"
            @row-click="(row, event) => emit('rowClick', row, event)"
            @expand="tableRows.toggle"
            @drag-start="rowReorder.dragStart"
            @drag-keydown="rowReorder.dragKeydown"
          />
        </table>
        <NuiTableDragLayer :layer="dragLayer" />
      </div>
    </div>
    <div v-if="paginationProps" class="nui-table__footer">
      <NuiPagination
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="totalCount"
        :size="size"
        v-bind="paginationProps"
      />
    </div>
    <div class="nui-table__live" aria-live="polite">{{ announcement }}</div>
  </div>
</template>

<script setup lang="ts" generic="T">
import { computed, onMounted, ref, useSlots, useTemplateRef, watch } from 'vue';
import { useResizeObserver } from '@vueuse/core';
import { useDirection, useMessages, useVirtualList } from '@numior/primitives';
import NuiPagination from '../pagination/NuiPagination.vue';
import { defaultOptionKey } from '../shared/options';
import NuiTableBody from './NuiTableBody.vue';
import NuiTableHead from './NuiTableHead.vue';
import { cellText, cellValue } from './cells';
import { visibleStart } from './ghost';
import { pageSlice, resolvePagination } from './page';
import type { NuiTableRowView } from './rows';
import { selectionStateOf, toggleRow, toggleRows } from './selection';
import { nextSort, sortRows } from './sort';
import NuiTableDragLayer from './NuiTableDragLayer.vue';
import { provideTableSlots } from './table-slots';
import { tableMessages } from './table.messages';
import type {
  NuiTableAnnouncement,
  NuiTableColumn,
  NuiTableDragView,
  NuiTableDropView,
  NuiTableGhostView,
  NuiTableHeadActions,
  NuiTableProps,
  NuiTableReorderEvent,
  NuiTableRowOptions,
  NuiTableSlots,
  NuiTableSort,
} from './table.types';
import { useColumnReorder } from './use-column-reorder';
import { useColumnResize } from './use-column-resize';
import { useRowReorder } from './use-row-reorder';
import { useTableColumns } from './use-table-columns';
import { useTableRows } from './use-table-rows';

const {
  columns,
  rows,
  getKey,
  getChildren,
  isExpandable,
  pinnedRows = [],
  rowDrag = false,
  indent = 20,
  selectable,
  pagination = undefined,
  remote = false,
  total,
  loading = false,
  loadingRows = 5,
  emptyLabel,
  caption,
  stickyHeader = false,
  striped = false,
  hoverable = false,
  size = 'md',
  virtual = false,
  height,
  rowHeight = 40,
  selectLabel,
  selectAllLabel,
  resizeLabel,
  reorderLabel,
  expandLabel,
  dragLabel,
  rowLabel,
  announce,
} = defineProps<NuiTableProps<T>>();

const sort = defineModel<NuiTableSort>('sort', { default: null });
const selected = defineModel<T[]>('selected', { default: () => [] });
const expanded = defineModel<T[]>('expanded', { default: () => [] });
const page = defineModel<number>('page', { default: 1 });
const pageSize = defineModel<number>('pageSize', { default: 20 });
const columnOrder = defineModel<string[]>('columnOrder', { default: () => [] });
const widths = defineModel<Record<string, number>>('widths', { default: () => ({}) });

const emit = defineEmits<{
  rowClick: [row: T, event: MouseEvent];
  reorder: [event: NuiTableReorderEvent<T>];
  load: [row: T];
}>();

defineSlots<NuiTableSlots<T>>();

provideTableSlots(useSlots());
const messages = useMessages(tableMessages);
const scroller = useTemplateRef<HTMLElement>('scroller');
const tableElement = useTemplateRef<HTMLTableElement>('table');
const rootElement = useTemplateRef<HTMLElement>('root');

const keyOf = (row: T): string => (getKey ?? defaultOptionKey)(row);
const selectedKeys = computed(() => new Set(selected.value.map(keyOf)));
const paginationProps = computed(() => resolvePagination(pagination));

const texts = computed(() => ({
  empty: emptyLabel ?? messages.value.empty,
  select: selectLabel ?? messages.value.select,
  selectAll: selectAllLabel ?? messages.value.selectAll,
}));

const resizeText = (column: NuiTableColumn<T>): string =>
  resizeLabel ? resizeLabel(column) : messages.value.resize({ label: column.label });

const reorderText = (column: NuiTableColumn<T>): string =>
  reorderLabel ? reorderLabel(column) : messages.value.reorder({ label: column.label });

const expandText = (row: T): string => (expandLabel ? expandLabel(row) : messages.value.expand);
const dragText = (row: T): string => (dragLabel ? dragLabel(row) : messages.value.drag);

const sortedLevels = computed(() => {
  void sort.value;
  void columns;
  return new WeakMap<readonly T[], readonly T[]>();
});

const sortLevel = (level: readonly T[]): readonly T[] => {
  if (remote) {
    return level;
  }

  const cache = sortedLevels.value;
  const known = cache.get(level);

  if (known) {
    return known;
  }

  const sorted = sortRows(level, sort.value, columns);

  cache.set(level, sorted);
  return sorted;
};

const tableRows = useTableRows<T>({
  rows: () => rows,
  pinnedRows: () => pinnedRows,
  keyOf,
  getChildren: () => getChildren,
  isExpandable: () => isExpandable,
  expanded,
  sortLevel,
  onLoad: (row) => emit('load', row),
});

const visibleRows = computed(() =>
  paginationProps.value && !remote
    ? pageSlice(tableRows.views.value, page.value, pageSize.value)
    : tableRows.views.value,
);

const visibleData = computed(() => visibleRows.value.map((view) => view.row));
const totalCount = computed(() => (remote ? (total ?? rows.length) : tableRows.views.value.length));
const isVirtual = computed(() => virtual && paginationProps.value === undefined);

const windowing = useVirtualList(scroller, {
  count: () => visibleRows.value.length,
  itemSize: () => rowHeight,
  enabled: isVirtual,
});

const renderedRows = computed(() =>
  isVirtual.value
    ? visibleRows.value.slice(windowing.range.value.start, windowing.range.value.end)
    : visibleRows.value,
);

const firstIndex = computed(() => (isVirtual.value ? windowing.range.value.start : 0));

const spacers = computed(() =>
  isVirtual.value ? { start: windowing.startSize.value, end: windowing.endSize.value } : undefined,
);

const selectionState = computed(() =>
  selectionStateOf(
    selectedKeys.value,
    visibleRows.value.map((view) => view.key),
  ),
);

const utilities = (): number => (selectable ? 1 : 0) + (rowDrag ? 1 : 0);
const { isRtl } = useDirection(scroller);

const layout = useTableColumns<T>({
  columns: () => columns,
  order: columnOrder,
  widths,
  utilities,
});

const resize = useColumnResize<T>({
  widthOf: layout.widthOf,
  setWidth: layout.setWidth,
  resetWidth: layout.resetWidth,
  rtl: isRtl,
});

const announcement = ref('');

const say = (message: NuiTableAnnouncement): void => {
  announcement.value = announce ? announce(message) : messages.value.announce(message);
};

const columnDrag = useColumnReorder<T>({
  scroller: () => scroller.value,
  columns: () => layout.ordered.value,
  utilities,
  rtl: isRtl,
  canMove: layout.canMoveColumn,
  move: layout.moveColumn,
  announce: say,
});

const headActions: NuiTableHeadActions<T> = {
  resizeStart: resize.start,
  resizeKeydown: resize.onKeydown,
  resizeReset: (column) => layout.resetWidth(column.key),
  dragStart: columnDrag.dragStart,
  dragKeydown: columnDrag.dragKeydown,
};

const firstColumnText = (view: NuiTableRowView<T>): string => {
  const column = layout.ordered.value[0];
  return column ? cellText(cellValue(view.row, column)) : view.key;
};

const revealRow = (index: number): void => {
  if (isVirtual.value) {
    windowing.scrollTo(index);
    return;
  }

  const row = scroller.value?.querySelectorAll(
    'tbody.nui-table__body:not(.nui-table__body--pinned) > .nui-table__row',
  )[index];

  row?.scrollIntoView?.({ block: 'nearest' });
};

const rowReorder = useRowReorder<T>({
  scroller: () => scroller.value,
  views: () => visibleRows.value,
  firstIndex: () => firstIndex.value,
  rowHeight: () => (isVirtual.value ? rowHeight : undefined),
  enabled: () => rowDrag && sort.value === null,
  labelOf: (view) => (rowLabel ? rowLabel(view.row) : firstColumnText(view)),
  reveal: revealRow,
  onReorder: (event) => emit('reorder', event),
  announce: say,
});

const rowOptions = computed<NuiTableRowOptions<T>>(() => ({
  tree: tableRows.tree.value,
  rowDrag,
  dragDisabled: sort.value !== null,
  selectLabel: texts.value.select,
  expandLabel: expandText,
  dragLabel: dragText,
}));

const rowDragging = computed(() => rowReorder.source.value);

const dragging = computed(
  () => columnDrag.state.value.phase === 'dragging' || rowReorder.state.value.phase === 'dragging',
);

const rootStyle = computed(() => ({ '--_indent': `${indent}px` }));

const headBand = (): { top: number; height: number } => {
  const table = tableElement.value;
  const head = table?.querySelector('thead')?.getBoundingClientRect();

  if (!table || !head) {
    return { top: 0, height: 0 };
  }

  return { top: Math.max(0, head.top - table.getBoundingClientRect().top), height: head.height };
};

const scrolledStart = ref(false);
const scrolledEnd = ref(false);

const rootClasses = computed(() => [
  `nui-table--size-${size}`,
  {
    'nui-table--striped': striped,
    'nui-table--hoverable': hoverable,
    'nui-table--sticky-header': stickyHeader,
    'nui-table--virtual': isVirtual.value,
    'nui-table--selectable': selectable !== undefined,
    'nui-table--loading': loading,
    'nui-table--dragging': dragging.value,
    'nui-table--scrolled-start': scrolledStart.value,
    'nui-table--scrolled-end': scrolledEnd.value,
  },
]);

const scrollerTabindex = computed(() => (height === undefined ? undefined : 0));
const tableStyle = computed(() => (isVirtual.value ? { '--_row': `${rowHeight}px` } : undefined));
const rowCount = computed(() => (isVirtual.value ? visibleRows.value.length + 1 : undefined));

const utilityCols = computed(() => [
  ...(rowDrag ? ['drag'] : []),
  ...(selectable ? ['select'] : []),
]);

const ghost = computed((): NuiTableGhostView | undefined => {
  const column = columnDrag.ghost.value;
  if (column) {
    const band = headBand();

    return {
      axis: 'column',
      label: column.label,
      style: {
        left: `${column.offset}px`,
        width: `${column.size}px`,
        top: `${band.top}px`,
        height: `${band.height}px`,
      },
    };
  }
  const row = rowReorder.ghost.value;
  const element = scroller.value;
  if (!row || !element) {
    return undefined;
  }
  return {
    axis: 'row',
    label: row.label,
    style: {
      top: `${row.offset}px`,
      height: `${row.size}px`,
      left: `${visibleStart(element, isRtl())}px`,
      width: `${element.clientWidth}px`,
    },
  };
});

const dropIndicators = computed((): readonly NuiTableDropView[] => [
  ...(columnDrag.indicator.value === undefined
    ? []
    : [{ axis: 'column', style: { left: `${columnDrag.indicator.value}px` } } as const]),
  ...(rowReorder.indicator.value === undefined
    ? []
    : [{ axis: 'row', style: { top: `${rowReorder.indicator.value}px` } } as const]),
]);

const dragLayer: NuiTableDragView = { ghost, drops: dropIndicators };

const trackScroll = (): void => {
  const element = scroller.value;
  if (!element) {
    return;
  }
  const offset = Math.abs(element.scrollLeft);
  const max = element.scrollWidth - element.clientWidth;
  scrolledStart.value = offset > 0;
  scrolledEnd.value = offset < max - 1;
};

const cycle = (key: string): void => {
  sort.value = nextSort(sort.value, key);
};

const toggleOne = (row: T): void => {
  selected.value = toggleRow(selected.value, row, keyOf, selectable === 'multiple');
};

const toggleAll = (): void => {
  selected.value = toggleRows(selected.value, visibleData.value, keyOf);
};

onMounted(() => {
  const measure = (): void => {
    layout.measure(tableElement.value);
    const band = headBand();
    const sticky = layout.stickyExtents();

    rootElement.value?.style.setProperty('--_head-size', `${band.height}px`);
    rootElement.value?.style.setProperty('--_caption-size', `${band.top}px`);
    rootElement.value?.style.setProperty('--_sticky-start-size', sticky.start);
    rootElement.value?.style.setProperty('--_sticky-end-size', sticky.end);
  };

  watch([() => layout.ordered.value, widths], measure, { immediate: true, flush: 'post' });
  trackScroll();

  useResizeObserver(tableElement, () => {
    measure();
    trackScroll();
  });
});
</script>
