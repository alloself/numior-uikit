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
    <template v-for="cell in shownCells" :key="cell.key">
      <component
        :is="tagOf(cell)"
        v-if="cell.kind === 'gap'"
        class="nui-table__cell nui-table__cell--gap"
        :class="pinClass(cell)"
        role="presentation"
        :colspan="colspanOf(cell)"
        :style="cell.style"
      ></component>
      <component
        :is="tagOf(cell)"
        v-else
        class="nui-table__cell"
        :class="cellClass(cell)"
        :role="roleOf(cell)"
        :scope="scopeOf(cell)"
        :rowspan="rowspanOf(cell)"
        :colspan="colspanOf(cell)"
        :aria-colindex="cell.colIndex"
        :aria-colspan="spannedColsOf(cell)"
        :aria-sort="ariaSortOf(cell.key)"
        :aria-selected="cellSelected(cell)"
        :tabindex="tabindexOf(cell.colIndex)"
        :style="styleOf(cell)"
      >
        <div class="nui-table__content">
          <slot v-if="cell.kind !== 'data'" name="utility" :column="cell.key" />
          <slot v-else :column="cell.key" :merge="leadOf(cell)" />
        </div>
        <NuiTableResizer
          v-if="resizerOf(cell)"
          v-bind="resizerOf(cell)"
          @grab="emit('resize', handleOf(cell), $event)"
          @reset="emit('resetSize', handleOf(cell))"
        />
      </component>
    </template>
  </tr>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import NuiTableResizer from './NuiTableResizer.vue';
import { inSpans } from './table-ranges';
import type {
  TableCellLayout,
  TableDataCell,
  TableLeadSpan,
  TableRangeSegment,
  TableRowRanges,
  NuiTableResizerProps,
  NuiTableRowProps,
} from './table.types';

const {
  cells,
  rowIndex,
  part = 'body',
  wraps = true,
  position,
  paint,
  active = 0,
  revision,
  level,
  group,
  expanded = undefined,
  loading = false,
  selected = undefined,
  stripe = false,
  dragging = false,
  ranged,
  rangedAt,
  spans,
  ally,
  marks,
  sized,
  sizable = false,
  sizing = false,
  frozen,
  edge = false,
  heads,
} = defineProps<NuiTableRowProps>();

const emit = defineEmits<{
  resize: [key: string, event: PointerEvent];
  resetSize: [key: string];
}>();

defineSlots<{
  default(props: { column: string; merge: TableLeadSpan | undefined }): unknown;
  utility(props: { column: string }): unknown;
}>();

const shownCells = computed(() =>
  spans === undefined
    ? cells.cells
    : cells.cells.filter((cell) => spans.get(cell.key)?.kind !== 'covered'),
);

const leadOf = (cell: TableCellLayout): TableLeadSpan | undefined => {
  const span = spans?.get(cell.key);

  return span?.kind === 'lead' ? span : undefined;
};

const overOne = (count: number): number | undefined => (count > 1 ? count : undefined);

const rowspanOf = (cell: TableCellLayout): number | undefined =>
  overOne(leadOf(cell)?.rowspan ?? 1);

const colspanOf = (cell: TableCellLayout): number | undefined =>
  overOne(leadOf(cell)?.colspan ?? cell.colspan);

const spannedColsOf = (cell: TableDataCell): number | undefined => leadOf(cell)?.span ?? cell.span;

const mergeClass = (cell: TableDataCell): Record<string, boolean> | undefined => {
  const span = leadOf(cell);

  return span === undefined
    ? undefined
    : {
        'nui-table__cell--merged': true,
        'nui-table__cell--edge': span.edge,
        'nui-table__cell--tail': span.tail,
        'nui-table__cell--tall': span.rows > 1,
        'nui-table__cell--allied':
          span.anchor.row === ally?.row && span.anchor.col === ally.col && cell.colIndex !== active,
        'nui-table__cell--cut-top': span.row > span.anchor.row,
        'nui-table__cell--cut-bottom': span.row + span.rowspan < span.anchor.row + span.rows,
        'nui-table__cell--cut-start': span.col > span.anchor.col,
        'nui-table__cell--cut-end': span.col + span.span < span.anchor.col + span.cols,
      };
};

const spreadOf = (span: TableLeadSpan | undefined): Record<string, string> | undefined => {
  if (span === undefined) {
    return undefined;
  }
  return {
    ...(span.span === span.cols
      ? {}
      : { '--_span-x': `${-span.x}px`, '--_span-w': `${span.width}px` }),
    ...(span.rowspan === span.rows
      ? {}
      : { '--_span-y': `${-span.y}px`, '--_span-h': `${span.height}px` }),
  };
};

const heading = computed(() => part === 'head' || part === 'band');

const headScope = computed(() => (part === 'head' ? 'col' : 'colgroup'));

const tagOf = (cell: TableCellLayout): 'th' | 'td' =>
  heading.value || cell.kind === 'rowhead' ? 'th' : 'td';

const roleOf = (cell: TableDataCell): 'columnheader' | 'rowheader' | 'gridcell' => {
  if (heading.value) {
    return 'columnheader';
  }
  return cell.kind === 'rowhead' ? 'rowheader' : 'gridcell';
};

const scopeOf = (cell: TableDataCell): 'col' | 'colgroup' | 'row' | undefined => {
  if (heading.value) {
    return headScope.value;
  }
  return cell.kind === 'rowhead' ? 'row' : undefined;
};

const markedOf = (cell: TableDataCell): boolean =>
  cell.kind === 'rowhead'
    ? ranged !== undefined
    : marks !== undefined && inSpans(marks, cell.colIndex - 1);

const sticky = computed(() => part === 'head' || part === 'band' || part === 'pinned');

const hiddenRow = computed(() => (part === 'skeleton' ? true : undefined));

const busy = computed(() => loading || undefined);

const wrapsText = computed(() => part === 'body' || (part === 'foot' && wraps));

const rowClass = computed(() => [
  `nui-table__row--${part}`,
  {
    'nui-table__row--group': group !== undefined,
    'nui-table__row--expanded': expanded === true,
    'nui-table__row--selected': selected === true,
    'nui-table__row--odd': stripe,
    'nui-table__row--dragging': dragging,
    'nui-table__row--frozen': frozen !== undefined,
    'nui-table__row--edge': edge,
  },
]);

const rowStyle = computed(() => {
  if (sticky.value) {
    return { '--_top': `calc(var(--_row) * ${rowIndex - 1})` };
  }
  return frozen === undefined
    ? sized
    : { ...sized, '--_top': `calc(var(--_head-size) + ${frozen}px)` };
});

const pinClass = (cell: TableCellLayout): Record<string, boolean> => ({
  'nui-table__cell--pin-start': cell.pin === 'start',
  'nui-table__cell--pin-end': cell.pin === 'end',
  'nui-table__cell--edge': cell.edge,
});

const hitsIn = (segments: TableRowRanges | undefined, visual: number): TableRangeSegment[] =>
  segments === undefined
    ? []
    : segments.filter((segment) => visual >= segment.from && visual <= segment.to);

const hitsOf = (cell: TableDataCell): TableRangeSegment[] =>
  cell.kind === 'data' ? hitsIn(ranged, cell.colIndex - 1) : [];

const hitsBelow = (
  hits: TableRangeSegment[],
  lead: TableLeadSpan | undefined,
  visual: number,
): TableRangeSegment[] =>
  lead === undefined || position === undefined
    ? hits
    : hitsIn(rangedAt?.(position + lead.rowspan - 1), visual);

const rangeClass = (cell: TableDataCell): Record<string, boolean> | undefined => {
  const hits = hitsOf(cell);
  const visual = cell.colIndex - 1;
  const lead = leadOf(cell);
  const last = visual + (lead?.span ?? 1) - 1;

  return hits.length === 0
    ? undefined
    : {
        'nui-table__cell--ranged': true,
        'nui-table__cell--range-top': hits.some((segment) => segment.top),
        'nui-table__cell--range-bottom': hitsBelow(hits, lead, visual).some(
          (segment) => segment.bottom,
        ),
        'nui-table__cell--range-start': hits.some(
          (segment) => segment.start && segment.from === visual,
        ),
        'nui-table__cell--range-end': hits.some((segment) => segment.end && segment.to === last),
      };
};

const cellSelected = (cell: TableDataCell): 'true' | undefined =>
  hitsOf(cell).length === 0 ? undefined : 'true';

const paints = computed(() => {
  void revision;
  return position === undefined ? undefined : paint?.(position, spans);
});

const styleOf = (cell: TableDataCell): unknown => {
  const painted = paints.value?.get(cell.key)?.style;
  const spread = spreadOf(leadOf(cell));

  return painted === undefined && spread === undefined ? cell.style : [cell.style, painted, spread];
};

const cellClass = (cell: TableDataCell): unknown[] => [
  `nui-table__cell--align-${paints.value?.get(cell.key)?.align ?? cell.align}`,
  `nui-table__cell--${cell.kind}`,
  paints.value?.get(cell.key)?.class,
  pinClass(cell),
  rangeClass(cell),
  mergeClass(cell),
  cell.rule === undefined ? undefined : `nui-table__cell--rule-${cell.rule}`,
  {
    'nui-table__cell--marked': markedOf(cell),
    'nui-table__cell--tail': cell.tail === true,
    'nui-table__cell--wrap': cell.wrap && wrapsText.value,
    'nui-table__cell--active': cell.colIndex === active,
    'nui-table__cell--sortable': heads?.[cell.key]?.sortable === true,
    'nui-table__cell--dragging': heads?.[cell.key]?.dragging === true,
  },
];

const handleOf = (cell: TableDataCell): string => cell.handle ?? cell.key;

const resizerOf = (cell: TableDataCell): NuiTableResizerProps | undefined => {
  if (cell.kind === 'rowhead') {
    return sizable ? { axis: 'y', active: sizing } : undefined;
  }
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
