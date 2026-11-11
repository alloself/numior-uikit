<template>
  <section v-if="order" class="w-full max-w-md rounded-lg border bg-surface-elevated p-4 shadow-sm">
    <header class="flex items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <NuiAvatar :name="order.customer" size="sm" />
        <div class="min-w-0">
          <p class="m-0 truncate text-sm font-medium">{{ order.customer }}</p>
          <p class="m-0 text-xs text-muted-foreground">Заказ № {{ order.id }} · {{ order.city }}</p>
        </div>
      </div>
      <NuiBadge :tone="TONES[order.status]">{{ ORDER_STATUSES[order.status] }}</NuiBadge>
    </header>
    <ul class="my-4 flex list-none flex-col gap-2 p-0 text-sm">
      <li v-for="line in order.lines" :key="line.sku" class="flex justify-between gap-3">
        <span class="truncate">{{ line.name }} × {{ line.quantity }}</span>
        <span class="tabular-nums text-muted-foreground">
          {{ money.format(line.price * line.quantity) }}
        </span>
      </li>
    </ul>
    <footer class="flex items-center justify-between gap-3 border-t pt-4">
      <span class="text-lg font-semibold tabular-nums">{{ money.format(order.total) }}</span>
      <div class="flex gap-2">
        <NuiButton variant="outline" tone="neutral">Счёт</NuiButton>
        <NuiButton>Повторить заказ</NuiButton>
      </div>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { NuiAvatar, NuiBadge, NuiButton, type NuiTone } from '@numior/vue';
import { ORDER_STATUSES, orders, type OrderStatus } from '#demo/orders';

const TONES: Record<OrderStatus, NuiTone> = {
  pending: 'warning',
  paid: 'info',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'neutral',
};

const [order] = orders;

const money = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});
</script>
