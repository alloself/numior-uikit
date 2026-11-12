<template>
  <div class="flex w-full max-w-sm flex-col gap-3">
    <NuiSelect v-model="status" :options="statuses" label="Статус заказа" />
    <p class="text-sm text-muted-foreground">{{ next }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiSelect, type NuiOptionSource } from '@numior/vue';
import { ORDER_STATUSES, type OrderStatus } from '#demo/orders';

const NEXT_STEP: Record<OrderStatus, string> = {
  pending: 'Напомните покупателю об оплате.',
  paid: 'Передайте заказ на склад.',
  shipped: 'Заказ в пути, ждите подтверждения.',
  delivered: 'Заказ закрыт.',
  cancelled: 'Верните товар на склад.',
};

const status = ref<OrderStatus | null>('paid');

const statuses: NuiOptionSource<OrderStatus> = [
  { value: 'pending', label: ORDER_STATUSES.pending },
  { value: 'paid', label: ORDER_STATUSES.paid },
  { value: 'shipped', label: ORDER_STATUSES.shipped },
  { value: 'delivered', label: ORDER_STATUSES.delivered },
  { value: 'cancelled', label: ORDER_STATUSES.cancelled },
];

const next = computed(() => (status.value === null ? 'Выберите статус.' : NEXT_STEP[status.value]));
</script>
