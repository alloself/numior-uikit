<template>
  <div class="flex w-full max-w-sm flex-col gap-3">
    <NuiSelect v-model="status" :options="statuses" label="Order status" />
    <p class="text-sm text-muted-foreground">{{ next }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiSelect, type NuiOptionSource } from '@numior/kit';
import { ORDER_STATUSES, type OrderStatus } from '#demo/orders';

const NEXT_STEP: Record<OrderStatus, string> = {
  pending: 'Remind the customer to pay.',
  paid: 'Hand the order over to the warehouse.',
  shipped: 'The order is on its way.',
  delivered: 'The order is closed.',
  cancelled: 'Put the items back in stock.',
};

const status = ref<OrderStatus | null>('paid');

const statuses: NuiOptionSource<OrderStatus> = [
  { value: 'pending', label: ORDER_STATUSES.pending },
  { value: 'paid', label: ORDER_STATUSES.paid },
  { value: 'shipped', label: ORDER_STATUSES.shipped },
  { value: 'delivered', label: ORDER_STATUSES.delivered },
  { value: 'cancelled', label: ORDER_STATUSES.cancelled },
];

const next = computed(() => (status.value === null ? 'Pick a status.' : NEXT_STEP[status.value]));
</script>
