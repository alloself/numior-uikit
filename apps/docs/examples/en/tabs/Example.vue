<template>
  <NuiTabs v-model="status" :tabs="statuses">
    <template #panel="{ tab }">
      <ul class="flex flex-col gap-1 text-sm">
        <li v-for="order in ordersIn(tab.value)" :key="order.id">
          Order {{ order.id }}, {{ order.customer }}
        </li>
      </ul>
    </template>
  </NuiTabs>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTabs, type NuiTabDescriptor } from '@numior/kit';
import { orders, type Order } from '#demo/orders';

const status = ref('shipped');

const statuses: NuiTabDescriptor[] = [
  { value: 'paid', label: 'Paid' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
];

const ordersIn = (value: string): Order[] => orders.filter((order) => order.status === value);
</script>
