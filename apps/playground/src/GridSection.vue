<template>
  <section class="panel" aria-labelledby="grid-title">
    <div class="section-heading">
      <h2 id="grid-title">Грид данных</h2>
      <span class="tag">NuiDataGrid · 10 000 строк</span>
    </div>
    <div class="data-row">
      <NuiInput
        v-model="quick"
        type="search"
        size="sm"
        class="grid-quick"
        placeholder="Поиск по заказам"
        aria-label="Поиск по заказам"
        data-testid="grid-quick"
      >
        <template #prefix>
          <NuiIcon alias="search" />
        </template>
      </NuiInput>
      <NuiSelect
        v-model="grouping"
        :options="groupings"
        size="sm"
        class="grid-grouping"
        aria-label="Группировка"
        data-testid="grid-group"
      />
      <NuiButton
        size="sm"
        variant="outline"
        tone="neutral"
        :disabled="filters.length === 0 && quick === ''"
        data-testid="grid-clear-filters"
        @click="clearFilters"
      >
        Сбросить фильтры
      </NuiButton>
      <NuiButton
        size="sm"
        variant="outline"
        tone="neutral"
        data-testid="grid-empty"
        @click="empty = !empty"
      >
        {{ empty ? 'Вернуть строки' : 'Очистить строки' }}
      </NuiButton>
      <NuiButton
        size="sm"
        variant="outline"
        tone="neutral"
        :disabled="hidden.length === 0 && Object.keys(pins).length === 0"
        data-testid="grid-reset-columns"
        @click="resetColumns"
      >
        Сбросить колонки
      </NuiButton>
    </div>
    <NuiDataGrid
      v-model:sort="sort"
      v-model:filters="filters"
      v-model:quick="quick"
      v-model:group-by="groupBy"
      v-model:expanded="expanded"
      v-model:pins="pins"
      v-model:hidden="hidden"
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
    <pre class="output" data-testid="grid-output">{{ output }}</pre>
    <NuiDataGrid
      v-model:expanded="unitsExpanded"
      class="grid-tree"
      :columns="UNIT_COLUMNS"
      :source="units"
      :get-key="(row) => row.id"
      :get-children="(row) => row.children"
      :has-children="(row) => row.lazy === true"
      label="Структура компании"
      height="18rem"
      data-testid="grid-tree"
      @load="loadUnit"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  NuiButton,
  NuiChip,
  NuiIcon,
  NuiInput,
  NuiSelect,
  type NuiOption,
  type NuiTone,
} from '@numior/vue';
import {
  NuiDataGrid,
  type GridNodeId,
  type GridSort,
  type NuiDataGridFilters,
  type NuiDataGridHidden,
  type NuiDataGridPins,
  type NuiGridColumnDef,
} from '@numior/table';

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

interface Unit {
  readonly id: string;
  readonly name: string;
  readonly head: string;
  readonly people: number;
  readonly budget: number;
  readonly children?: readonly Unit[];
  readonly lazy?: boolean;
}

const UNITS: readonly Unit[] = [
  {
    id: 'sales',
    name: 'Продажи',
    head: 'Вера Орлова',
    people: 42,
    budget: 1_200_000,
    children: [
      {
        id: 'sales-ru',
        name: 'Россия',
        head: 'Олег Титов',
        people: 18,
        budget: 540_000,
        children: [
          { id: 'sales-msk', name: 'Москва', head: 'Нина Белова', people: 11, budget: 330_000 },
          { id: 'sales-kzn', name: 'Казань', head: 'Игорь Зуев', people: 7, budget: 210_000 },
        ],
      },
      { id: 'sales-kz', name: 'Казахстан', head: 'Анна Смирнова', people: 24, budget: 660_000 },
    ],
  },
  {
    id: 'rnd',
    name: 'Разработка',
    head: 'Павел Попов',
    people: 64,
    budget: 3_100_000,
    children: [
      { id: 'rnd-web', name: 'Веб', head: 'Ольга Соколова', people: 29, budget: 1_400_000 },
      { id: 'rnd-data', name: 'Данные', head: 'Сергей Иванов', people: 35, budget: 1_700_000 },
    ],
  },
  { id: 'ops', name: 'Операции', head: 'Елена Кузнецова', people: 23, budget: 800_000, lazy: true },
];

const OPERATIONS: readonly Unit[] = [
  { id: 'ops-support', name: 'Поддержка', head: 'Мария Лебедева', people: 15, budget: 450_000 },
  { id: 'ops-logistics', name: 'Логистика', head: 'Дмитрий Попов', people: 8, budget: 350_000 },
];

const UNIT_COLUMNS: NuiGridColumnDef<Unit>[] = [
  { key: 'name', label: 'Подразделение', type: 'text', width: 240, value: (row) => row.name },
  { key: 'head', label: 'Руководитель', type: 'text', width: 200, value: (row) => row.head },
  { key: 'people', label: 'Сотрудники', type: 'number', width: 150, value: (row) => row.people },
  { key: 'budget', label: 'Бюджет', type: 'number', width: 150, value: (row) => row.budget },
];

const GROUPINGS: readonly NuiOption<string>[] = [
  { value: 'none', label: 'Без группировки' },
  { value: 'country', label: 'По стране' },
  { value: 'status', label: 'По статусу' },
  { value: 'country-city', label: 'Страна и город' },
];

const CUSTOM_GROUPING: NuiOption<string> = {
  value: 'custom',
  label: 'Своя группировка',
  disabled: true,
};

const GROUP_KEYS: Readonly<Record<string, readonly string[]>> = {
  country: ['country'],
  status: ['status'],
  'country-city': ['country', 'city'],
};

const sameKeys = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((key, index) => b[index] === key);

const groupingOf = (keys: readonly string[]): string => {
  if (keys.length === 0) {
    return 'none';
  }
  return Object.entries(GROUP_KEYS).find(([, preset]) => sameKeys(preset, keys))?.[0] ?? 'custom';
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

const columns: NuiGridColumnDef<Order>[] = [
  {
    key: 'id',
    label: '№',
    type: 'number',
    pin: 'start',
    hideable: false,
    width: 88,
    value: (row) => row.id,
    format: (value) => String(value),
  },
  {
    key: 'buyer',
    label: 'Покупатель',
    children: [
      { key: 'customer', label: 'Клиент', type: 'text', width: 200, value: (row) => row.customer },
      { key: 'email', label: 'Почта', type: 'text', width: 240, value: (row) => row.email },
    ],
  },
  {
    key: 'address',
    label: 'Адрес',
    children: [
      {
        key: 'city',
        label: 'Город',
        type: 'text',
        width: 140,
        filter: 'set',
        value: (row) => row.city,
      },
      {
        key: 'country',
        label: 'Страна',
        type: 'text',
        width: 140,
        filter: 'set',
        value: (row) => row.country,
      },
    ],
  },
  {
    key: 'order',
    label: 'Заказ',
    children: [
      {
        key: 'amount',
        label: 'Сумма',
        type: 'number',
        width: 130,
        aggregate: 'sum',
        value: (row) => row.amount,
      },
      { key: 'created', label: 'Создан', type: 'date', width: 150, value: (row) => row.created },
      {
        key: 'vip',
        label: 'VIP',
        type: 'boolean',
        width: 100,
        aggregate: 'sum',
        value: (row) => row.vip,
      },
      {
        key: 'manager',
        label: 'Менеджер',
        type: 'text',
        width: 180,
        filter: 'set',
        value: (row) => row.manager,
      },
      { key: 'note', label: 'Комментарий', type: 'text', width: 260, value: (row) => row.note },
    ],
  },
  {
    key: 'status',
    label: 'Статус',
    type: 'text',
    pin: 'end',
    width: 160,
    filter: 'set',
    value: (row) => STATUS_LABELS[row.status],
  },
];

const empty = ref(false);
const sort = ref<readonly GridSort[]>([]);
const filters = ref<NuiDataGridFilters>([]);
const quick = ref('');
const pins = ref<NuiDataGridPins>({});
const hidden = ref<NuiDataGridHidden>([]);
const units = ref<readonly Unit[]>(UNITS);
const unitsExpanded = ref<readonly GridNodeId[]>([]);
const LOAD_DELAY = 700;

const loadUnit = (unit: Unit): void => {
  setTimeout(() => {
    units.value = units.value.map((entry) =>
      entry.id === unit.id ? { ...entry, children: OPERATIONS } : entry,
    );
  }, LOAD_DELAY);
};

const groupBy = ref<readonly string[]>([]);
const expanded = ref<readonly GridNodeId[]>([]);

const grouping = computed({
  get: () => groupingOf(groupBy.value),
  set: (key: string) => {
    groupBy.value = GROUP_KEYS[key] ?? [];
    expanded.value = [];
  },
});

const groupings = computed(() =>
  grouping.value === 'custom' ? [...GROUPINGS, CUSTOM_GROUPING] : GROUPINGS,
);

const output = computed(() =>
  JSON.stringify({
    sort: sort.value,
    filters: filters.value,
    quick: quick.value,
    groupBy: groupBy.value,
    pins: pins.value,
    hidden: hidden.value,
  }),
);

const clearFilters = (): void => {
  filters.value = [];
  quick.value = '';
};

const resetColumns = (): void => {
  pins.value = {};
  hidden.value = [];
};
</script>
