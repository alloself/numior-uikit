<template>
  <tr
    class="nui-table__row"
    :class="rowClass"
    role="row"
    :aria-rowindex="hiddenRow ? undefined : rowIndex"
    :aria-level="level"
    :aria-expanded="expanded"
    :aria-selected="selected"
    :aria-busy="busy"
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
        :aria-selected="cellSelected(cell)"
        :tabindex="tabindexOf(cell.colIndex)"
        :style="cell.style"
      >
        <div class="nui-table__content">
          <slot v-if="cell.kind !== 'data'" name="utility" :column="cell.key" />
          <slot v-else :column="cell.key" />
        </div>
        <NuiTableResizer
          v-if="resizerOf(cell)"
          v-bind="resizerOf(cell)"
          @grab="emit('resize', handleOf(cell), $event)"
        />
      </component>
    </template>
  </tr>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import NuiTableResizer from './NuiTableResizer.vue';
import type {
  TableCellLayout,
  TableDataCell,
  TableRangeSegment,
  NuiTableResizerProps,
  NuiTableRowProps,
} from './table.types';

const {
  cells,
  rowIndex,
  part = 'body',
  top,
  active = 0,
  level,
  group,
  expanded = undefined,
  loading = false,
  selected = undefined,
  stripe = false,
  dragging = false,
  ranged,
  heads,
} = defineProps<NuiTableRowProps>();

const emit = defineEmits<{ resize: [key: string, event: PointerEvent] }>();

defineSlots<{
  default(props: { column: string }): unknown;
  utility(props: { column: string }): unknown;
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

const busy = computed(() => loading || undefined);

const wrapsText = computed(() => part === 'body' || part === 'foot');

const rowClass = computed(() => [
  `nui-table__row--${part}`,
  {
    'nui-table__row--group': group !== undefined,
    'nui-table__row--expanded': expanded === true,
    'nui-table__row--selected': selected === true,
    'nui-table__row--odd': stripe,
    'nui-table__row--dragging': dragging,
  },
]);

const rowStyle = computed(() => {
  if (sticky.value) {
    return { '--_top': `calc(var(--_row) * ${rowIndex - 1})` };
  }
  return top === undefined ? undefined : { '--_top': `${top}px` };
});

const pinClass = (cell: TableCellLayout): Record<string, boolean> => ({
  'nui-table__cell--pin-start': cell.pin === 'start',
  'nui-table__cell--pin-end': cell.pin === 'end',
  'nui-table__cell--edge': cell.edge,
});

const hitsOf = (cell: TableDataCell): TableRangeSegment[] => {
  const visual = cell.colIndex - 1;

  return ranged === undefined || cell.kind !== 'data'
    ? []
    : ranged.filter((segment) => visual >= segment.from && visual <= segment.to);
};

const rangeClass = (cell: TableDataCell): Record<string, boolean> | undefined => {
  const hits = hitsOf(cell);
  const visual = cell.colIndex - 1;

  return hits.length === 0
    ? undefined
    : {
        'nui-table__cell--ranged': true,
        'nui-table__cell--range-top': hits.some((segment) => segment.top),
        'nui-table__cell--range-bottom': hits.some((segment) => segment.bottom),
        'nui-table__cell--range-start': hits.some(
          (segment) => segment.start && segment.from === visual,
        ),
        'nui-table__cell--range-end': hits.some((segment) => segment.end && segment.to === visual),
      };
};

const cellSelected = (cell: TableDataCell): 'true' | undefined =>
  hitsOf(cell).length === 0 ? undefined : 'true';

const cellClass = (cell: TableDataCell): unknown[] => [
  `nui-table__cell--align-${cell.align}`,
  `nui-table__cell--${cell.kind}`,
  pinClass(cell),
  rangeClass(cell),
  cell.rule === undefined ? undefined : `nui-table__cell--rule-${cell.rule}`,
  {
    'nui-table__cell--wrap': cell.wrap && wrapsText.value,
    'nui-table__cell--active': cell.colIndex === active,
    'nui-table__cell--sortable': heads?.[cell.key]?.sortable === true,
    'nui-table__cell--dragging': heads?.[cell.key]?.dragging === true,
  },
];

const colspanOf = (colspan: number): number | undefined => (colspan > 1 ? colspan : undefined);

const handleOf = (cell: TableDataCell): string => cell.handle ?? cell.key;

const resizerOf = (cell: TableDataCell): NuiTableResizerProps | undefined => {
  const state = heading.value ? heads?.[handleOf(cell)] : undefined;

  return state?.resizable === true
    ? { start: cell.pin === 'end', active: state.resizing }
    : undefined;
};

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
