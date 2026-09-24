<template>
  <tbody class="nui-table__body">
    <NuiTableStatus
      v-if="showStatus"
      :span="span"
      :loading="loading"
      :loading-rows="loadingRows"
      :columns="columns"
      :selectable="selectable"
      :empty-label="emptyLabel"
    >
      <template v-if="$slots.loading" #loading><slot name="loading" /></template>
      <template v-if="$slots.empty" #empty><slot name="empty" /></template>
    </NuiTableStatus>
    <template v-else>
      <NuiTableSpacer :span="span" :size="startSpacer" />
      <NuiTableRow
        v-for="(row, offset) in rows"
        :key="keyOf(row)"
        :row="row"
        :index="firstIndex + offset"
        :row-index="rowIndexOf(offset)"
        :columns="columns"
        :layout="layout"
        :selectable="selectable"
        :selected="isSelected(row)"
        :select-label="selectLabel"
        @toggle="emit('toggle', row)"
        @row-click="emit('rowClick', row, $event)"
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
import type { NuiTableBodyProps } from './table.types';

const {
  columns,
  rows,
  keyOf,
  layout,
  selectable,
  selectedKeys,
  loading,
  loadingRows,
  emptyLabel,
  selectLabel,
  firstIndex,
  spacers,
} = defineProps<NuiTableBodyProps<T>>();
const emit = defineEmits<{ toggle: [row: T]; rowClick: [row: T, event: MouseEvent] }>();
const slots = useSlots();

const span = computed(() => columns.length + (selectable ? 1 : 0));
const showStatus = computed(() => loading || rows.length === 0);
const startSpacer = computed(() => spacers?.start ?? 0);
const endSpacer = computed(() => spacers?.end ?? 0);
const rowIndexOf = (offset: number): number | undefined =>
  spacers ? firstIndex + offset + 2 : undefined;
const isSelected = (row: T): boolean => selectedKeys.has(keyOf(row));
const cellSlotNames = (): string[] => slotNamesWithPrefix(slots, 'cell-');
</script>
