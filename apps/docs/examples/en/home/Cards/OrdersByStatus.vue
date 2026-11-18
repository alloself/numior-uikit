<template>
  <NuiCard>
    <NuiCardHeader>
      <NuiCardTitle>Orders in two weeks</NuiCardTitle>
      <NuiCardDescription>Where each of the {{ orders.length }} orders is now</NuiCardDescription>
    </NuiCardHeader>
    <NuiCardContent class="flex flex-col gap-4">
      <div v-for="share in shares" :key="share.status" class="flex flex-col gap-2">
        <div class="flex justify-between text-sm">
          <span>{{ ORDER_STATUSES[share.status] }}</span>
          <span class="text-muted-foreground">{{ share.count }}</span>
        </div>
        <NuiProgress
          :value="share.count"
          :max="orders.length"
          :tone="share.tone"
          :label="ORDER_STATUSES[share.status]"
          :value-text="`${share.count} of ${orders.length}`"
        />
      </div>
    </NuiCardContent>
  </NuiCard>
</template>

<script setup lang="ts">
import { countBy } from 'lodash-es';
import {
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardHeader,
  NuiCardTitle,
  NuiProgress,
  type NuiTone,
} from '@numior/kit';
import { ORDER_STATUSES, orders, type OrderStatus } from '#demo/orders';

const SHOWN: readonly { status: OrderStatus; tone: NuiTone }[] = [
  { status: 'delivered', tone: 'success' },
  { status: 'shipped', tone: 'primary' },
  { status: 'paid', tone: 'info' },
  { status: 'pending', tone: 'warning' },
];

const counts = countBy(orders, (order) => order.status);

const shares = SHOWN.map((entry) => ({ ...entry, count: counts[entry.status] ?? 0 }));
</script>
