<template>
  <div class="flex flex-col gap-3">
    <div class="flex gap-2">
      <NuiButton size="sm" variant="outline" tone="neutral" @click="download"
        >Download CSV</NuiButton
      >
    </div>
    <NuiTable
      ref="export-table"
      :columns="columns"
      :rows="latest"
      :get-key="keyOf"
      caption="Orders this week"
    />
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { NuiButton } from '@numior/kit';
import { NuiTable, type NuiTableColumn, type NuiTableExposed } from '@numior/kit/table';
import { orders, type Order } from '#demo/orders';

const latest = orders.slice(0, 5);

const columns: NuiTableColumn<Order>[] = [
  {
    key: 'id',
    label: '#',
    type: 'number',
    width: 96,
    value: (row) => row.id,
    format: (value) => String(value),
  },
  {
    key: 'customer',
    label: 'Customer',
    type: 'text',
    width: 160,
    flex: 1,
    value: (row) => row.customer,
  },
  { key: 'city', label: 'City', type: 'text', width: 120, value: (row) => row.city },
  { key: 'total', label: 'Total', type: 'number', width: 120, value: (row) => row.total },
];

const keyOf = (order: Order): number => order.id;
const exportTable = useTemplateRef<NuiTableExposed>('export-table');

const download = async (): Promise<void> => {
  const text = await exportTable.value?.exportCsv({ separator: ',' });

  if (text === undefined) {
    return;
  }
  const url = URL.createObjectURL(new Blob(['\uFEFF', text], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');

  link.href = url;
  link.download = 'orders.csv';
  link.click();
  URL.revokeObjectURL(url);
};
</script>
