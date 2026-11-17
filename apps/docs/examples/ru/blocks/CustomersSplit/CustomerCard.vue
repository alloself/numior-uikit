<template>
  <div class="flex h-full flex-col gap-5 overflow-auto p-5">
    <NuiButton
      v-if="closable"
      variant="ghost"
      tone="neutral"
      size="sm"
      icon="arrow-left"
      class="self-start"
      @click="emit('close')"
    >
      К списку
    </NuiButton>
    <div class="flex items-center gap-3">
      <NuiAvatar :name="customer.name" size="lg" />
      <div class="flex flex-col">
        <h2 class="m-0 text-lg font-semibold">{{ customer.name }}</h2>
        <p class="m-0 text-sm text-muted-foreground">{{ customer.city }}</p>
      </div>
    </div>
    <dl class="m-0 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
      <div class="flex flex-col gap-0.5">
        <dt class="text-muted-foreground">Почта</dt>
        <dd class="m-0">
          <NuiLink :href="`mailto:${customer.email}`">{{ customer.email }}</NuiLink>
        </dd>
      </div>
      <div v-for="fact in facts" :key="fact.term" class="flex flex-col gap-0.5">
        <dt class="text-muted-foreground">{{ fact.term }}</dt>
        <dd class="m-0 font-medium">{{ fact.value }}</dd>
      </div>
    </dl>
    <section class="flex flex-col gap-2">
      <h3 :id="historyId" class="m-0 text-sm font-medium text-muted-foreground">
        Последние заказы
      </h3>
      <NuiList variant="outline" :labelled-by="historyId" empty-label="Заказов за полгода не было">
        <NuiListItem
          v-for="order in orders"
          :key="order.id"
          :label="`№ ${order.id}`"
          :description="`${day.format(new Date(order.date))} · ${money.format(order.total)}`"
        >
          <template #trailing>
            <NuiBadge :tone="STATUS_TONES[order.status]" size="sm">
              {{ ORDER_STATUSES[order.status] }}
            </NuiBadge>
          </template>
        </NuiListItem>
      </NuiList>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue';
import {
  NuiAvatar,
  NuiBadge,
  NuiButton,
  NuiLink,
  NuiList,
  NuiListItem,
  type NuiTone,
} from '@numior/kit';
import type { Customer } from '#demo/customers';
import { ORDER_STATUSES, type Order, type OrderStatus } from '#demo/orders';

const { customer, closable = false } = defineProps<{
  customer: Customer;
  orders: readonly Order[];
  closable?: boolean;
}>();

const emit = defineEmits<{ close: [] }>();

const STATUS_TONES: Record<OrderStatus, NuiTone> = {
  pending: 'warning',
  paid: 'info',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'neutral',
};

const money = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

const day = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
const historyId = useId();

const facts = computed(() => [
  { term: 'Телефон', value: customer.phone },
  { term: 'Заказов', value: String(customer.orders) },
  { term: 'Потрачено', value: money.format(customer.spent) },
]);
</script>
