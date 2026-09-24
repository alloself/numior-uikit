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
      },
    ]"
  >
    <div ref="scroller" class="nui-table__scroller" :style="{ '--_height': height }">
      <table
        class="nui-table__table"
        :style="isVirtual ? { '--_row': `${rowHeight}px` } : undefined"
        :aria-busy="loading || undefined"
        :aria-rowcount="isVirtual ? visibleRows.length + 1 : undefined"
      >
        <caption v-if="caption || $slots.caption" class="nui-table__caption">
          <slot name="caption">{{ caption }}</slot>
        </caption>
        <NuiTableHead
          :columns="columns"
          :sort="sort"
          :selectable="selectable"
          :selection-state="selectionState"
          :selection-disabled="loading || visibleRows.length === 0"
          :select-all-label="selectAllLabel"
          @sort="cycle"
          @toggle-all="toggleAll"
        >
          <template v-for="name in headerSlotNames()" #[name]="ctx">
            <slot :name="name" v-bind="ctx" />
          </template>
        </NuiTableHead>
        <NuiTableBody
          :columns="columns"
          :rows="renderedRows"
          :key-of="keyOf"
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
  </div>
</template>

<script setup lang="ts" generic="T">
import { computed, useSlots, useTemplateRef } from 'vue';
import { useVirtualList } from '@numior/primitives';
import NuiPagination from '../pagination/NuiPagination.vue';
import { defaultOptionKey } from '../shared/options';
import NuiTableBody from './NuiTableBody.vue';
import NuiTableHead from './NuiTableHead.vue';
import { slotNamesWithPrefix } from './cells';
import { pageSlice, resolvePagination } from './page';
import { selectionStateOf, toggleRow, toggleRows } from './selection';
import { nextSort, sortRows } from './sort';
import type { NuiTableProps, NuiTableSort } from './table.types';

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
} = defineProps<NuiTableProps<T>>();
const sort = defineModel<NuiTableSort>('sort', { default: null });
const selected = defineModel<T[]>('selected', { default: () => [] });
const page = defineModel<number>('page', { default: 1 });
const pageSize = defineModel<number>('pageSize', { default: 20 });
const emit = defineEmits<{ rowClick: [row: T, event: MouseEvent] }>();
const slots = useSlots();
const scroller = useTemplateRef<HTMLElement>('scroller');

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
</script>
