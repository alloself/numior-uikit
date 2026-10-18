<template>
  <NuiTable
    :columns="STAFF_COLUMNS"
    :rows="reports"
    :get-key="keyOf"
    cell-selection
    :label="`Подчинённые: ${row.name}`"
  />
</template>

<script setup lang="ts">
import { NuiTable, type NuiTableDetailSlot } from '../../src';
import { staff, STAFF_COLUMNS, type Staff } from '../support/staff';

const { row } = defineProps<NuiTableDetailSlot<Staff>>();

const reports = staff(3);

const keyOf = (report: Staff): number => report.id;
</script>
