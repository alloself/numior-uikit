<template>
  <div class="w-full h-80 overflow-hidden rounded-md border bg-surface">
    <NuiSplitter v-model:ratio="ratio" :min="0.3" :max="0.7" class="h-full">
      <template #start>
        <NuiList v-model="selected" :items="options" selectable="single" label="Заказы" />
      </template>
      <template #end>
        <div v-if="order" class="flex flex-col gap-2 p-4">
          <h3 class="m-0 text-base font-semibold">Заказ {{ order.id }}</h3>
          <p class="m-0 text-sm text-muted-foreground">
            {{ order.customer }}, {{ order.city }}. {{ ORDER_STATUSES[order.status] }}.
          </p>
          <p v-for="line in order.lines" :key="line.sku" class="m-0 text-sm">
            {{ line.name }} × {{ line.quantity }}
          </p>
          <p class="m-0 text-sm font-medium">{{ money.format(order.total) }}</p>
        </div>
      </template>
    </NuiSplitter>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiList, NuiSplitter, type NuiOption } from '@numior/vue';
import { ORDER_STATUSES, orders } from '#demo/orders';

const money = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

const options: NuiOption<number>[] = orders.map((entry) => ({
  value: entry.id,
  label: `Заказ ${entry.id}`,
  description: entry.customer,
}));

const ratio = ref(0.4);
const selected = ref<number | null>(20403);

const order = computed(() => orders.find((entry) => entry.id === selected.value));
</script>
