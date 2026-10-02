<template>
  <tr
    class="nui-table__row nui-table__row--detail"
    role="row"
    :aria-rowindex="rowIndex"
    :aria-level="level"
  >
    <td
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
import type { NuiTableDetailRowProps } from './table.types';

const { rowIndex, span, colspan, level, active = false } = defineProps<NuiTableDetailRowProps>();

defineSlots<{ default(): unknown }>();
</script>
