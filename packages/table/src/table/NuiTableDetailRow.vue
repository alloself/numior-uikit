<template>
  <tr
    class="nui-table__row nui-table__row--detail"
    role="row"
    :aria-rowindex="rowIndex"
    :aria-level="level"
  >
    <td
      ref="cell"
      class="nui-table__cell nui-table__cell--detail"
      :class="{ 'nui-table__cell--active': active }"
      role="gridcell"
      aria-colindex="1"
      :aria-colspan="span"
      :colspan="colspan"
      :tabindex="active ? 0 : -1"
    >
      <div class="nui-table__detail">
        <slot />
      </div>
    </td>
  </tr>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useResizeObserver } from '@vueuse/core';
import type { NuiTableDetailRowProps } from './table.types';

const {
  rowIndex,
  span,
  colspan,
  level,
  active = false,
  measured = false,
} = defineProps<NuiTableDetailRowProps>();

const emit = defineEmits<{ measure: [size: number] }>();

defineSlots<{ default(): unknown }>();

const cell = useTemplateRef<HTMLElement>('cell');

useResizeObserver(
  () => (measured ? cell.value : null),
  () => {
    const size = cell.value?.getBoundingClientRect().height ?? 0;

    if (size > 0) {
      emit('measure', size);
    }
  },
);
</script>
