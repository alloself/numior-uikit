<template>
  <section class="panel" aria-labelledby="table-title">
    <div class="section-heading">
      <h2 id="table-title">Таблица</h2>
      <span class="tag">NuiTable · 10 000 строк</span>
    </div>
    <div class="data-row">
      <NuiInput
        v-model="quick"
        type="search"
        size="sm"
        class="table-quick"
        placeholder="Поиск по заказам"
        aria-label="Поиск по заказам"
        data-testid="table-quick"
      >
        <template #prefix>
          <NuiIcon alias="search" />
        </template>
      </NuiInput>
      <NuiSelect
        v-model="grouping"
        :options="groupings"
        size="sm"
        class="table-grouping"
        aria-label="Группировка"
        data-testid="table-group"
      />
      <NuiButton
        size="sm"
        variant="outline"
        tone="neutral"
        :disabled="filters.length === 0 && quick === ''"
        data-testid="table-clear-filters"
        @click="clearFilters"
      >
        Сбросить фильтры
      </NuiButton>
      <NuiButton
        size="sm"
        variant="outline"
        tone="neutral"
        data-testid="table-empty"
        @click="empty = !empty"
      >
        {{ empty ? 'Вернуть строки' : 'Очистить строки' }}
      </NuiButton>
      <NuiButton
        size="sm"
        variant="outline"
        tone="neutral"
        :disabled="hidden.length === 0 && Object.keys(pins).length === 0"
        data-testid="table-reset-columns"
        @click="resetColumns"
      >
        Сбросить колонки
      </NuiButton>
      <NuiButton
        size="sm"
        variant="outline"
        tone="neutral"
        data-testid="table-pinned"
        @click="pinned = !pinned"
      >
        {{ pinned ? 'Открепить строки' : 'Закрепить строки' }}
      </NuiButton>
      <NuiButton
        size="sm"
        variant="outline"
        tone="neutral"
        data-testid="table-pages"
        @click="paged = !paged"
      >
        {{ paged ? 'Все строки' : 'По страницам' }}
      </NuiButton>
      <NuiButton
        size="sm"
        variant="outline"
        tone="neutral"
        data-testid="table-loading"
        @click="unitsLoading = !unitsLoading"
      >
        {{ unitsLoading ? 'Показать структуру' : 'Загрузка структуры' }}
      </NuiButton>
    </div>
    <NuiTable
      v-model:sort="sort"
      v-model:filters="filters"
      v-model:quick="quick"
      v-model:group-by="groupBy"
      v-model:expanded="expanded"
      v-model:pins="pins"
      v-model:hidden="hidden"
      v-model:page="page"
      v-model:page-size="pageSize"
      :columns="columns"
      :rows="empty ? [] : orders"
      :pinned-rows="pinned ? PINNED_ORDERS : []"
      :pagination="paged ? PAGINATION : false"
      :get-key="(row) => row.id"
      label="Заказы"
      height="26rem"
      data-testid="table"
    >
      <template #cell-status="{ row }">
        <NuiChip size="sm" :tone="STATUS_TONES[row.status]">{{
          STATUS_LABELS[row.status]
        }}</NuiChip>
      </template>
    </NuiTable>
    <pre class="output" data-testid="table-output">{{ output }}</pre>
    <NuiTable
      v-model:expanded="unitsExpanded"
      v-model:selected="selectedUnits"
      class="table-tree"
      :columns="UNIT_COLUMNS"
      :rows="units"
      :get-key="(row) => row.id"
      :get-children="(row) => row.children"
      :has-children="(row) => row.lazy === true"
      :loading="unitsLoading"
      caption="Структура компании"
      selectable="multiple"
      striped
      data-testid="table-tree"
      @load="loadUnit"
      @row-click="(row) => (lastUnitClick = row.id)"
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
  NuiTable,
  type TableNodeId,
  type TableSort,
  type NuiTableFilters,
  type NuiTableHidden,
  type NuiTablePins,
  type NuiTableColumnDef,
  type NuiTablePagination,
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
  readonly note: string;
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
    note: 'Прямые продажи и партнёрская сеть в трёх странах, квартальные планы по регионам',
    children: [
      {
        id: 'sales-ru',
        name: 'Россия',
        head: 'Олег Титов',
        people: 18,
        budget: 540_000,
        note: 'Ключевые клиенты Москвы и регионов, тендеры и федеральные сети',
        children: [
          {
            id: 'sales-msk',
            name: 'Москва',
            head: 'Нина Белова',
            people: 11,
            budget: 330_000,
            note: 'Федеральные сети и корпоративные заказчики столицы',
          },
          {
            id: 'sales-kzn',
            name: 'Казань',
            head: 'Игорь Зуев',
            people: 7,
            budget: 210_000,
            note: 'Региональные дистрибьюторы Поволжья',
          },
        ],
      },
      {
        id: 'sales-kz',
        name: 'Казахстан',
        head: 'Анна Смирнова',
        people: 24,
        budget: 660_000,
        note: 'Развитие сети в Казахстане, локализация каталога и логистика',
      },
    ],
  },
  {
    id: 'rnd',
    name: 'Разработка',
    head: 'Павел Попов',
    people: 64,
    budget: 3_100_000,
    note: 'Продуктовая разработка, инфраструктура и качество',
    children: [
      {
        id: 'rnd-web',
        name: 'Веб',
        head: 'Ольга Соколова',
        people: 29,
        budget: 1_400_000,
        note: 'Клиентские приложения, дизайн-система и производительность интерфейсов',
      },
      {
        id: 'rnd-data',
        name: 'Данные',
        head: 'Сергей Иванов',
        people: 35,
        budget: 1_700_000,
        note: 'Хранилища, отчётность и модели прогнозирования спроса',
      },
    ],
  },
  {
    id: 'ops',
    name: 'Операции',
    head: 'Елена Кузнецова',
    people: 23,
    budget: 800_000,
    note: 'Поддержка клиентов, логистика и складской учёт',
    lazy: true,
  },
];

const OPERATIONS: readonly Unit[] = [
  {
    id: 'ops-support',
    name: 'Поддержка',
    head: 'Мария Лебедева',
    people: 15,
    budget: 450_000,
    note: 'Первая и вторая линии поддержки, база знаний',
  },
  {
    id: 'ops-logistics',
    name: 'Логистика',
    head: 'Дмитрий Попов',
    people: 8,
    budget: 350_000,
    note: 'Доставка, склады и возвраты',
  },
];

const UNIT_COLUMNS: NuiTableColumnDef<Unit>[] = [
  { key: 'name', label: 'Подразделение', type: 'text', width: 220, value: (row) => row.name },
  { key: 'head', label: 'Руководитель', type: 'text', width: 180, value: (row) => row.head },
  { key: 'people', label: 'Сотрудники', type: 'number', width: 130, value: (row) => row.people },
  { key: 'budget', label: 'Бюджет', type: 'number', width: 130, value: (row) => row.budget },
  { key: 'note', label: 'Задачи', type: 'text', width: 300, wrap: true, value: (row) => row.note },
];

const PAGINATION: NuiTablePagination = { pageSizes: [25, 50, 100], showRange: true };

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
const PINNED_ORDERS = orders.slice(0, 2);

const columns: NuiTableColumnDef<Order>[] = [
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
const sort = ref<readonly TableSort[]>([]);
const filters = ref<NuiTableFilters>([]);
const quick = ref('');
const pins = ref<NuiTablePins>({});
const hidden = ref<NuiTableHidden>([]);
const paged = ref(false);
const pinned = ref(false);
const page = ref(1);
const pageSize = ref(25);
const units = ref<readonly Unit[]>(UNITS);
const unitsExpanded = ref<readonly TableNodeId[]>([]);
const selectedUnits = ref<readonly Unit[]>([]);
const unitsLoading = ref(false);
const lastUnitClick = ref<string | null>(null);
const LOAD_DELAY = 700;

const loadUnit = (unit: Unit): void => {
  setTimeout(() => {
    units.value = units.value.map((entry) =>
      entry.id === unit.id ? { ...entry, children: OPERATIONS } : entry,
    );
  }, LOAD_DELAY);
};

const groupBy = ref<readonly string[]>([]);
const expanded = ref<readonly TableNodeId[]>([]);

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
    selected: selectedUnits.value.map((unit) => unit.id),
    lastClick: lastUnitClick.value,
    page: page.value,
    pageSize: pageSize.value,
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
