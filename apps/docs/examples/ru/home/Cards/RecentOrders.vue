<template>
  <NuiCard>
    <NuiCardHeader>
      <NuiCardTitle>Последние заказы</NuiCardTitle>
    </NuiCardHeader>
    <NuiCardContent class="flex flex-col gap-3">
      <NuiToggleGroup
        v-model="filter"
        :items="filters"
        variant="segmented"
        size="sm"
        required
        label="Какие заказы показать"
      />
      <NuiTable
        :columns="columns"
        :rows="rows"
        :get-key="keyOf"
        :column-menu="false"
        label="Последние заказы"
        size="sm"
      >
        <template #cell-status="{ row }">
          <NuiBadge :tone="STATUS_TONES[row.status]" size="sm">
            {{ ORDER_STATUSES[row.status] }}
          </NuiBadge>
        </template>
      </NuiTable>
    </NuiCardContent>
  </NuiCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  NuiBadge,
  NuiCard,
  NuiCardContent,
  NuiCardHeader,
  NuiCardTitle,
  NuiToggleGroup,
  type NuiToggleItem,
  type NuiTone,
} from '@numior/kit';
import { NuiTable, type NuiTableColumn } from '@numior/kit/table';
import { ORDER_STATUSES, orders, type Order, type OrderStatus } from '#demo/orders';

const STATUS_TONES: Record<OrderStatus, NuiTone> = {
  pending: 'warning',
  paid: 'info',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'neutral',
};

const ALL = 'all';
const SHOWN = 5;

const money = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

const filters: readonly NuiToggleItem[] = [
  { value: ALL, label: 'Все' },
  { value: 'shipped', label: 'В доставке' },
  { value: 'delivered', label: 'Доставлены' },
];

const columns: NuiTableColumn<Order>[] = [
  {
    key: 'customer',
    label: 'Клиент',
    type: 'text',
    width: 140,
    flex: 1,
    value: (row) => row.customer,
  },
  {
    key: 'status',
    label: 'Статус',
    type: 'text',
    width: 130,
    value: (row) => ORDER_STATUSES[row.status],
  },
  {
    key: 'total',
    label: 'Сумма',
    type: 'number',
    width: 104,
    value: (row) => row.total,
    format: (value) => money.format(value),
  },
];

const filter = ref<string | null>(ALL);

const rows = computed(() =>
  orders
    .filter((order) => filter.value === ALL || order.status === filter.value)
    .toReversed()
    .slice(0, SHOWN),
);

const keyOf = (order: Order): number => order.id;
</script>
