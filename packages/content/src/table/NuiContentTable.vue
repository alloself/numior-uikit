<template>
  <NuiTable
    ref="table"
    :sort="sort"
    :filters="filters"
    :columns="columns"
    :rows="data.rows"
    :get-key="keyOf"
    :locale="locale"
    :column-menu="editable"
    gridlines
    v-bind="$attrs"
    @update:sort="onSort"
    @update:filters="onFilters"
    @update:active="onActive"
  >
    <template v-if="peerFrames.length > 0" #overlay="{ rectOf }">
      <NuiTablePeers :peers="peerFrames" :rect-of="rectOf" />
    </template>
    <template
      v-for="drawn in drawnColumns"
      :key="drawn.column.id"
      #[`cell-${drawn.column.id}`]="{ row }"
    >
      <component
        :is="drawn.view"
        :value="row.cells[drawn.index] ?? null"
        :row="row"
        :column="drawn.column"
        :label="`${drawn.column.name}: ${labelOf(row)}`"
        :editable="editable"
        @change="(value: NuiContentCellValue) => emit('change', row, drawn.column.id, value)"
      />
    </template>
  </NuiTable>
</template>

<script setup lang="ts">
import {
  NuiTable,
  NuiTablePeers,
  type NuiTableCellPosition,
  type NuiTableExposed,
  type NuiTableFilters,
  type NuiTablePeer,
  type NuiTableSort,
} from '@numior/table';
import { computed, shallowRef, useTemplateRef, watch } from 'vue';
import { contentTableData } from '../content/content-table';
import type {
  NuiContentCellValue,
  NuiContentTableRow,
  NuiContentTableSort,
} from '../content/content.types';
import { contentCellViews } from './content-cell-views';
import { contentTableColumns } from './content-table-columns';
import {
  contentFiltersOf,
  contentSortOf,
  tableFiltersOf,
  tableSortOf,
  type NuiContentColumnFilter,
} from './content-table-view';
import type { NuiContentTableCell, NuiContentTableProps } from './content-table.types';

defineOptions({ inheritAttrs: false });

const { node, editable = false, locale, cells, peers = [] } = defineProps<NuiContentTableProps>();

const emit = defineEmits<{
  change: [row: NuiContentTableRow, column: string, value: NuiContentCellValue];
  sort: [sort: readonly NuiContentTableSort[]];
  filters: [filters: readonly NuiContentColumnFilter[]];
  cell: [cell: NuiContentTableCell | undefined];
}>();

const table = useTemplateRef<NuiTableExposed>('table');
const active = shallowRef<NuiTableCellPosition>();

const data = computed(() => contentTableData(node));
const columns = computed(() => contentTableColumns(data.value.columns, editable));
const views = computed(() => ({ ...contentCellViews, ...cells }));

const drawnColumns = computed(() =>
  data.value.columns.flatMap((column, index) => {
    const view = views.value[column.type];

    return view === undefined ? [] : [{ column, index, view }];
  }),
);

const sort = computed(() => tableSortOf(data.value.sort));
const filters = computed(() => tableFiltersOf(data.value.columns));

const keyOf = (row: NuiContentTableRow): string => row.id;

const sameCell = (
  left: NuiContentTableCell | undefined,
  right: NuiContentTableCell | undefined,
): boolean => left?.row === right?.row && left?.column === right?.column;

const activeCell = computed<NuiContentTableCell | undefined>((previous) => {
  const key = active.value === undefined ? undefined : table.value?.keyOf(active.value);
  const next = key === undefined ? undefined : { row: String(key.row), column: key.column };

  return sameCell(previous, next) ? previous : next;
});

const peerFrames = computed(() =>
  peers.reduce<NuiTablePeer[]>((frames, peer) => {
    const cell = table.value?.positionOf({ row: peer.row, column: peer.column });

    if (cell !== undefined) {
      frames.push({
        key: peer.key,
        name: peer.name,
        colour: peer.colour,
        cell: { from: cell, to: cell },
      });
    }

    return frames;
  }, []),
);

const labelOf = (row: NuiContentTableRow): string => {
  const [first] = row.cells;

  return first === null || first === undefined ? '' : String(first);
};

const onSort = (value: NuiTableSort): void => {
  emit('sort', contentSortOf(value));
};

const onFilters = (value: NuiTableFilters): void => {
  emit('filters', contentFiltersOf(value));
};

const onActive = (value: NuiTableCellPosition | undefined): void => {
  active.value = value;
};

watch(activeCell, (cell) => {
  emit('cell', cell);
});
</script>
