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
          {
            'nui-grid__cell--active': cell.colIndex === active,
            'nui-grid__cell--sortable': heads?.[cell.key]?.sortable === true,
          },
        ]"
        :role="head ? 'columnheader' : 'gridcell'"
        :aria-colindex="cell.colIndex"
        :aria-sort="ariaSortOf(cell.key)"
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
  heads,
} = defineProps<NuiDataGridRowProps>();

defineSlots<{ default(props: { column: string }): unknown }>();

const ariaSortOf = (key: string): 'ascending' | 'descending' | undefined => {
  const state = heads?.[key];

  if (state?.primary !== true) {
    return undefined;
  }
  return state.direction === 'desc' ? 'descending' : 'ascending';
};
</script>
