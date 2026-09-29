<template>
  <div
    class="nui-grid__row"
    :class="rowClass"
    role="row"
    :aria-rowindex="rowIndex"
    :aria-level="level"
    :aria-expanded="expanded"
    :aria-selected="selected"
    :aria-busy="loading || undefined"
    :aria-hidden="hiddenRow"
    :style="rowStyle"
  >
    <div
      v-for="pane in PANE_NAMES"
      :key="pane"
      class="nui-grid__pane"
      :class="`nui-grid__pane--${pane}`"
      :style="paneStyle(pane)"
      role="presentation"
    >
      <div
        v-for="cell in panes[pane]"
        :key="cell.key"
        class="nui-grid__cell"
        :class="cellClass(cell)"
        :role="cellRole"
        :aria-colindex="cell.colIndex"
        :aria-colspan="cell.span"
        :aria-sort="ariaSortOf(cell.key)"
        :tabindex="tabindexOf(cell.colIndex)"
        :style="cell.style"
      >
        <slot v-if="cell.kind !== 'data'" name="utility" :column="cell.key" />
        <NuiDataGridGroupCell
          v-else-if="group"
          :cell="group.cells[cell.key]"
          @toggle="emit('toggle')"
        />
        <template v-else-if="cell.key === treeKey">
          <slot name="tree" />
          <slot :column="cell.key" />
        </template>
        <slot v-else :column="cell.key" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import NuiDataGridGroupCell from './NuiDataGridGroupCell.vue';
import type { GridCellLayout, GridPaneName, NuiDataGridRowProps } from './data-grid.types';

const PANE_NAMES: readonly GridPaneName[] = ['start', 'centre', 'end'];

const {
  panes,
  rowIndex,
  part = 'body',
  offset,
  active = 0,
  level,
  group,
  treeKey,
  expanded = undefined,
  loading = false,
  selected = undefined,
  stripe = false,
  heads,
} = defineProps<NuiDataGridRowProps>();

const emit = defineEmits<{ toggle: [] }>();

defineSlots<{
  default(props: { column: string }): unknown;
  utility(props: { column: string }): unknown;
  tree(): unknown;
}>();

const cellRole = computed(() => (part === 'head' || part === 'band' ? 'columnheader' : 'gridcell'));

const positioned = computed(() => part === 'body' || part === 'skeleton');

const hiddenRow = computed(() => (part === 'skeleton' ? true : undefined));

const wrapsText = computed(() => part === 'body' || part === 'foot');

const rowClass = computed(() => [
  `nui-grid__row--${part}`,
  {
    'nui-grid__row--group': group !== undefined,
    'nui-grid__row--expanded': expanded === true,
    'nui-grid__row--selected': selected === true,
    'nui-grid__row--odd': stripe,
  },
]);

const rowStyle = computed(() =>
  positioned.value && offset !== undefined ? { transform: `translateY(${offset}px)` } : undefined,
);

const centreStyle = computed(() => ({ paddingInlineStart: `${panes.centreInset}px` }));

const paneStyle = (pane: GridPaneName): Readonly<Record<string, string>> | undefined =>
  pane === 'centre' ? centreStyle.value : undefined;

const cellClass = (cell: GridCellLayout): unknown[] => [
  `nui-grid__cell--align-${cell.align}`,
  `nui-grid__cell--${cell.kind}`,
  {
    'nui-grid__cell--wrap': cell.wrap === true && wrapsText.value,
    'nui-grid__cell--active': cell.colIndex === active,
    'nui-grid__cell--sortable': heads?.[cell.key]?.sortable === true,
  },
];

const tabindexOf = (colIndex: number): number | undefined => {
  if (part === 'band' || part === 'skeleton') {
    return undefined;
  }
  return colIndex === active ? 0 : -1;
};

const ariaSortOf = (key: string): 'ascending' | 'descending' | undefined => {
  const state = heads?.[key];

  if (state?.primary !== true) {
    return undefined;
  }
  return state.direction === 'desc' ? 'descending' : 'ascending';
};
</script>
