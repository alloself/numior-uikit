<template>
  <NuiButton variant="outline" icon="filter" @click="open = true">Filters</NuiButton>
  <NuiDrawer v-model:open="open" title="Filters" description="September orders">
    <div class="flex flex-col gap-5">
      <NuiCheckboxGroup v-model="statuses" :options="statusOptions" label="Status" />
      <NuiCheckboxGroup v-model="deliveries" :options="deliveryOptions" label="Delivery" />
      <NuiSelect
        v-model="manager"
        :options="managers"
        label="Manager"
        placeholder="All managers"
        clearable
      />
    </div>
    <template #footer>
      <NuiButton variant="ghost" tone="neutral" @click="reset">Reset</NuiButton>
      <NuiButton @click="open = false">Apply</NuiButton>
    </template>
  </NuiDrawer>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { uniq } from 'lodash-es';
import { NuiButton, NuiCheckboxGroup, NuiDrawer, NuiSelect } from '@numior/vue';
import { DELIVERIES, ORDER_STATUSES, orders } from '#demo/orders';

const open = ref(false);
const statuses = ref(['pending', 'paid']);
const deliveries = ref<string[]>([]);
const manager = ref<string | null>(null);

const statusOptions = Object.entries(ORDER_STATUSES).map(([value, label]) => ({ value, label }));
const deliveryOptions = Object.entries(DELIVERIES).map(([value, label]) => ({ value, label }));

const managers = uniq(orders.map((order) => order.manager)).map((name) => ({
  value: name,
  label: name,
}));

const reset = (): void => {
  statuses.value = [];
  deliveries.value = [];
  manager.value = null;
};
</script>
