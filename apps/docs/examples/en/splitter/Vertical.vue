<template>
  <div class="w-full h-80 overflow-hidden rounded-md border bg-surface">
    <NuiSplitter v-model:ratio="ratio" orientation="vertical" class="h-full">
      <template #start>
        <div v-if="order" class="flex flex-col gap-1 p-4">
          <h3 class="m-0 text-base font-semibold">Order {{ order.id }}</h3>
          <p class="m-0 text-sm text-muted-foreground">
            {{ order.customer }}, {{ order.city }}. {{ DELIVERIES[order.delivery] }},
            {{ ORDER_STATUSES[order.status].toLowerCase() }}.
          </p>
        </div>
      </template>
      <template #end>
        <NuiList :items="lines" label="Order items" />
      </template>
    </NuiSplitter>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiList, NuiSplitter, type NuiListEntry } from '@numior/kit';
import { DELIVERIES, ORDER_STATUSES, orders } from '#demo/orders';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const order = orders.find((entry) => entry.id === 20408);

const lines: NuiListEntry[] = (order?.lines ?? []).map((line) => ({
  key: line.sku,
  label: line.name,
  description: `${line.quantity} × ${money.format(line.price)}`,
}));

const ratio = ref(0.4);
</script>
