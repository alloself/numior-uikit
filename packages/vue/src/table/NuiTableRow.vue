<template>
  <tr
    class="nui-table__row"
    :class="{ 'nui-table__row--selected': selected, 'nui-table__row--dragging': dragging }"
    :aria-selected="selectable ? selected : undefined"
    :aria-rowindex="rowIndex"
    @click="onClick"
  >
    <td
      v-if="options.rowDrag"
      class="nui-table__cell nui-table__cell--drag"
      :class="layout.utilityClass(0)"
      :style="layout.utilityStyle(0)"
    >
      <button
        type="button"
        class="nui-table__grip"
        :aria-label="options.dragLabel(view.row)"
        :disabled="options.dragDisabled"
        @pointerdown="emit('dragStart', $event)"
        @keydown="emit('dragKeydown', $event)"
      >
        <NuiIcon alias="grip" />
      </button>
    </td>
    <td
      v-if="selectable"
      class="nui-table__cell nui-table__cell--select"
      :class="layout.utilityClass(selectPosition)"
      :style="layout.utilityStyle(selectPosition)"
    >
      <NuiCheckbox
        size="sm"
        :model-value="selected"
        :aria-label="options.selectLabel"
        @update:model-value="emit('toggle')"
      />
    </td>
    <td
      v-for="({ column, value, text }, position) in cells"
      :key="column.key"
      class="nui-table__cell"
      :class="[
        alignClass(column),
        ...layout.cellClass(column),
        { 'nui-table__cell--tree': options.tree && position === 0 },
      ]"
      :style="cellStyle(column, position)"
    >
      <NuiTableToggle
        v-if="options.tree && position === 0"
        :view="view"
        :label="options.expandLabel(view.row)"
        @expand="emit('expand')"
      />
      <TableSlot
        :render="slots[`cell-${column.key}`]"
        :scope="{ row: view.row, value, column, index }"
      >
        {{ text }}
      </TableSlot>
    </td>
  </tr>
</template>

<script setup lang="ts" generic="T">
import { computed } from 'vue';
import NuiCheckbox from '../checkbox/NuiCheckbox.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiTableToggle from './NuiTableToggle.vue';
import { TableSlot, useTableSlots } from './table-slots';
import { alignClass, cellText, cellValue } from './cells';
import type { NuiTableCellStyle, NuiTableColumn, NuiTableRowProps } from './table.types';

const { view, index, rowIndex, columns, layout, options, selectable, selected, dragging } =
  defineProps<NuiTableRowProps<T>>();

const emit = defineEmits<{
  toggle: [];
  rowClick: [event: MouseEvent];
  expand: [];
  dragStart: [event: PointerEvent];
  dragKeydown: [event: KeyboardEvent];
}>();

const slots = useTableSlots();
const selectPosition = computed(() => (options.rowDrag ? 1 : 0));

const cells = computed(() =>
  columns.map((column) => {
    const value = cellValue(view.row, column);
    return { column, value, text: cellText(value) };
  }),
);

const cellStyle = (column: NuiTableColumn<T>, position: number): NuiTableCellStyle => {
  const sticky = layout.cellStyle(column);
  if (!options.tree || position !== 0) {
    return sticky;
  }
  return { ...sticky, '--_level': String(view.level) };
};

const onClick = (event: MouseEvent): void => {
  if (
    event.target instanceof Element &&
    event.target.closest('.nui-table__cell--select, .nui-table__cell--drag, .nui-table__toggle')
  ) {
    return;
  }
  emit('rowClick', event);
};
</script>
