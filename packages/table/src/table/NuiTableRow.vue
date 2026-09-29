<template>
  <NuiTableGap :size="gap" />
  <tr
    class="nui-table__row"
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
    <template v-for="cell in cells.cells" :key="cell.key">
      <component
        :is="tag"
        v-if="cell.kind === 'gap'"
        class="nui-table__cell nui-table__cell--gap"
        :class="pinClass(cell)"
        role="presentation"
        :colspan="colspanOf(cell.colspan)"
        :style="cell.style"
      ></component>
      <component
        :is="tag"
        v-else
        class="nui-table__cell"
        :class="cellClass(cell)"
        :role="cellRole"
        :scope="scope"
        :colspan="colspanOf(cell.colspan)"
        :aria-colindex="cell.colIndex"
        :aria-colspan="cell.span"
        :aria-sort="ariaSortOf(cell.key)"
        :tabindex="tabindexOf(cell.colIndex)"
        :style="cell.style"
      >
        <div class="nui-table__content">
          <slot v-if="cell.kind !== 'data'" name="utility" :column="cell.key" />
          <NuiTableGroupCell
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
      </component>
    </template>
  </tr>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import NuiTableGap from './NuiTableGap.vue';
import NuiTableGroupCell from './NuiTableGroupCell.vue';
import type { TableCellLayout, TableDataCell, NuiTableRowProps } from './table.types';

const {
  cells,
  rowIndex,
  part = 'body',
  gap = 0,
  active = 0,
  level,
  group,
  treeKey,
  expanded = undefined,
  loading = false,
  selected = undefined,
  stripe = false,
  heads,
} = defineProps<NuiTableRowProps>();

const emit = defineEmits<{ toggle: [] }>();

defineSlots<{
  default(props: { column: string }): unknown;
  utility(props: { column: string }): unknown;
  tree(): unknown;
}>();

const heading = computed(() => part === 'head' || part === 'band');

const cellRole = computed(() => (heading.value ? 'columnheader' : 'gridcell'));

const tag = computed(() => (heading.value ? 'th' : 'td'));

const scope = computed(() => {
  switch (part) {
    case 'head':
      return 'col';
    case 'band':
      return 'colgroup';
    default:
      return undefined;
  }
});

const sticky = computed(() => part === 'head' || part === 'band' || part === 'pinned');

const hiddenRow = computed(() => (part === 'skeleton' ? true : undefined));

const wrapsText = computed(() => part === 'body' || part === 'foot');

const rowClass = computed(() => [
  `nui-table__row--${part}`,
  {
    'nui-table__row--group': group !== undefined,
    'nui-table__row--expanded': expanded === true,
    'nui-table__row--selected': selected === true,
    'nui-table__row--odd': stripe,
  },
]);

const rowStyle = computed(() =>
  sticky.value ? { '--_top': `calc(var(--_row) * ${rowIndex - 1})` } : undefined,
);

const pinClass = (cell: TableCellLayout): Record<string, boolean> => ({
  'nui-table__cell--pin-start': cell.pin === 'start',
  'nui-table__cell--pin-end': cell.pin === 'end',
  'nui-table__cell--edge': cell.edge,
});

const cellClass = (cell: TableDataCell): unknown[] => [
  `nui-table__cell--align-${cell.align}`,
  `nui-table__cell--${cell.kind}`,
  pinClass(cell),
  {
    'nui-table__cell--wrap': cell.wrap && wrapsText.value,
    'nui-table__cell--active': cell.colIndex === active,
    'nui-table__cell--sortable': heads?.[cell.key]?.sortable === true,
  },
];

const colspanOf = (colspan: number): number | undefined => (colspan > 1 ? colspan : undefined);

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
