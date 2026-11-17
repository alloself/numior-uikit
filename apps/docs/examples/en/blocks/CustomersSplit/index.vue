<template>
  <div class="flex h-dvh flex-col gap-4 p-6">
    <div class="flex flex-col gap-1">
      <h1 class="m-0 text-xl font-semibold tracking-tight">Customers</h1>
      <p class="m-0 text-sm text-muted-foreground">
        Pick a customer to see their contacts and recent orders
      </p>
    </div>
    <NuiSplitter
      v-if="wide"
      v-model:ratio="ratio"
      :min="0.25"
      :max="0.6"
      label="Customer list width"
      class="min-h-0 flex-1 rounded-lg border bg-surface"
    >
      <template #start>
        <CustomerList v-model="selected" v-model:query="query" :customers="found" />
      </template>
      <template #end>
        <CustomerCard v-if="customer" :customer="customer" :orders="history" />
        <NuiEmpty
          v-else
          icon="user"
          title="No customer selected"
          description="Pick a row in the list on the left."
        />
      </template>
    </NuiSplitter>
    <div v-else class="min-h-0 flex-1 rounded-lg border bg-surface">
      <CustomerCard
        v-if="customer && opened"
        :customer="customer"
        :orders="history"
        closable
        @close="opened = false"
      />
      <CustomerList
        v-else
        v-model="selected"
        v-model:query="query"
        :customers="found"
        @open="opened = true"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiEmpty, NuiSplitter, useMediaQuery } from '@numior/kit';
import { customers } from '#demo/customers';
import { ordersOf } from '#demo/many-orders';
import type { Order } from '#demo/orders';
import CustomerCard from './CustomerCard.vue';
import CustomerList from './CustomerList.vue';

const HISTORY_LIMIT = 5;

const all = ordersOf(160).toSorted((a, b) => b.date.localeCompare(a.date));
const wide = useMediaQuery('(min-width: 48rem)');

const ratio = ref(0.36);
const query = ref('');
const selected = ref<number | null>(customers[0]?.id ?? null);
const opened = ref(false);

const found = computed(() => {
  const needle = query.value.trim().toLowerCase();

  return customers.filter((entry) => `${entry.name} ${entry.city}`.toLowerCase().includes(needle));
});

const customer = computed(() => customers.find((entry) => entry.id === selected.value));

const history = computed(() => {
  const name = customer.value?.name;

  return all.reduce<Order[]>((recent, order) => {
    if (order.customer === name && recent.length < HISTORY_LIMIT) {
      recent.push(order);
    }

    return recent;
  }, []);
});
</script>
