<template>
  <div class="flex flex-col gap-3">
    <NuiToggleGroup v-model:values="deliveries" :items="methods" multiple label="Способ доставки" />
    <p class="m-0 text-sm text-muted-foreground">{{ summary }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiToggleGroup } from '@numior/vue';
import { DELIVERIES, orders } from '#demo/orders';

const deliveries = ref(['courier', 'pickup']);

const methods = Object.entries(DELIVERIES).map(([value, label]) => ({ value, label }));

const shown = computed(() =>
  orders.reduce((count, order) => count + Number(deliveries.value.includes(order.delivery)), 0),
);

const summary = computed(() => `Показываем ${shown.value} из ${orders.length} заказов`);
</script>
