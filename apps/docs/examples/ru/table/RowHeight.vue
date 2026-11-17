<template>
  <NuiTable
    :columns="columns"
    :rows="requests"
    :get-key="keyOf"
    height="20rem"
    row-height="auto"
    caption="2 000 обращений"
  />
</template>

<script setup lang="ts">
import { NuiTable, type NuiTableColumn } from '@numior/kit/table';
import { customers } from '#demo/customers';

interface Request {
  readonly id: number;
  readonly author: string;
  readonly topic: string;
  readonly text: string;
}

const TOPICS = ['Доставка', 'Оплата', 'Возврат', 'Гарантия'];

const TEXTS = [
  'Спасибо, всё получил.',
  'Курьер приехал на день позже. Уточните, когда привезут вторую коробку.',
  'Оплата прошла дважды. Верните лишнее списание на карту и пришлите чек на почту из заказа.',
];

const NAMES = customers.map((customer) => customer.name);

const requests: Request[] = Array.from({ length: 2000 }, (_, index) => ({
  id: index + 1,
  author: NAMES[index % NAMES.length] ?? '',
  topic: TOPICS[(index * 3) % TOPICS.length] ?? '',
  text: TEXTS[(index * 5) % TEXTS.length] ?? '',
}));

const columns: NuiTableColumn<Request>[] = [
  {
    key: 'id',
    label: '№',
    type: 'number',
    width: 100,
    value: (row) => row.id,
    format: (value) => String(value),
  },
  { key: 'author', label: 'Автор', type: 'text', width: 170, value: (row) => row.author },
  {
    key: 'topic',
    label: 'Тема',
    type: 'text',
    width: 120,
    filter: 'set',
    value: (row) => row.topic,
  },
  {
    key: 'text',
    label: 'Обращение',
    type: 'text',
    width: 280,
    flex: 1,
    wrap: true,
    value: (row) => row.text,
  },
];

const keyOf = (request: Request): number => request.id;
</script>
