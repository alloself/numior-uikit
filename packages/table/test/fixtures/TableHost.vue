<template>
  <div :dir="dir">
    <NuiTable
      :ref="onTable"
      v-bind="{ ...props, ...listeners }"
      v-model:sort="sort"
      v-model:filters="filters"
      v-model:quick="quick"
      v-model:group-by="groupBy"
      v-model:expanded="expanded"
      v-model:pins="pins"
      v-model:hidden="hidden"
      v-model:widths="widths"
      v-model:column-order="columnOrder"
      v-model:selected="selected"
      v-model:page="page"
      v-model:page-size="pageSize"
      v-model:ranges="ranges"
      v-model:row-heights="rowHeights"
      v-model:active="active"
      v-model:draft="draft"
      :columns="columns"
      :rows="rows"
    >
      <template v-for="(view, name) in slots" :key="name" #[name]="scope">
        <component :is="view" v-bind="scope" />
      </template>
    </NuiTable>
  </div>
</template>

<script setup lang="ts" generic="T">
import { NuiTable, type NuiTableColumnDef } from '../../src';
import type { TableHostListeners, TableHostState, TableSlotViews } from '../drivers/table';

const { columns, state, listeners, dir, slots, onTable } = defineProps<{
  columns: readonly NuiTableColumnDef<T>[];
  state: TableHostState<T>;
  listeners: TableHostListeners<T>;
  dir: 'ltr' | 'rtl';
  slots: TableSlotViews;
  onTable: (table: unknown) => void;
}>();

const {
  rows,
  props,
  sort,
  filters,
  quick,
  groupBy,
  expanded,
  pins,
  hidden,
  widths,
  columnOrder,
  selected,
  page,
  pageSize,
  ranges,
  rowHeights,
  active,
  draft,
} = state;
</script>
