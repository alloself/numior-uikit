<template>
  <NuiTable v-bind="table">
    <template v-for="(view, name) in slots" :key="name" #[name]="scope">
      <component :is="view" v-bind="scope" />
    </template>
  </NuiTable>
</template>

<script setup lang="ts" generic="T">
import { NuiTable, type NuiTableProps, type TableNodeId } from '../../src';
import type { TableSlotViews } from '../drivers/table';

const { table, slots } = defineProps<{
  table: NuiTableProps<T> & { expanded?: readonly TableNodeId[] };
  slots: TableSlotViews;
}>();
</script>
