<template>
  <div class="@container">
    <div class="grid grid-cols-1 gap-4 @xl:grid-cols-2">
      <div class="flex flex-col gap-4">
        <NuiCard>
          <NuiCardHeader>
            <NuiCardTitle>Новый заказ</NuiCardTitle>
            <NuiCardDescription>Клиент получит письмо с номером заказа</NuiCardDescription>
          </NuiCardHeader>
          <NuiCardContent class="flex flex-col gap-4">
            <NuiSelect v-model="customer" :options="customerOptions" label="Клиент" />
            <NuiSelect v-model="delivery" :options="deliveryOptions" label="Доставка" />
            <NuiCheckbox v-model="sms">Отправить клиенту SMS со статусом</NuiCheckbox>
          </NuiCardContent>
          <NuiCardFooter class="flex justify-end gap-2">
            <NuiButton variant="outline" tone="neutral">Отмена</NuiButton>
            <NuiButton>Создать заказ</NuiButton>
          </NuiCardFooter>
        </NuiCard>
        <NuiCard>
          <NuiCardHeader>
            <NuiCardTitle>Команда</NuiCardTitle>
            <template #actions>
              <NuiButton variant="soft" size="sm" icon="plus">Пригласить</NuiButton>
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
            <NuiCardDescription>Выручка за сентябрь</NuiCardDescription>
            <NuiCardTitle class="text-3xl">{{ money.format(revenue) }}</NuiCardTitle>
            <template #actions>
              <NuiBadge tone="success">{{ orders.length }} заказов</NuiBadge>
            </template>
          </NuiCardHeader>
          <NuiCardContent class="flex flex-col gap-2">
            <div class="flex justify-between text-sm">
              <span>Доставлено</span>
              <span class="text-muted-foreground">{{ deliveredText }}</span>
            </div>
            <NuiProgress
              :value="delivered"
              :max="orders.length"
              label="Доставлено"
              :value-text="deliveredText"
            />
          </NuiCardContent>
        </NuiCard>
        <NuiAlert
          v-if="cancelled"
          tone="warning"
          :title="`Заказ ${cancelled.id} отменён`"
          :description="`${cancelled.customer} получит письмо об отмене, деньги вернутся на карту.`"
        />
        <NuiCard>
          <NuiCardHeader>
            <NuiCardTitle>Уведомления</NuiCardTitle>
            <NuiCardDescription>Что присылать менеджеру на почту</NuiCardDescription>
          </NuiCardHeader>
          <NuiCardContent class="flex flex-col gap-4">
            <NuiSwitch v-model="notifyPaid" description="Как только покупатель оплатил заказ">
              Новые заказы
            </NuiSwitch>
            <NuiSwitch v-model="notifyCancelled" description="Если покупатель отказался от заказа">
              Отмены
            </NuiSwitch>
            <NuiSwitch v-model="notifyReviews" description="Раз в день, списком">
              Отзывы о товарах
            </NuiSwitch>
          </NuiCardContent>
        </NuiCard>
      </div>
      <NuiCard class="@xl:col-span-2">
        <NuiCardHeader> <NuiCardTitle>Последние заказы</NuiCardTitle> </NuiCardHeader>
        <NuiCardContent class="flex flex-col gap-3">
          <NuiToggleGroup
            v-model="filter"
            :items="filters"
            variant="segmented"
            size="sm"
            required
            label="Какие заказы показать"
          />
          <NuiTable
            :columns="columns"
            :rows="rows"
            :get-key="keyOf"
            :column-menu="false"
            label="Последние заказы"
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

const money = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

const customerOptions = customers.map((person) => ({ value: person.id, label: person.name }));

const deliveryOptions = Object.entries(DELIVERIES).map(([value, label]) => ({ value, label }));

const filters: readonly NuiToggleItem[] = [
  { value: ALL, label: 'Все' },
  { value: 'shipped', label: 'В доставке' },
  { value: 'delivered', label: 'Доставлены' },
];

const columns: NuiTableColumn<Order>[] = [
  {
    key: 'id',
    label: '№',
    type: 'number',
    width: 88,
    value: (row) => row.id,
    format: (value) => String(value),
  },
  {
    key: 'customer',
    label: 'Клиент',
    type: 'text',
    width: 170,
    flex: 1,
    value: (row) => row.customer,
  },
  {
    key: 'status',
    label: 'Статус',
    type: 'text',
    width: 140,
    value: (row) => ORDER_STATUSES[row.status],
  },
  {
    key: 'total',
    label: 'Сумма',
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

const deliveredText = `${delivered} из ${orders.length}`;

const rows = computed(() =>
  orders
    .filter((order) => filter.value === ALL || order.status === filter.value)
    .toReversed()
    .slice(0, 5),
);

const keyOf = (order: Order): number => order.id;
</script>
