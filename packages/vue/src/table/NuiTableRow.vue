<template>
  <tr
    class="nui-table__row"
    :class="{ 'nui-table__row--selected': selected }"
    :aria-selected="selectable ? selected : undefined"
    :aria-rowindex="rowIndex"
    @click="onClick"
  >
    <td
      v-if="selectable"
      class="nui-table__cell nui-table__cell--select"
      :class="layout.utilityClass(0)"
      :style="layout.utilityStyle(0)"
    >
      <NuiCheckbox
        size="sm"
        :model-value="selected"
        :aria-label="selectLabel"
        @update:model-value="emit('toggle')"
      />
    </td>
    <td
      v-for="column in columns"
      :key="column.key"
      class="nui-table__cell"
      :class="[alignClass(column), ...layout.cellClass(column)]"
      :style="layout.cellStyle(column)"
    >
      <slot
        :name="`cell-${column.key}`"
        :row="row"
        :value="cellValue(row, column)"
        :column="column"
        :index="index"
      >
        {{ cellText(cellValue(row, column)) }}
      </slot>
    </td>
  </tr>
</template>

<script setup lang="ts" generic="T">
import NuiCheckbox from '../checkbox/NuiCheckbox.vue';
import { alignClass, cellText, cellValue } from './cells';
import type { NuiTableRowProps } from './table.types';

const { row, index, rowIndex, columns, layout, selectable, selected, selectLabel } =
  defineProps<NuiTableRowProps<T>>();
const emit = defineEmits<{ toggle: []; rowClick: [event: MouseEvent] }>();

const onClick = (event: MouseEvent): void => {
  if (event.target instanceof Element && event.target.closest('.nui-table__cell--select')) {
    return;
  }
  emit('rowClick', event);
};
</script>
