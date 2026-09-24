<template>
  <div
    class="nui-table"
    :class="[
      `nui-table--size-${size}`,
      {
        'nui-table--striped': striped,
        'nui-table--hoverable': hoverable,
        'nui-table--sticky-header': stickyHeader,
        'nui-table--virtual': isVirtual,
        'nui-table--selectable': selectable !== undefined,
        'nui-table--loading': loading,
        'nui-table--fixed': layout.fixed.value,
        'nui-table--dragging': columnDrag.state.value.phase === 'dragging',
        'nui-table--scrolled-start': scrolled.start,
        'nui-table--scrolled-end': scrolled.end,
      },
    ]"
  >
    <div
      ref="scroller"
      class="nui-table__scroller"
      :style="{ '--_height': height }"
      :tabindex="height === undefined ? undefined : 0"
      @scroll="trackScroll"
    >
      <table
        ref="table"
        class="nui-table__table"
        :style="isVirtual ? { '--_row': `${rowHeight}px` } : undefined"
        :aria-busy="loading || undefined"
        :aria-rowcount="isVirtual ? visibleRows.length + 1 : undefined"
      >
        <caption v-if="caption || $slots.caption" class="nui-table__caption">
          <slot name="caption">{{ caption }}</slot>
        </caption>
        <colgroup>
          <col v-if="selectable" class="nui-table__col--utility" />
          <col
            v-for="column in layout.ordered.value"
            :key="column.key"
            :style="layout.colStyle(column)"
          />
        </colgroup>
        <NuiTableHead
          :columns="layout.ordered.value"
          :sort="sort"
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
          :columns="layout.ordered.value"
          :rows="renderedRows"
          :key-of="keyOf"
          :layout="layout"
          :selectable="selectable"
          :selected-keys="selectedKeys"
          :loading="loading"
          :loading-rows="loadingRows"
          :empty-label="emptyLabel"
          :select-label="selectLabel"
          :first-index="firstIndex"
          :spacers="spacers"
          @toggle="toggleOne"
          @row-click="(row, event) => emit('rowClick', row, event)"
        >
          <template v-for="name in bodySlotNames()" #[name]="ctx">
            <slot :name="name" v-bind="ctx" />
          </template>
        </NuiTableBody>
      </table>
      <div
        v-if="columnDrag.indicator.value !== undefined"
        class="nui-table__drop nui-table__drop--column"
        :style="{ left: `${columnDrag.indicator.value}px` }"
        aria-hidden="true"
      ></div>
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
import { useVirtualList } from '@numior/primitives';
import NuiPagination from '../pagination/NuiPagination.vue';
import { defaultOptionKey } from '../shared/options';
import NuiTableBody from './NuiTableBody.vue';
import NuiTableHead from './NuiTableHead.vue';
import { defaultAnnounce } from './announce';
import { slotNamesWithPrefix } from './cells';
import { pageSlice, resolvePagination } from './page';
import { selectionStateOf, toggleRow, toggleRows } from './selection';
import { nextSort, sortRows } from './sort';
import type {
  NuiTableAnnouncement,
  NuiTableColumn,
  NuiTableHeadActions,
  NuiTableProps,
  NuiTableSort,
} from './table.types';
import { useColumnReorder } from './use-column-reorder';
import { useColumnResize } from './use-column-resize';
import { useTableColumns } from './use-table-columns';

const {
  columns,
  rows,
  getKey,
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
  announce = undefined,
} = defineProps<NuiTableProps<T>>();
const sort = defineModel<NuiTableSort>('sort', { default: null });
const selected = defineModel<T[]>('selected', { default: () => [] });
const page = defineModel<number>('page', { default: 1 });
const pageSize = defineModel<number>('pageSize', { default: 20 });
const columnOrder = defineModel<string[]>('columnOrder', { default: () => [] });
const widths = defineModel<Record<string, number>>('widths', { default: () => ({}) });
const emit = defineEmits<{ rowClick: [row: T, event: MouseEvent] }>();
const slots = useSlots();
const scroller = useTemplateRef<HTMLElement>('scroller');
const tableElement = useTemplateRef<HTMLTableElement>('table');

const keyOf = (row: T): string => (getKey ?? defaultOptionKey)(row);
const selectedKeys = computed(() => new Set(selected.value.map(keyOf)));
const paginationProps = computed(() => resolvePagination(pagination));
const sorted = computed(() => (remote ? [...rows] : sortRows(rows, sort.value, columns)));
const visibleRows = computed(() =>
  paginationProps.value && !remote
    ? pageSlice(sorted.value, page.value, pageSize.value)
    : sorted.value,
);
const totalCount = computed(() => (remote ? (total ?? rows.length) : rows.length));
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
  selectionStateOf(selectedKeys.value, visibleRows.value, keyOf),
);

const utilities = (): number => (selectable ? 1 : 0);
const isRtl = (): boolean => scroller.value?.closest('[dir]')?.getAttribute('dir') === 'rtl';
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
const scrolled = ref({ start: false, end: false });
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
  selected.value = toggleRows(selected.value, visibleRows.value, keyOf);
};
const headerSlotNames = (): string[] => slotNamesWithPrefix(slots, 'header-');
const bodySlotNames = (): string[] => [
  ...slotNamesWithPrefix(slots, 'cell-'),
  ...['empty', 'loading'].filter((name) => slots[name] !== undefined),
];

onMounted(() => {
  const measure = (): void => layout.measure(tableElement.value);
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
