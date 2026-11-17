<template>
  <section
    v-if="order"
    class="flex w-full max-w-md flex-col gap-4 rounded-lg border bg-surface-elevated p-5 shadow-sm"
  >
    <header class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="m-0 text-lg font-semibold">Заказ № {{ order.id }}</h3>
        <p class="m-0 truncate text-sm text-muted-foreground">
          {{ order.customer }} · {{ order.city }}
        </p>
      </div>
      <NuiBadge tone="primary" class="shrink-0">{{ ORDER_STATUSES[order.status] }}</NuiBadge>
    </header>
    <NuiList
      v-model="delivery"
      :items="deliveries"
      selectable="single"
      variant="outline"
      label="Доставка"
    />
    <NuiInput v-model="comment" label="Комментарий курьеру" placeholder="Код домофона, этаж" />
    <NuiSwitch v-model="call" label="Позвонить за час до приезда" />
    <footer class="flex justify-end gap-2">
      <NuiButton variant="outline" tone="neutral">Счёт</NuiButton>
      <NuiButton>Подтвердить заказ</NuiButton>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiBadge,
  NuiButton,
  NuiInput,
  NuiList,
  NuiSwitch,
  type NuiListSource,
  type NuiOption,
} from '@numior/kit';
import { DELIVERIES, ORDER_STATUSES, orders, type Delivery } from '#demo/orders';

const order = orders.find((entry) => entry.status === 'paid');

const delivery = ref<Delivery | null>('courier');
const comment = ref('');
const call = ref(true);

const deliveries: NuiListSource<NuiOption<Delivery>> = [
  {
    label: 'По городу',
    items: [
      { value: 'courier', label: DELIVERIES.courier },
      { value: 'pickup', label: DELIVERIES.pickup },
    ],
  },
  {
    label: 'В другие города',
    items: [{ value: 'post', label: DELIVERIES.post }],
  },
];
</script>
