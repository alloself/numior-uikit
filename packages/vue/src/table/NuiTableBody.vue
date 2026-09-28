<template>
  <tbody class="nui-table__body" :class="{ 'nui-table__body--pinned': pinned }">
    <NuiTableStatus
      v-if="showStatus"
      :span="span"
      :loading="loading"
      :loading-rows="loadingRows"
      :columns="columns"
      :empty-label="emptyLabel"
    />
    <template v-else>
      <NuiTableSpacer :span="span" :size="startSpacer" />
      <NuiTableRow
        v-for="{ view, index } in rows"
        :key="view.key"
        :view="view"
        :index="index"
        :row-index="rowIndexOf(index)"
        :columns="columns"
        :layout="layout"
        :options="options"
        :selectable="selectable"
        :selected="selectedKeys.has(view.key)"
        :dragging="dragging === index"
        @toggle="emit('toggle', view.row)"
        @row-click="emit('rowClick', view.row, $event)"
        @expand="emit('expand', view)"
        @drag-start="emit('dragStart', index, $event)"
        @drag-keydown="emit('dragKeydown', index, $event)"
      />
      <NuiTableSpacer :span="span" :size="endSpacer" />
    </template>
  </tbody>
</template>

<script setup lang="ts" generic="T">
import { computed } from 'vue';
import NuiTableRow from './NuiTableRow.vue';
import NuiTableSpacer from './NuiTableSpacer.vue';
import NuiTableStatus from './NuiTableStatus.vue';
import type { NuiTableRowView } from './rows';
import type { NuiTableBodyProps } from './table.types';

const {
  columns,
  rows,
  layout,
  options,
  selectable,
  selectedKeys,
  loading,
  loadingRows,
  emptyLabel,
  spacers,
  dragging,
  pinned,
} = defineProps<NuiTableBodyProps<T>>();

const emit = defineEmits<{
  toggle: [row: T];
  rowClick: [row: T, event: MouseEvent];
  expand: [view: NuiTableRowView<T>];
  dragStart: [index: number, event: PointerEvent];
  dragKeydown: [index: number, event: KeyboardEvent];
}>();

const span = computed(() => columns.length + (selectable ? 1 : 0) + (options.rowDrag ? 1 : 0));
const showStatus = computed(() => !pinned && (loading || rows.length === 0));
const startSpacer = computed(() => spacers?.start ?? 0);
const endSpacer = computed(() => spacers?.end ?? 0);

const rowIndexOf = (index: number): number | undefined => (spacers ? index + 2 : undefined);
</script>
