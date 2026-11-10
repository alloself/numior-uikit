<template>
  <NuiTable
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
  >
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
import { NuiTable, type NuiTableFilters, type NuiTableSort } from '@numior/table';
import { computed } from 'vue';
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
import type { NuiContentTableProps } from './content-table.types';

defineOptions({ inheritAttrs: false });

const { node, editable = false, locale, cells } = defineProps<NuiContentTableProps>();

const emit = defineEmits<{
  change: [row: NuiContentTableRow, column: string, value: NuiContentCellValue];
  sort: [sort: readonly NuiContentTableSort[]];
  filters: [filters: readonly NuiContentColumnFilter[]];
}>();

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
</script>
