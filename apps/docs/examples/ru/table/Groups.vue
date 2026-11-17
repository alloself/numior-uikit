<template>
  <div class="flex flex-col gap-3">
    <NuiSelect v-model="grouping" :options="groupings" label="Группировка" class="max-w-xs" />
    <NuiTable
      v-model:group-by="groupBy"
      v-model:expanded="expanded"
      :columns="columns"
      :rows="orders"
      :get-key="keyOf"
      caption="Заказы по группам"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiSelect, type NuiOptionSource } from '@numior/kit';
import { NuiTable, type NuiTableColumnDef, type TableNodeId } from '@numior/kit/table';
import { ORDER_STATUSES, orders, type Order } from '#demo/orders';

const money = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

const columns: NuiTableColumnDef<Order>[] = [
  {
    key: 'order',
    label: 'Заказ',
    children: [
      {
        key: 'id',
        label: '№',
        type: 'number',
        width: 100,
        reorderable: false,
        value: (row) => row.id,
        format: (value) => String(value),
      },
      {
        key: 'status',
        label: 'Статус',
        type: 'text',
        width: 200,
        value: (row) => ORDER_STATUSES[row.status],
      },
    ],
  },
  {
    key: 'buyer',
    label: 'Покупатель',
    children: [
      {
        key: 'customer',
        label: 'Клиент',
        type: 'text',
        width: 150,
        flex: 1,
        value: (row) => row.customer,
      },
    ],
  },
  {
    key: 'total',
    label: 'Сумма',
    type: 'number',
    width: 130,
    aggregate: 'sum',
    value: (row) => row.total,
    format: (value) => money.format(value),
  },
];

const groupings: NuiOptionSource<string> = [
  { value: 'none', label: 'Без группировки' },
  { value: 'status', label: 'По статусу' },
];

const keyOf = (order: Order): number => order.id;
const groupBy = ref<string[]>(['status']);
const expanded = ref<TableNodeId[]>([]);

const grouping = computed({
  get: (): string => groupBy.value[0] ?? 'none',
  set: (value: string | null) => {
    groupBy.value = value === null || value === 'none' ? [] : [value];
    expanded.value = [];
  },
});
</script>
