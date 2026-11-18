<template>
  <div class="@container">
    <div class="grid grid-cols-1 gap-4 @xl:grid-cols-2">
      <div class="flex flex-col gap-4">
        <NuiCard>
          <NuiCardHeader>
            <NuiCardTitle>New order</NuiCardTitle>
            <NuiCardDescription
              >The customer gets an email with the order number</NuiCardDescription
            >
          </NuiCardHeader>
          <NuiCardContent class="flex flex-col gap-4">
            <NuiSelect v-model="customer" :options="customerOptions" label="Customer" />
            <NuiSelect v-model="delivery" :options="deliveryOptions" label="Delivery" />
            <NuiCheckbox v-model="sms">Text the customer when the status changes</NuiCheckbox>
          </NuiCardContent>
          <NuiCardFooter class="flex justify-end gap-2">
            <NuiButton variant="outline" tone="neutral">Cancel</NuiButton>
            <NuiButton>Create order</NuiButton>
          </NuiCardFooter>
        </NuiCard>
        <NuiCard>
          <NuiCardHeader>
            <NuiCardTitle>Team</NuiCardTitle>
            <template #actions>
              <NuiButton variant="soft" size="sm" icon="plus">Invite</NuiButton>
            </template>
          </NuiCardHeader>
          <NuiCardContent class="flex flex-col gap-3">
            <div v-for="person in people" :key="person.id" class="flex items-center gap-3">
              <NuiAvatar :name="person.name" />
              <div class="flex min-w-0 flex-1 flex-col">
                <span class="truncate text-sm font-medium">{{ person.name }}</span>
                <span class="truncate text-sm text-muted-foreground">{{ person.role }}</span>
              </div>
            </div>
          </NuiCardContent>
        </NuiCard>
      </div>
      <div class="flex flex-col gap-4">
        <NuiCard>
          <NuiCardHeader>
            <NuiCardDescription>September revenue</NuiCardDescription>
            <NuiCardTitle class="text-3xl">{{ money.format(revenue) }}</NuiCardTitle>
            <template #actions>
              <NuiBadge tone="success">{{ orders.length }} orders</NuiBadge>
            </template>
          </NuiCardHeader>
          <NuiCardContent class="flex flex-col gap-2">
            <div class="flex justify-between text-sm">
              <span>Delivered</span>
              <span class="text-muted-foreground">{{ deliveredText }}</span>
            </div>
            <NuiProgress
              :value="delivered"
              :max="orders.length"
              label="Delivered"
              :value-text="deliveredText"
            />
          </NuiCardContent>
        </NuiCard>
        <NuiAlert
          v-if="cancelled"
          tone="warning"
          :title="`Order ${cancelled.id} canceled`"
          :description="`${cancelled.customer} gets a cancellation email, and the money goes back to the card.`"
        />
        <NuiCard>
          <NuiCardHeader>
            <NuiCardTitle>Notifications</NuiCardTitle>
            <NuiCardDescription>What the manager gets by email</NuiCardDescription>
          </NuiCardHeader>
          <NuiCardContent class="flex flex-col gap-4">
            <NuiSwitch v-model="notifyPaid" description="As soon as a customer pays for an order">
              New orders
            </NuiSwitch>
            <NuiSwitch v-model="notifyCancelled" description="When a customer cancels an order">
              Cancellations
            </NuiSwitch>
            <NuiSwitch v-model="notifyReviews" description="Once a day, as a list">
              Product reviews
            </NuiSwitch>
          </NuiCardContent>
        </NuiCard>
      </div>
      <NuiCard class="@xl:col-span-2">
        <NuiCardHeader> <NuiCardTitle>Recent orders</NuiCardTitle> </NuiCardHeader>
        <NuiCardContent class="flex flex-col gap-3">
          <NuiToggleGroup
            v-model="filter"
            :items="filters"
            variant="segmented"
            size="sm"
            required
            label="Which orders to show"
          />
          <NuiTable
            :columns="columns"
            :rows="rows"
            :get-key="keyOf"
            :column-menu="false"
            label="Recent orders"
            size="sm"
          >
            <template #cell-status="{ row }">
              <NuiBadge :tone="STATUS_TONES[row.status]" size="sm">
                {{ ORDER_STATUSES[row.status] }}
              </NuiBadge>
            </template>
          </NuiTable>
        </NuiCardContent>
      </NuiCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  NuiAlert,
  NuiAvatar,
  NuiBadge,
  NuiButton,
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardFooter,
  NuiCardHeader,
  NuiCardTitle,
  NuiCheckbox,
  NuiProgress,
  NuiSelect,
  NuiSwitch,
  NuiToggleGroup,
  type NuiToggleItem,
  type NuiTone,
} from '@numior/kit';
import { NuiTable, type NuiTableColumn } from '@numior/kit/table';
import { customers } from '#demo/customers';
import { DELIVERIES, ORDER_STATUSES, orders, type Order, type OrderStatus } from '#demo/orders';
import { team } from '#demo/team';

const STATUS_TONES: Record<OrderStatus, NuiTone> = {
  pending: 'warning',
  paid: 'info',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'neutral',
};

const ALL = 'all';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const customerOptions = customers.map((person) => ({ value: person.id, label: person.name }));

const deliveryOptions = Object.entries(DELIVERIES).map(([value, label]) => ({ value, label }));

const filters: readonly NuiToggleItem[] = [
  { value: ALL, label: 'All' },
  { value: 'shipped', label: 'Shipping' },
  { value: 'delivered', label: 'Delivered' },
];

const columns: NuiTableColumn<Order>[] = [
  {
    key: 'id',
    label: '#',
    type: 'number',
    width: 88,
    value: (row) => row.id,
    format: (value) => String(value),
  },
  {
    key: 'customer',
    label: 'Customer',
    type: 'text',
    width: 170,
    flex: 1,
    value: (row) => row.customer,
  },
  {
    key: 'status',
    label: 'Status',
    type: 'text',
    width: 140,
    value: (row) => ORDER_STATUSES[row.status],
  },
  {
    key: 'total',
    label: 'Total',
    type: 'number',
    width: 120,
    value: (row) => row.total,
    format: (value) => money.format(value),
  },
];

const people = team.slice(0, 3);

const cancelled = orders.find((order) => order.status === 'cancelled');

const customer = ref<number | null>(customers[0]?.id ?? null);
const delivery = ref<string | null>('courier');
const sms = ref(true);
const notifyPaid = ref(true);
const notifyCancelled = ref(true);
const notifyReviews = ref(false);
const filter = ref<string | null>(ALL);

const revenue = orders.reduce((sum, order) => sum + order.total, 0);

const delivered = orders.reduce(
  (count, order) => (order.status === 'delivered' ? count + 1 : count),
  0,
);

const deliveredText = `${delivered} of ${orders.length}`;

const rows = computed(() =>
  orders
    .filter((order) => filter.value === ALL || order.status === filter.value)
    .toReversed()
    .slice(0, 5),
);

const keyOf = (order: Order): number => order.id;
</script>
