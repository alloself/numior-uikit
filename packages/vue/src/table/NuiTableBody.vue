<template>
  <tbody class="nui-table__body" :class="{ 'nui-table__body--pinned': pinned }">
    <NuiTableStatus
      v-if="showStatus"
      :span="span"
      :loading="loading"
      :loading-rows="loadingRows"
      :columns="columns"
      :empty-label="emptyLabel"
    >
      <template v-if="$slots.loading" #loading><slot name="loading" /></template>
      <template v-if="$slots.empty" #empty><slot name="empty" /></template>
    </NuiTableStatus>
    <template v-else>
      <NuiTableSpacer :span="span" :size="startSpacer" />
      <NuiTableRow
        v-for="(view, offset) in rows"
        :key="view.key"
        :view="view"
        :index="firstIndex + offset"
        :row-index="rowIndexOf(offset)"
        :columns="columns"
        :layout="layout"
        :options="options"
        :selectable="selectable"
        :selected="selectedKeys.has(view.key)"
        :dragging="dragging === firstIndex + offset"
        @toggle="emit('toggle', view.row)"
        @row-click="emit('rowClick', view.row, $event)"
        @expand="emit('expand', view)"
        @drag-start="emit('dragStart', firstIndex + offset, $event)"
        @drag-keydown="emit('dragKeydown', firstIndex + offset, $event)"
      >
        <template v-for="name in cellSlotNames()" #[name]="ctx">
          <slot :name="name" v-bind="ctx" />
        </template>
      </NuiTableRow>
      <NuiTableSpacer :span="span" :size="endSpacer" />
    </template>
  </tbody>
</template>

<script setup lang="ts" generic="T">
import { computed, useSlots } from 'vue';
import NuiTableRow from './NuiTableRow.vue';
import NuiTableSpacer from './NuiTableSpacer.vue';
import NuiTableStatus from './NuiTableStatus.vue';
import { slotNamesWithPrefix } from './cells';
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
  firstIndex,
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
const slots = useSlots();

const span = computed(() => columns.length + (selectable ? 1 : 0) + (options.rowDrag ? 1 : 0));
const showStatus = computed(() => !pinned && (loading || rows.length === 0));
const startSpacer = computed(() => spacers?.start ?? 0);
const endSpacer = computed(() => spacers?.end ?? 0);
const rowIndexOf = (offset: number): number | undefined =>
  spacers ? firstIndex + offset + 2 : undefined;
const cellSlotNames = (): string[] => slotNamesWithPrefix(slots, 'cell-');
</script>
