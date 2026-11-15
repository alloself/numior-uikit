<template>
  <NuiTable
    :columns="columns"
    :rows="requests"
    :get-key="keyOf"
    height="20rem"
    row-height="auto"
    caption="2,000 requests"
  />
</template>

<script setup lang="ts">
import { NuiTable, type NuiTableColumn } from '@numior/table';
import { customers } from '#demo/customers';

interface Request {
  readonly id: number;
  readonly author: string;
  readonly topic: string;
  readonly text: string;
}

const TOPICS = ['Delivery', 'Payment', 'Return', 'Warranty'];

const TEXTS = [
  'Thanks, everything arrived.',
  'The courier came a day late. Please tell me when the second box arrives.',
  'The payment went through twice. Refund the extra charge and send the receipt to my email.',
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
    label: 'No.',
    type: 'number',
    width: 100,
    value: (row) => row.id,
    format: (value) => String(value),
  },
  { key: 'author', label: 'Author', type: 'text', width: 170, value: (row) => row.author },
  {
    key: 'topic',
    label: 'Topic',
    type: 'text',
    width: 120,
    filter: 'set',
    value: (row) => row.topic,
  },
  {
    key: 'text',
    label: 'Request',
    type: 'text',
    width: 280,
    flex: 1,
    wrap: true,
    value: (row) => row.text,
  },
];

const keyOf = (request: Request): number => request.id;
</script>
