<template>
  <div
    class="nui-grid__row"
    :class="{ 'nui-grid__row--head': head }"
    role="row"
    :aria-rowindex="rowIndex"
    :style="head ? undefined : { transform: `translateY(${offset}px)` }"
  >
    <div
      v-for="pane in PANE_NAMES"
      :key="pane"
      class="nui-grid__pane"
      :class="`nui-grid__pane--${pane}`"
      role="presentation"
    >
      <div
        v-for="cell in panes[pane]"
        :key="cell.key"
        class="nui-grid__cell"
        :class="[
          `nui-grid__cell--align-${cell.align}`,
          { 'nui-grid__cell--active': cell.colIndex === active },
        ]"
        :role="head ? 'columnheader' : 'gridcell'"
        :aria-colindex="cell.colIndex"
        :tabindex="cell.colIndex === active ? 0 : -1"
        :style="cell.style"
      >
        <slot :column="cell.key" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GridPaneName, NuiDataGridRowProps } from './data-grid.types';

const PANE_NAMES: readonly GridPaneName[] = ['start', 'centre', 'end'];

const {
  panes,
  rowIndex,
  head = false,
  offset = 0,
  active = 0,
} = defineProps<NuiDataGridRowProps>();

defineSlots<{ default(props: { column: string }): unknown }>();
</script>
