<template>
  <section class="panel" aria-labelledby="table-detail-title">
    <div class="section-heading">
      <h2 id="table-detail-title">Детали строк</h2>
      <span class="tag">NuiTable · слот detail · 2 000 строк</span>
    </div>
    <div class="data-row">
      <NuiSwitch v-model="windowed" data-testid="table-detail-window">Окно строк</NuiSwitch>
      <NuiSwitch v-model="fluid" data-testid="table-detail-fluid">Высота по содержимому</NuiSwitch>
      <NuiSwitch v-model="striped" data-testid="table-detail-striped">Полосы</NuiSwitch>
      <NuiButton
        size="sm"
        variant="outline"
        tone="neutral"
        data-testid="table-detail-open"
        @click="expanded = FIRST_DETAILS"
      >
        Раскрыть первые три
      </NuiButton>
      <NuiButton
        size="sm"
        variant="outline"
        tone="neutral"
        :disabled="expanded.length === 0"
        data-testid="table-detail-close"
        @click="expanded = []"
      >
        Свернуть все
      </NuiButton>
    </div>
    <NuiTable
      v-model:expanded="expanded"
      v-model:page-size="pageSize"
      :columns="SHIPMENT_COLUMNS"
      :rows="SHIPMENTS"
      :get-key="(row) => row.id"
      :has-detail="(row) => row.items.length > 0"
      :height="windowed ? '24rem' : undefined"
      :row-height="fluid ? 'auto' : undefined"
      :pagination="windowed ? false : PAGINATION"
      :striped="striped"
      label="Поставки"
      data-testid="table-detail"
      @row-click="(row) => (lastClick = row.id)"
    >
      <template #detail="{ row }">
        <div class="grid gap-3" :data-testid="`table-detail-${row.id}`">
          <dl class="m-0 flex flex-wrap gap-x-8 gap-y-2">
            <div v-for="fact in factsOf(row)" :key="fact.label">
              <dt class="text-xs text-muted-foreground">{{ fact.label }}</dt>
              <dd class="m-0">{{ fact.text }}</dd>
            </div>
          </dl>
          <NuiTable
            :columns="ITEM_COLUMNS"
            :rows="row.items"
            :get-key="(item) => item.sku"
            size="sm"
            label="Состав поставки"
            totals-label="Итого"
          />
          <div class="flex flex-wrap gap-2">
            <NuiButton size="sm" variant="outline" tone="neutral" @click="opened = row.id">
              Открыть поставку
            </NuiButton>
          </div>
        </div>
      </template>
    </NuiTable>
    <pre class="output" data-testid="table-detail-output">{{ output }}</pre>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiButton, NuiSwitch } from '@numior/vue';
import {
  NuiTable,
  type NuiTableColumnDef,
  type NuiTablePagination,
  type TableNodeId,
} from '@numior/table';

interface ShipmentItem {
  readonly sku: string;
  readonly name: string;
  readonly quantity: number;
  readonly price: number;
}

interface Shipment {
  readonly id: number;
  readonly customer: string;
  readonly city: string;
  readonly address: string;
  readonly manager: string;
  readonly note: string;
  readonly items: readonly ShipmentItem[];
}

interface Fact {
  readonly label: string;
  readonly text: string;
}

const CUSTOMERS = ['Север', 'Альфа-Трейд', 'Мир посуды', 'Техносфера', 'Зелёный дом', 'Орион'];
const CITIES = ['Москва', 'Казань', 'Ереван', 'Алматы', 'Белград', 'Тбилиси', 'Минск'];
const STREETS = ['Лесная', 'Садовая', 'Речная', 'Заводская', 'Школьная'];
const MANAGERS = ['Вера Орлова', 'Олег Титов', 'Нина Белова', 'Игорь Зуев'];
const GOODS = ['Чайник', 'Кофемолка', 'Тостер', 'Блендер', 'Весы', 'Термос', 'Миксер'];

const NOTES = [
  'Позвонить за час до доставки',
  'Разгрузка со двора, нужен пропуск на въезд и сопровождающий от склада',
  '',
];

const SHIPMENT_COUNT = 2000;
const ITEM_KINDS = 6;
const FIRST_DETAILS: readonly TableNodeId[] = [1, 2, 3];
const PAGINATION: NuiTablePagination = { pageSizes: [10, 25, 50], showRange: true };

const pick = <V>(list: readonly V[], seed: number, fallback: V): V =>
  list[seed % list.length] ?? fallback;

const itemAt = (shipment: number, index: number): ShipmentItem => ({
  sku: `${shipment + 1}-${index + 1}`,
  name: pick(GOODS, shipment * 3 + index, ''),
  quantity: ((shipment + index * 5) % 9) + 1,
  price: ((shipment * 131 + index * 977) % 9000) + 500,
});

const shipmentAt = (id: number): Shipment => ({
  id: id + 1,
  customer: pick(CUSTOMERS, id * 5, ''),
  city: pick(CITIES, id * 3, ''),
  address: `ул. ${pick(STREETS, id * 7, '')}, ${(id % 90) + 1}`,
  manager: pick(MANAGERS, id, ''),
  note: pick(NOTES, id, ''),
  items: Array.from({ length: (id + 1) % ITEM_KINDS }, (_, index) => itemAt(id, index)),
});

const totalOf = (shipment: Shipment): number =>
  shipment.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

const SHIPMENTS: readonly Shipment[] = Array.from({ length: SHIPMENT_COUNT }, (_, id) =>
  shipmentAt(id),
);

const SHIPMENT_COLUMNS: NuiTableColumnDef<Shipment>[] = [
  {
    key: 'id',
    label: '№',
    type: 'number',
    width: 110,
    value: (row) => row.id,
    format: (value) => String(value),
  },
  {
    key: 'customer',
    label: 'Клиент',
    type: 'text',
    width: 200,
    flex: 1,
    value: (row) => row.customer,
  },
  { key: 'city', label: 'Город', type: 'text', width: 160, value: (row) => row.city },
  {
    key: 'items',
    label: 'Позиций',
    type: 'number',
    width: 120,
    value: (row) => row.items.length,
  },
  { key: 'total', label: 'Сумма', type: 'number', width: 140, value: totalOf },
  {
    key: 'note',
    label: 'Комментарий',
    type: 'text',
    width: 220,
    wrap: true,
    value: (row) => row.note,
  },
];

const ITEM_COLUMNS: NuiTableColumnDef<ShipmentItem>[] = [
  { key: 'name', label: 'Товар', type: 'text', width: 200, flex: 1, value: (item) => item.name },
  {
    key: 'quantity',
    label: 'Количество',
    type: 'number',
    width: 130,
    value: (item) => item.quantity,
  },
  { key: 'price', label: 'Цена', type: 'number', width: 120, value: (item) => item.price },
  {
    key: 'sum',
    label: 'Сумма',
    type: 'number',
    width: 130,
    aggregate: 'sum',
    value: (item) => item.quantity * item.price,
  },
];

const factsOf = (row: Shipment): Fact[] => [
  { label: 'Адрес', text: `${row.city}, ${row.address}` },
  { label: 'Менеджер', text: row.manager },
  ...(row.note === '' ? [] : [{ label: 'Комментарий', text: row.note }]),
];

const windowed = ref(true);
const fluid = ref(false);
const striped = ref(false);
const expanded = ref<readonly TableNodeId[]>([]);
const pageSize = ref(10);
const opened = ref<number | null>(null);
const lastClick = ref<number | null>(null);

const output = computed(() =>
  JSON.stringify({ expanded: expanded.value, opened: opened.value, lastClick: lastClick.value }),
);
</script>
