<template>
  <NuiCollapsible label="Items in order 20408" variant="card" class="w-full max-w-sm">
    <ul class="m-0 flex list-none flex-col gap-1 p-0">
      <li v-for="line in lines" :key="line.sku">
        {{ line.name }} × {{ line.quantity }}, {{ money.format(line.price * line.quantity) }}
      </li>
    </ul>
  </NuiCollapsible>
</template>

<script setup lang="ts">
import { NuiCollapsible } from '@numior/kit';
import { orders } from '#demo/orders';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const lines = orders.find((order) => order.id === 20408)?.lines ?? [];
</script>
