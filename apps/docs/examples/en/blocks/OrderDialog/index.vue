<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-4 p-6">
    <div class="flex flex-col gap-1">
      <h1 class="m-0 text-xl font-semibold tracking-tight">This week's orders</h1>
      <p class="m-0 text-sm text-muted-foreground">
        Open an order to change its status or refund it
      </p>
    </div>
    <NuiList variant="outline" label="This week's orders">
      <NuiListItem
        v-for="order in list"
        :key="order.id"
        :label="`#${order.id} · ${order.customer}`"
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
        <NuiList variant="outline" label="Order items">
          <NuiListItem
            v-for="line in current.lines"
            :key="line.sku"
            :label="line.name"
            :description="`${line.sku} · Qty ${line.quantity}`"
          >
            <template #trailing>{{ money.format(line.price * line.quantity) }}</template>
          </NuiListItem>
        </NuiList>
        <p class="m-0 flex items-center justify-between px-4 text-sm font-medium">
          <span>Total</span>
          <span>{{ money.format(current.total) }}</span>
        </p>
        <NuiSelect v-model="draft" :options="statuses" label="Status" />
      </div>
      <template #footer>
        <NuiButton
          variant="ghost"
          tone="error"
          :disabled="draft === 'cancelled'"
          @click="refunding = true"
        >
          Refund
        </NuiButton>
        <NuiButton @click="save">Save</NuiButton>
      </template>
    </NuiDialog>
    <NuiDialog
      v-model:open="refunding"
      :title="refundTitle"
      description="The customer gets the money back the same way, and the order is canceled."
      size="sm"
    >
      <template #footer>
        <NuiButton variant="ghost" tone="neutral" @click="refunding = false">Cancel</NuiButton>
        <NuiButton tone="error" :loading="busy" @click="refund">Refund</NuiButton>
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

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const day = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long' });

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

const title = computed(() => (current.value ? `Order #${current.value.id}` : ''));

const placed = computed(() =>
  current.value ? `Placed on ${day.format(new Date(current.value.date))}` : '',
);

const refundTitle = computed(() =>
  current.value ? `Refund ${money.format(current.value.total)}?` : '',
);

const facts = computed(() => {
  const order = current.value;

  if (order === undefined) {
    return [];
  }

  return [
    { term: 'Customer', value: order.customer },
    { term: 'City', value: order.city },
    { term: 'Delivery', value: DELIVERIES[order.delivery] },
    { term: 'Payment', value: PAYMENTS[order.payment] },
    { term: 'Manager', value: order.manager },
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
  toast.success(`Order #${order.id}: ${ORDER_STATUSES[status].toLowerCase()}`);
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
  toast.success(`Order #${order.id} is refunded`);
};
</script>
