<template>
  <NuiCard v-if="order">
    <NuiCardHeader>
      <NuiCardTitle>Order #{{ order.id }}</NuiCardTitle>
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
        label="Order progress"
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

const dayFormat = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

const order = orders.find((entry) => entry.status === 'shipped');

const stepsOf = (shown: Order): NuiStepperStepDescriptor[] => [
  {
    value: 'placed',
    label: 'Placed',
    description: dayFormat.format(new Date(shown.date)),
    status: 'complete',
  },
  { value: 'paid', label: 'Paid', description: PAYMENTS[shown.payment], status: 'complete' },
  { value: 'shipped', label: 'Shipped', description: DELIVERIES[shown.delivery] },
  { value: 'delivered', label: 'Delivered' },
];

const step = ref('shipped');
</script>
