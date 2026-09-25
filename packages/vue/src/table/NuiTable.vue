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
            :select-all-label="selectAllLabel"
            :layout="layout"
            :actions="headActions"
            :resizing="resize.active.value"
            :dragging="columnDrag.state.value.from"
            :resize-label="resizeLabel"
            :reorder-label="reorderLabel"
            @sort="cycle"
            @toggle-all="toggleAll"
          >
            <template v-for="name in headerSlotNames()" #[name]="ctx">
              <slot :name="name" v-bind="ctx" />
            </template>
          </NuiTableHead>
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
            :empty-label="emptyLabel"
            :first-index="0"
            :spacers="undefined"
            :dragging="-1"
            pinned
            @toggle="toggleOne"
            @row-click="(row, event) => emit('rowClick', row, event)"
          >
            <template v-for="name in bodySlotNames()" #[name]="ctx">
              <slot :name="name" v-bind="ctx" />
            </template>
          </NuiTableBody>
          <NuiTableBody
            :columns="layout.ordered.value"
            :rows="renderedRows"
            :layout="layout"
            :options="rowOptions"
            :selectable="selectable"
            :selected-keys="selectedKeys"
            :loading="loading"
            :loading-rows="loadingRows"
            :empty-label="emptyLabel"
            :first-index="firstIndex"
            :spacers="spacers"
            :dragging="rowDragging"
            :pinned="false"
            @toggle="toggleOne"
            @row-click="(row, event) => emit('rowClick', row, event)"
            @expand="tableRows.toggle"
            @drag-start="rowReorder.dragStart"
            @drag-keydown="rowReorder.dragKeydown"
          >
            <template v-for="name in bodySlotNames()" #[name]="ctx">
              <slot :name="name" v-bind="ctx" />
            </template>
          </NuiTableBody>
        </table>
        <div
          v-for="drop in dropIndicators"
          :key="drop.axis"
          class="nui-table__drop"
          :class="`nui-table__drop--${drop.axis}`"
          :style="drop.style"
          aria-hidden="true"
        ></div>
        <div
          v-if="ghost"
          class="nui-table__ghost"
          :class="`nui-table__ghost--${ghost.axis}`"
          :style="ghost.style"
          aria-hidden="true"
        >
          <NuiIcon alias="grip" class="nui-table__ghost-grip" />
          <span class="nui-table__ghost-label">{{ ghost.label }}</span>
        </div>
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
import { computed, onMounted, onScopeDispose, ref, useSlots, useTemplateRef, watch } from 'vue';
import { useDirection, useVirtualList } from '@numior/primitives';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiPagination from '../pagination/NuiPagination.vue';
import { defaultOptionKey } from '../shared/options';
import NuiTableBody from './NuiTableBody.vue';
import NuiTableHead from './NuiTableHead.vue';
import { defaultAnnounce } from './announce';
import { cellText, cellValue, slotNamesWithPrefix } from './cells';
import { visibleStart } from './ghost';
import { pageSlice, resolvePagination } from './page';
import type { NuiTableRowView } from './rows';
import { selectionStateOf, toggleRow, toggleRows } from './selection';
import { nextSort, sortRows } from './sort';
import type {
  NuiTableAnnouncement,
  NuiTableColumn,
  NuiTableHeadActions,
  NuiTableProps,
  NuiTableReorderEvent,
  NuiTableRowOptions,
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
  emptyLabel = 'No data',
  caption,
  stickyHeader = false,
  striped = false,
  hoverable = false,
  size = 'md',
  virtual = false,
  height,
  rowHeight = 40,
  selectLabel = 'Select row',
  selectAllLabel = 'Select all rows',
  resizeLabel = (column: NuiTableColumn<T>) => `Resize ${column.label}`,
  reorderLabel = (column: NuiTableColumn<T>) => `Reorder ${column.label}`,
  expandLabel = () => 'Toggle row',
  dragLabel = () => 'Reorder row',
  rowLabel = undefined,
  announce = undefined,
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

const slots = useSlots();
const scroller = useTemplateRef<HTMLElement>('scroller');
const tableElement = useTemplateRef<HTMLTableElement>('table');
const rootElement = useTemplateRef<HTMLElement>('root');

const keyOf = (row: T): string => (getKey ?? defaultOptionKey)(row);
const selectedKeys = computed(() => new Set(selected.value.map(keyOf)));
const paginationProps = computed(() => resolvePagination(pagination));

const sortLevel = (level: readonly T[]): T[] =>
  remote ? [...level] : sortRows(level, sort.value, columns);

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
  selectionStateOf(selectedKeys.value, visibleData.value, keyOf),
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
  announcement.value = (announce ?? defaultAnnounce)(message);
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
  headClick: columnDrag.headClick,
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
  selectLabel,
  expandLabel,
  dragLabel,
}));

const rowDragging = computed(() => rowReorder.state.value.from);

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

const scrolled = ref({ start: false, end: false });

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
    'nui-table--scrolled-start': scrolled.value.start,
    'nui-table--scrolled-end': scrolled.value.end,
  },
]);

const scrollerTabindex = computed(() => (height === undefined ? undefined : 0));
const tableStyle = computed(() => (isVirtual.value ? { '--_row': `${rowHeight}px` } : undefined));
const rowCount = computed(() => (isVirtual.value ? visibleRows.value.length + 1 : undefined));

const utilityCols = computed(() => [
  ...(rowDrag ? ['drag'] : []),
  ...(selectable ? ['select'] : []),
]);

const ghost = computed(() => {
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

const dropIndicators = computed(() => [
  ...(columnDrag.indicator.value === undefined
    ? []
    : [{ axis: 'column', style: { left: `${columnDrag.indicator.value}px` } }]),
  ...(rowReorder.indicator.value === undefined
    ? []
    : [{ axis: 'row', style: { top: `${rowReorder.indicator.value}px` } }]),
]);

const trackScroll = (): void => {
  const element = scroller.value;
  if (!element) {
    return;
  }
  const offset = Math.abs(element.scrollLeft);
  const max = element.scrollWidth - element.clientWidth;
  scrolled.value = { start: offset > 0, end: offset < max - 1 };
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

const headerSlotNames = (): string[] => slotNamesWithPrefix(slots, 'header-');

const bodySlotNames = (): string[] => [
  ...slotNamesWithPrefix(slots, 'cell-'),
  ...['empty', 'loading'].filter((name) => slots[name] !== undefined),
];

onMounted(() => {
  const measure = (): void => {
    layout.measure(tableElement.value);
    const band = headBand();

    rootElement.value?.style.setProperty('--_head-size', `${band.height}px`);
    rootElement.value?.style.setProperty('--_caption-size', `${band.top}px`);
  };

  watch([() => layout.ordered.value, widths], measure, { immediate: true, flush: 'post' });
  trackScroll();
  if (typeof ResizeObserver === 'undefined' || !tableElement.value) {
    return;
  }

  const observer = new ResizeObserver(() => {
    measure();
    trackScroll();
  });

  observer.observe(tableElement.value);
  onScopeDispose(() => observer.disconnect());
});
</script>
