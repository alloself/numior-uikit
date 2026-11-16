<template>
  <tr
    class="nui-table__row"
    :class="rowClass"
    role="row"
    :aria-rowindex="shownIndex"
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
        v-if="cell.kind === TablePlacementKind.Gap"
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
        <div
          class="nui-table__content"
          :class="{ 'nui-table__content--text': bareOf(cell) !== undefined }"
        >
          <template v-if="bareOf(cell) !== undefined">{{ bareOf(cell) }}</template>
          <span
            v-else-if="pieceOf(cell) !== undefined"
            :class="pieceClassOf(cell)"
            :aria-hidden="pieceHiddenOf(cell)"
            >{{ pieceOf(cell) }}</span
          >
          <slot
            v-else
            :name="slotOf(cell)"
            :column="cell.key"
            :merge="leadOf(cell)"
            :revision="ownRevision"
            :position="position"
            :icon="paints?.get(cell.key)?.icon"
          />
        </div>
        <NuiTableResizer
          v-if="resizerOf(cell)"
          v-bind="resizerOf(cell)"
          @grab="emit('resize', handleOf(cell), $event, position)"
          @reset="emit('resetSize', handleOf(cell), position)"
        />
      </component>
    </template>
  </tr>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import NuiTableResizer from './NuiTableResizer.vue';
import { inSpans } from './table-ranges';
import {
  NuiTablePin,
  TableCellSpanKind,
  TablePlacementKind,
  TableRowPart,
  type NuiTableResizerProps,
  type NuiTableRowProps,
  type TableCellLayout,
  type NuiTableCellIcon,
  type TableDataCell,
  type TableLeadSpan,
  type TableRangeSegment,
  type TableRowRanges,
} from './table.types';
import { ReorderAxis } from '@numior/primitives';
import { TableSortDirection } from '../engine';

const {
  cells,
  rowIndex,
  part = TableRowPart.Body,
  wraps = true,
  position,
  paint,
  active = 0,
  revision,
  revisionOf,
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
  head,
  plainText,
} = defineProps<NuiTableRowProps>();

const emit = defineEmits<{
  resize: [key: string, event: PointerEvent, position: number | undefined];
  resetSize: [key: string, position: number | undefined];
}>();

defineSlots<{
  default(props: {
    column: string;
    merge: TableLeadSpan | undefined;
    revision: number;
    position: number | undefined;
    icon: NuiTableCellIcon | undefined;
  }): unknown;
  utility(props: { column: string; position: number | undefined }): unknown;
}>();

const shownCells = computed(() =>
  spans === undefined
    ? cells.cells
    : cells.cells.filter((cell) => spans.get(cell.key)?.kind !== TableCellSpanKind.Covered),
);

const leadOf = (cell: TableCellLayout): TableLeadSpan | undefined => {
  const span = spans?.get(cell.key);

  return span?.kind === TableCellSpanKind.Lead ? span : undefined;
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

const heading = computed(() => part === TableRowPart.Head || part === TableRowPart.Band);

const headScope = computed(() => (part === TableRowPart.Head ? 'col' : 'colgroup'));

const tagOf = (cell: TableCellLayout): 'th' | 'td' =>
  heading.value || cell.kind === TablePlacementKind.Rowhead ? 'th' : 'td';

const roleOf = (cell: TableDataCell): 'columnheader' | 'rowheader' | 'gridcell' => {
  if (heading.value) {
    return 'columnheader';
  }
  return cell.kind === TablePlacementKind.Rowhead ? 'rowheader' : 'gridcell';
};

const scopeOf = (cell: TableDataCell): 'col' | 'colgroup' | 'row' | undefined => {
  if (heading.value) {
    return headScope.value;
  }
  return cell.kind === TablePlacementKind.Rowhead ? 'row' : undefined;
};

const markedOf = (cell: TableDataCell): boolean =>
  cell.kind === TablePlacementKind.Rowhead
    ? ranged !== undefined
    : marks !== undefined && inSpans(marks, cell.colIndex - 1);

const sticky = computed(
  () => part === TableRowPart.Head || part === TableRowPart.Band || part === TableRowPart.Pinned,
);

const hiddenRow = computed(() => (part === TableRowPart.Skeleton ? true : undefined));

const shownIndex = computed(() => (hiddenRow.value ? undefined : rowIndex));

const busy = computed(() => loading || undefined);

const wrapsText = computed(
  () => part === TableRowPart.Body || (part === TableRowPart.Foot && wraps),
);

const rowClass = computed(() => [
  `nui-table__row--${part}`,
  {
    'nui-table__row--group': group !== undefined,
    'nui-table__row--expanded': expanded === true,
    'nui-table__row--selected': selected === true,
    'nui-table__row--odd': stripe,
    'nui-table__row--dragging': dragging,
    'nui-table__row--frozen': frozen !== undefined,
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
  'nui-table__cell--pin-start': cell.pin === NuiTablePin.Start,
  'nui-table__cell--pin-end': cell.pin === NuiTablePin.End,
  'nui-table__cell--edge': cell.edge,
});

const hitsIn = (segments: TableRowRanges | undefined, visual: number): TableRangeSegment[] =>
  segments === undefined
    ? []
    : segments.filter((segment) => visual >= segment.from && visual <= segment.to);

const hitsOf = (cell: TableDataCell): TableRangeSegment[] =>
  cell.kind === TablePlacementKind.Data ? hitsIn(ranged, cell.colIndex - 1) : [];

const touches = (segments: TableRowRanges | undefined, from: number, to: number): boolean =>
  segments?.some((segment) => segment.from <= to && segment.to >= from) === true;

const coversAll = (segments: TableRowRanges | undefined, from: number, to: number): boolean => {
  for (let col = from; col <= to; col += 1) {
    if (hitsIn(segments, col).length === 0) {
      return false;
    }
  }
  return true;
};

const leadRangeClass = (
  lead: TableLeadSpan,
  visual: number,
): Record<string, boolean> | undefined => {
  const top = position ?? lead.row;
  const last = visual + lead.span - 1;
  const rows = Array.from({ length: lead.rowspan }, (_, index) => rangedAt?.(top + index));

  return rows.some((segments) => touches(segments, visual, last))
    ? {
        'nui-table__cell--ranged': true,
        'nui-table__cell--range-top': !coversAll(rangedAt?.(top - 1), visual, last),
        'nui-table__cell--range-bottom': !coversAll(rangedAt?.(top + lead.rowspan), visual, last),
        'nui-table__cell--range-start': rows.some(
          (segments) => !coversAll(segments, visual - 1, visual - 1),
        ),
        'nui-table__cell--range-end': rows.some(
          (segments) => !coversAll(segments, last + 1, last + 1),
        ),
      }
    : undefined;
};

const plainRangeClass = (cell: TableDataCell): Record<string, boolean> | undefined => {
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

const rangeClass = (cell: TableDataCell): Record<string, boolean> | undefined => {
  const lead = cell.kind === TablePlacementKind.Data ? leadOf(cell) : undefined;

  return lead === undefined ? plainRangeClass(cell) : leadRangeClass(lead, cell.colIndex - 1);
};

const cellSelected = (cell: TableDataCell): 'true' | undefined =>
  rangeClass(cell) === undefined ? undefined : 'true';

const ownRevision = computed(() => (position === undefined ? 0 : (revisionOf?.(position) ?? 0)));

const paints = computed(() => {
  void revision;
  void ownRevision.value;
  return position === undefined ? undefined : paint?.(position, spans);
});

const plainTexts = computed((): ReadonlyMap<string, string> | undefined => {
  void revision;
  void ownRevision.value;

  if (plainText === undefined || position === undefined) {
    return undefined;
  }
  return shownCells.value.reduce((texts, cell) => {
    const text =
      cell.kind === TablePlacementKind.Data &&
      leadOf(cell) === undefined &&
      paints.value?.get(cell.key)?.icon === undefined
        ? plainText(position, cell.key)
        : undefined;

    if (text !== undefined) {
      texts.set(cell.key, text);
    }
    return texts;
  }, new Map<string, string>());
});

const plainOf = (cell: TableCellLayout): string | undefined => plainTexts.value?.get(cell.key);

const spillOf = (cell: TableCellLayout): string | undefined => paints.value?.get(cell.key)?.spill;

const pieceOf = (cell: TableCellLayout): string | undefined => spillOf(cell) ?? plainOf(cell);

const bareOf = (cell: TableCellLayout): string | undefined =>
  paints.value?.get(cell.key)?.flows === true ? undefined : plainOf(cell);

const pieceClassOf = (cell: TableCellLayout): string =>
  spillOf(cell) === undefined ? 'nui-table__text' : 'nui-table__spill';

const pieceHiddenOf = (cell: TableCellLayout): 'true' | undefined =>
  spillOf(cell) === undefined ? undefined : 'true';

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
    'nui-table__cell--sortable': head?.(cell.key)?.sortable === true,
    'nui-table__cell--dragging': head?.(cell.key)?.dragging === true,
  },
];

const slotOf = (cell: TableDataCell): 'default' | 'utility' =>
  cell.kind === TablePlacementKind.Data ? 'default' : 'utility';

const handleOf = (cell: TableDataCell): string => cell.handle ?? cell.key;

const resizerOf = (cell: TableDataCell): NuiTableResizerProps | undefined => {
  if (cell.kind === TablePlacementKind.Rowhead) {
    return sizable ? { axis: ReorderAxis.Y, active: sizing } : undefined;
  }
  const state = heading.value ? head?.(handleOf(cell)) : undefined;

  return state?.resizable === true
    ? { start: cell.pin === NuiTablePin.End, active: state.resizing }
    : undefined;
};

const tabindexOf = (colIndex: number): number | undefined => {
  if (part === TableRowPart.Band || part === TableRowPart.Skeleton) {
    return undefined;
  }
  return colIndex === active ? 0 : -1;
};

const ariaSortOf = (key: string): 'ascending' | 'descending' | undefined => {
  const state = head?.(key);

  if (state?.primary !== true) {
    return undefined;
  }
  return state.direction === TableSortDirection.Desc ? 'descending' : 'ascending';
};
</script>
