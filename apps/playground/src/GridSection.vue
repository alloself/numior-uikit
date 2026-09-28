<template>
  <section class="panel" aria-labelledby="grid-title">
    <div class="section-heading">
      <h2 id="grid-title">Грид данных</h2>
      <span class="tag">NuiDataGrid · 10 000 строк</span>
    </div>
    <div class="data-row">
      <NuiButton
        size="sm"
        variant="outline"
        tone="neutral"
        data-testid="grid-empty"
        @click="empty = !empty"
      >
        {{ empty ? 'Вернуть строки' : 'Очистить строки' }}
      </NuiButton>
    </div>
    <NuiDataGrid
      v-model:sort="sort"
      :columns="columns"
      :source="empty ? [] : orders"
      :get-key="(row) => row.id"
      label="Заказы"
      height="26rem"
      data-testid="grid"
    >
      <template #cell-status="{ row }">
        <NuiChip size="sm" :tone="STATUS_TONES[row.status]">{{
          STATUS_LABELS[row.status]
        }}</NuiChip>
      </template>
    </NuiDataGrid>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiChip, type NuiTone } from '@numior/vue';
import { NuiDataGrid, type GridSort, type NuiGridColumn } from '@numior/grid';

type OrderStatus = 'new' | 'paid' | 'shipped' | 'returned';

interface Order {
  readonly id: number;
  readonly customer: string;
  readonly email: string;
  readonly city: string;
  readonly country: string;
  readonly amount: number;
  readonly created: Date;
  readonly vip: boolean;
  readonly manager: string;
  readonly note: string;
  readonly status: OrderStatus;
}

const FIRST_NAMES = ['Анна', 'Иван', 'Мария', 'Павел', 'Ольга', 'Сергей', 'Елена', 'Дмитрий'];
const LAST_NAMES = ['Смирнова', 'Иванов', 'Кузнецова', 'Попов', 'Соколова', 'Лебедев'];
const CITIES = ['Москва', 'Казань', 'Ереван', 'Алматы', 'Белград', 'Тбилиси', 'Минск'];
const COUNTRIES = ['Россия', 'Армения', 'Казахстан', 'Сербия', 'Грузия', 'Беларусь'];
const MANAGERS = ['Вера Орлова', 'Олег Титов', 'Нина Белова', 'Игорь Зуев'];
const STATUSES: readonly OrderStatus[] = ['new', 'paid', 'shipped', 'returned'];

const STATUS_LABELS: Readonly<Record<OrderStatus, string>> = {
  new: 'Новый',
  paid: 'Оплачен',
  shipped: 'Отправлен',
  returned: 'Возврат',
};

const STATUS_TONES: Readonly<Record<OrderStatus, NuiTone>> = {
  new: 'info',
  paid: 'success',
  shipped: 'neutral',
  returned: 'warning',
};

const pick = <V>(list: readonly V[], seed: number, fallback: V): V =>
  list[seed % list.length] ?? fallback;

const orderAt = (id: number): Order => {
  const first = pick(FIRST_NAMES, id * 7, '');
  const last = pick(LAST_NAMES, id * 11, '');

  return {
    id: id + 1,
    customer: `${first} ${last}`,
    email: `client${id + 1}@example.com`,
    city: pick(CITIES, id * 3, ''),
    country: pick(COUNTRIES, id * 5, ''),
    amount: ((id * 7919) % 100_000) + 100,
    created: new Date(Date.UTC(2025, id % 12, 1 + (id % 27))),
    vip: id % 9 === 0,
    manager: pick(MANAGERS, id, ''),
    note: id % 4 === 0 ? 'Позвонить перед доставкой' : '',
    status: pick(STATUSES, id * 13, 'new'),
  };
};

const orders: Order[] = Array.from(Array.from({ length: 10_000 }).keys(), orderAt);

const columns: NuiGridColumn<Order>[] = [
  {
    key: 'id',
    label: '№',
    type: 'number',
    pin: 'start',
    width: 88,
    value: (row) => row.id,
    format: (value) => String(value),
  },
  { key: 'customer', label: 'Клиент', type: 'text', width: 200, value: (row) => row.customer },
  { key: 'email', label: 'Почта', type: 'text', width: 240, value: (row) => row.email },
  { key: 'city', label: 'Город', type: 'text', width: 140, value: (row) => row.city },
  { key: 'country', label: 'Страна', type: 'text', width: 140, value: (row) => row.country },
  { key: 'amount', label: 'Сумма', type: 'number', width: 130, value: (row) => row.amount },
  { key: 'created', label: 'Создан', type: 'date', width: 150, value: (row) => row.created },
  { key: 'vip', label: 'VIP', type: 'boolean', width: 100, value: (row) => row.vip },
  { key: 'manager', label: 'Менеджер', type: 'text', width: 180, value: (row) => row.manager },
  { key: 'note', label: 'Комментарий', type: 'text', width: 260, value: (row) => row.note },
  {
    key: 'status',
    label: 'Статус',
    type: 'text',
    pin: 'end',
    width: 140,
    value: (row) => row.status,
  },
];

const empty = ref(false);
const sort = ref<readonly GridSort[]>([]);
</script>
