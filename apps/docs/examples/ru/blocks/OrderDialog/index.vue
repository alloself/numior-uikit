<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-4 p-6">
    <div class="flex flex-col gap-1">
      <h1 class="m-0 text-xl font-semibold tracking-tight">Заказы недели</h1>
      <p class="m-0 text-sm text-muted-foreground">
        Откройте заказ, чтобы поменять статус или вернуть деньги
      </p>
    </div>
    <NuiList variant="outline" label="Заказы недели">
      <NuiListItem
        v-for="order in list"
        :key="order.id"
        :label="`№ ${order.id} · ${order.customer}`"
        :description="`${order.city} · ${money.format(order.total)}`"
        interactive
        @click="show(order)"
      >
        <template #trailing>
          <NuiBadge :tone="STATUS_TONES[statusOf(order)]" size="sm">
            {{ ORDER_STATUSES[statusOf(order)] }}
          </NuiBadge>
        </template>
      </NuiListItem>
    </NuiList>
    <NuiDialog v-model:open="open" :title="title" :description="placed" size="lg">
      <div v-if="current" class="flex flex-col gap-5">
        <dl class="m-0 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div v-for="fact in facts" :key="fact.term" class="flex flex-col gap-0.5">
            <dt class="text-muted-foreground">{{ fact.term }}</dt>
            <dd class="m-0 font-medium">{{ fact.value }}</dd>
          </div>
        </dl>
        <NuiList variant="outline" label="Состав заказа">
          <NuiListItem
            v-for="line in current.lines"
            :key="line.sku"
            :label="line.name"
            :description="`${line.sku} · ${line.quantity} шт.`"
          >
            <template #trailing>{{ money.format(line.price * line.quantity) }}</template>
          </NuiListItem>
        </NuiList>
        <p class="m-0 flex items-center justify-between px-4 text-sm font-medium">
          <span>Итого</span>
          <span>{{ money.format(current.total) }}</span>
        </p>
        <NuiSelect v-model="draft" :options="statuses" label="Статус" />
      </div>
      <template #footer>
        <NuiButton
          variant="ghost"
          tone="error"
          :disabled="draft === 'cancelled'"
          @click="refunding = true"
        >
          Вернуть деньги
        </NuiButton>
        <NuiButton @click="save">Сохранить</NuiButton>
      </template>
    </NuiDialog>
    <NuiDialog
      v-model:open="refunding"
      :title="refundTitle"
      description="Деньги вернутся покупателю тем же способом, заказ будет отменён."
      size="sm"
    >
      <template #footer>
        <NuiButton variant="ghost" tone="neutral" @click="refunding = false">Отмена</NuiButton>
        <NuiButton tone="error" :loading="busy" @click="refund">Вернуть деньги</NuiButton>
      </template>
    </NuiDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import { promiseTimeout } from '@vueuse/core';
import {
  NuiBadge,
  NuiButton,
  NuiDialog,
  NuiList,
  NuiListItem,
  NuiSelect,
  useToast,
  type NuiTone,
} from '@numior/kit';
import {
  DELIVERIES,
  ORDER_STATUSES,
  PAYMENTS,
  orders,
  type Order,
  type OrderStatus,
} from '#demo/orders';

const STATUS_TONES: Record<OrderStatus, NuiTone> = {
  pending: 'warning',
  paid: 'info',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'neutral',
};

const STATUS_ORDER: readonly OrderStatus[] = [
  'pending',
  'paid',
  'shipped',
  'delivered',
  'cancelled',
];

const money = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

const day = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });

const list = orders.slice(0, 6);
const statuses = STATUS_ORDER.map((value) => ({ value, label: ORDER_STATUSES[value] }));
const toast = useToast();

const changed = ref<Partial<Record<number, OrderStatus>>>({});
const current = shallowRef<Order>();
const draft = ref<OrderStatus | null>(null);
const open = ref(false);
const refunding = ref(false);
const busy = ref(false);

const statusOf = (order: Order): OrderStatus => changed.value[order.id] ?? order.status;

const title = computed(() => (current.value ? `Заказ № ${current.value.id}` : ''));

const placed = computed(() =>
  current.value ? `Оформлен ${day.format(new Date(current.value.date))}` : '',
);

const refundTitle = computed(() =>
  current.value ? `Вернуть ${money.format(current.value.total)}?` : '',
);

const facts = computed(() => {
  const order = current.value;

  if (order === undefined) {
    return [];
  }

  return [
    { term: 'Покупатель', value: order.customer },
    { term: 'Город', value: order.city },
    { term: 'Доставка', value: DELIVERIES[order.delivery] },
    { term: 'Оплата', value: PAYMENTS[order.payment] },
    { term: 'Менеджер', value: order.manager },
  ];
});

const show = (order: Order): void => {
  current.value = order;
  draft.value = statusOf(order);
  open.value = true;
};

const setStatus = (order: Order, status: OrderStatus): void => {
  changed.value = { ...changed.value, [order.id]: status };
};

const save = (): void => {
  const order = current.value;

  if (order === undefined) {
    return;
  }

  const status = draft.value ?? statusOf(order);

  setStatus(order, status);
  open.value = false;
  toast.success(`Заказ № ${order.id}: ${ORDER_STATUSES[status].toLowerCase()}`);
};

const refund = async (): Promise<void> => {
  const order = current.value;

  if (order === undefined) {
    return;
  }

  busy.value = true;
  await promiseTimeout(600);
  busy.value = false;
  setStatus(order, 'cancelled');
  refunding.value = false;
  open.value = false;
  toast.success(`Деньги за заказ № ${order.id} вернутся покупателю`);
};
</script>
