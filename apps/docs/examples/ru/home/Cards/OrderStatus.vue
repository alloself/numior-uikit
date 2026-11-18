<template>
  <NuiCard v-if="order">
    <NuiCardHeader>
      <NuiCardTitle>Заказ № {{ order.id }}</NuiCardTitle>
      <NuiCardDescription>{{ order.customer }}, {{ order.city }}</NuiCardDescription>
      <template #actions>
        <NuiBadge tone="primary">{{ ORDER_STATUSES[order.status] }}</NuiBadge>
      </template>
    </NuiCardHeader>
    <NuiCardContent>
      <NuiStepper
        v-model="step"
        :steps="stepsOf(order)"
        orientation="vertical"
        :linear="false"
        label="Путь заказа"
      />
    </NuiCardContent>
  </NuiCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiBadge,
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardHeader,
  NuiCardTitle,
  NuiStepper,
  type NuiStepperStepDescriptor,
} from '@numior/kit';
import { DELIVERIES, ORDER_STATUSES, PAYMENTS, orders, type Order } from '#demo/orders';

const dayFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

const order = orders.find((entry) => entry.status === 'shipped');

const stepsOf = (shown: Order): NuiStepperStepDescriptor[] => [
  {
    value: 'placed',
    label: 'Оформлен',
    description: dayFormat.format(new Date(shown.date)),
    status: 'complete',
  },
  { value: 'paid', label: 'Оплачен', description: PAYMENTS[shown.payment], status: 'complete' },
  { value: 'shipped', label: 'Передан в доставку', description: DELIVERIES[shown.delivery] },
  { value: 'delivered', label: 'Доставлен' },
];

const step = ref('shipped');
</script>
