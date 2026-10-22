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
          <NuiIcon icon="search" />
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
        :disabled="
          hidden.length === 0 &&
          columnOrder.length === 0 &&
          Object.keys(pins).length === 0 &&
          Object.keys(widths).length === 0
        "
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
      <NuiButton
        size="sm"
        variant="outline"
        tone="neutral"
        data-testid="table-export"
        @click="downloadCsv"
      >
        Экспорт CSV
      </NuiButton>
    </div>
    <NuiTable
      ref="orders-table"
      cell-selection
      v-model:sort="sort"
      v-model:filters="filters"
      v-model:quick="quick"
      v-model:group-by="groupBy"
      v-model:expanded="expanded"
      v-model:pins="pins"
      v-model:hidden="hidden"
      v-model:widths="widths"
      v-model:column-order="columnOrder"
      v-model:page="page"
      v-model:page-size="pageSize"
      v-model:ranges="ranges"
      :columns="columns"
      :rows="empty ? [] : orders"
      :pinned-rows="pinned ? PINNED_ORDERS : []"
      :pagination="paged ? PAGINATION : false"
      :get-key="(row) => row.id"
      :context-menu="orderMenu"
      :controls="kitControls"
      @edit="onOrderEdit"
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
      row-drag
      data-testid="table-tree"
      @load="loadUnit"
      @row-click="(row) => (lastUnitClick = row.id)"
      @reorder="onUnitReorder"
    />
    <div class="data-row mt-2">
      <NuiButton
        size="sm"
        variant="outline"
        tone="neutral"
        data-testid="table-remote-toggle"
        @click="remoteShown = !remoteShown"
      >
        {{ remoteShown ? 'Скрыть серверную таблицу' : 'Показать серверную таблицу' }}
      </NuiButton>
    </div>
    <template v-if="remoteShown">
      <div class="data-row">
        <NuiInput
          v-model="remoteQuick"
          type="search"
          size="sm"
          class="table-quick"
          placeholder="Поиск на сервере"
          aria-label="Поиск на сервере"
          data-testid="table-remote-quick"
        >
          <template #prefix>
            <NuiIcon icon="search" />
          </template>
        </NuiInput>
        <NuiSelect
          v-model="remoteGrouping"
          :options="REMOTE_GROUPINGS"
          size="sm"
          class="table-grouping"
          aria-label="Группировка на сервере"
          data-testid="table-remote-group"
        />
        <NuiButton
          size="sm"
          variant="outline"
          tone="neutral"
          data-testid="table-remote-refresh"
          @click="remoteTable?.refresh()"
        >
          Обновить
        </NuiButton>
      </div>
      <NuiTable
        ref="remote-table"
        v-model:quick="remoteQuick"
        v-model:group-by="remoteGroupBy"
        v-model:expanded="remoteExpanded"
        :columns="REMOTE_COLUMNS"
        :source="remoteSource"
        :get-key="(row) => row.id"
        caption="Заказы с сервера · 100 000 строк"
        height="22rem"
        data-testid="table-remote"
      />
      <pre class="output" data-testid="table-remote-output">{{ remoteOutput }}</pre>
      <NuiTable
        v-model:expanded="remoteUnitsExpanded"
        :columns="UNIT_COLUMNS"
        :source="remoteUnitSource"
        :get-key="(row) => row.id"
        :has-children="hasRemoteUnits"
        caption="Структура компании с сервера"
        height="18rem"
        data-testid="table-remote-tree"
      />
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { email, min, required } from '@numior/forms';
import {
  NuiButton,
  NuiChip,
  NuiIcon,
  NuiInput,
  NuiSelect,
  type NuiMenuEntry,
  type NuiOption,
  type NuiTone,
} from '@numior/vue';
import { kitControls } from '@numior/vue/controls';
import {
  NuiTable,
  tableEditor,
  type TableNodeId,
  type TableSort,
  type NuiTableFilters,
  type NuiTableHidden,
  type NuiTablePins,
  type NuiTableWidths,
  type NuiTableColumnOrder,
  type NuiTableReorderEvent,
  type NuiTableColumnDef,
  type NuiTableContextScope,
  type NuiTablePagination,
  type NuiTableRanges,
  type NuiTableCellValue,
  type NuiTableEditEvent,
  type NuiTableExposed,
  type NuiTableColumn,
  type TableFilter,
  type TableSource,
  type TableSourceGroup,
} from '@numior/table';

type OrderStatus = 'new' | 'paid' | 'shipped' | 'returned';

interface Order {
  readonly id: number;
  customer: string;
  email: string;
  city: string;
  country: string;
  amount: number | null;
  created: Date | null;
  vip: boolean | null;
  manager: string;
  note: string;
  readonly status: OrderStatus;
}

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

interface RemoteOrder {
  readonly id: number;
  readonly customer: string;
  readonly city: string;
  readonly amount: number;
}

const FIRST_NAMES = ['Анна', 'Иван', 'Мария', 'Павел', 'Ольга', 'Сергей', 'Елена', 'Дмитрий'];
const LAST_NAMES = ['Смирнова', 'Иванов', 'Кузнецова', 'Попов', 'Соколова', 'Лебедев'];
const CITIES = ['Москва', 'Казань', 'Ереван', 'Алматы', 'Белград', 'Тбилиси', 'Минск'];
const COUNTRIES = ['Россия', 'Армения', 'Казахстан', 'Сербия', 'Грузия', 'Беларусь'];
const MANAGERS = ['Вера Орлова', 'Олег Титов', 'Нина Белова', 'Игорь Зуев'];
const isText = (value: unknown): value is string => typeof value === 'string';
const optionOf = (value: string): NuiOption<string> => ({ value, label: value });
const COUNTRY_OPTIONS = COUNTRIES.map(optionOf);
const MANAGER_OPTIONS = MANAGERS.map(optionOf);
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
    width: 104,
    value: (row) => row.id,
    format: (value) => String(value),
  },
  {
    key: 'buyer',
    label: 'Покупатель',
    children: [
      {
        key: 'customer',
        label: 'Клиент',
        type: 'text',
        width: 200,
        editable: true,
        rules: [required()],
        value: (row) => row.customer,
      },
      {
        key: 'email',
        label: 'Почта',
        type: 'text',
        width: 240,
        editable: true,
        rules: [email()],
        value: (row) => row.email,
      },
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
        editable: true,
        value: (row) => row.city,
      },
      {
        key: 'country',
        label: 'Страна',
        type: 'text',
        width: 140,
        filter: 'set',
        editable: true,
        editor: tableEditor(NuiSelect, isText, { props: { options: COUNTRY_OPTIONS } }),
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
        editable: true,
        rules: [min(0)],
        value: (row) => row.amount,
      },
      {
        key: 'created',
        label: 'Создан',
        type: 'date',
        width: 150,
        editable: true,
        value: (row) => row.created,
      },
      {
        key: 'vip',
        label: 'VIP',
        type: 'boolean',
        width: 100,
        editable: true,
        value: (row) => row.vip,
      },
      {
        key: 'manager',
        label: 'Менеджер',
        type: 'text',
        width: 180,
        filter: 'set',
        editable: true,
        editor: { control: 'select', props: { options: MANAGER_OPTIONS } },
        value: (row) => row.manager,
      },
      {
        key: 'note',
        label: 'Комментарий',
        type: 'text',
        width: 260,
        editable: true,
        value: (row) => row.note,
      },
    ],
  },
  {
    key: 'status',
    label: 'Статус',
    type: 'text',
    pin: 'end',
    width: 144,
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
const widths = ref<NuiTableWidths>({});
const columnOrder = ref<NuiTableColumnOrder>([]);
const paged = ref(false);
const pinned = ref(false);
const page = ref(1);
const pageSize = ref(25);
const units = ref<readonly Unit[]>(UNITS);
const unitsExpanded = ref<readonly TableNodeId[]>([]);
const selectedUnits = ref<readonly Unit[]>([]);
const unitsLoading = ref(false);
const lastUnitClick = ref<string | null>(null);
const lastReorder = ref<string | null>(null);
const ranges = ref<NuiTableRanges>([]);
const lastOpened = ref<number | null>(null);
const lastEdit = ref<string | null>(null);

const textOf = (value: NuiTableCellValue): string => (typeof value === 'string' ? value : '');

const ORDER_SETTERS: Readonly<Record<string, (row: Order, value: NuiTableCellValue) => void>> = {
  customer: (row, value) => {
    row.customer = textOf(value);
  },
  email: (row, value) => {
    row.email = textOf(value);
  },
  city: (row, value) => {
    row.city = textOf(value);
  },
  country: (row, value) => {
    row.country = textOf(value);
  },
  manager: (row, value) => {
    row.manager = textOf(value);
  },
  note: (row, value) => {
    row.note = textOf(value);
  },
  amount: (row, value) => {
    row.amount = typeof value === 'number' ? value : null;
  },
  created: (row, value) => {
    row.created = value instanceof Date ? value : null;
  },
  vip: (row, value) => {
    row.vip = typeof value === 'boolean' ? value : null;
  },
};

const ordersTable = useTemplateRef<NuiTableExposed>('orders-table');
const remoteTable = useTemplateRef<NuiTableExposed>('remote-table');

const REMOTE_DELAY = 250;

const REMOTE_ORDERS: readonly RemoteOrder[] = Array.from({ length: 100_000 }, (_, id) => ({
  id: id + 1,
  customer: `${pick(FIRST_NAMES, id * 7, '')} ${pick(LAST_NAMES, id * 11, '')}`,
  city: pick(CITIES, id * 3, ''),
  amount: ((id * 7919) % 100_000) + 100,
}));

const REMOTE_SIGN = { asc: 1, desc: -1 } as const;

const REMOTE_UNSORTED: TableSort = { key: '', direction: 'asc' };

const REMOTE_COMPARE: Readonly<Record<string, (a: RemoteOrder, b: RemoteOrder) => number>> = {
  id: (a, b) => a.id - b.id,
  customer: (a, b) => a.customer.localeCompare(b.customer, 'ru'),
  city: (a, b) => a.city.localeCompare(b.city, 'ru'),
  amount: (a, b) => a.amount - b.amount,
};

const REMOTE_COLUMNS: NuiTableColumn<RemoteOrder>[] = [
  {
    key: 'id',
    label: '№',
    type: 'number',
    width: 96,
    filter: false,
    value: (row) => row.id,
    format: (value) => String(value),
  },
  {
    key: 'customer',
    label: 'Клиент',
    type: 'text',
    width: 200,
    flex: 1,
    filter: false,
    value: (row) => row.customer,
  },
  {
    key: 'city',
    label: 'Город',
    type: 'text',
    width: 140,
    filter: false,
    value: (row) => row.city,
  },
  {
    key: 'amount',
    label: 'Сумма',
    type: 'number',
    width: 130,
    filter: false,
    aggregate: 'sum',
    value: (row) => row.amount,
  },
];

const REMOTE_GROUP_KEYS: Readonly<Record<string, readonly string[]>> = {
  none: [],
  city: ['city'],
  nested: ['city', 'customer'],
};

const REMOTE_GROUPINGS: NuiOption<string>[] = [
  { value: 'none', label: 'Без групп' },
  { value: 'city', label: 'По городу' },
  { value: 'nested', label: 'По городу и клиенту' },
];

const REMOTE_GROUP_VALUES: Readonly<Record<string, (row: RemoteOrder) => string>> = {
  city: (row) => row.city,
  customer: (row) => row.customer,
};

const remoteShown = ref(false);
const remoteQuick = ref('');
const remoteRequests = ref(0);
const lastRemote = ref<string | null>(null);
const remoteGroupBy = ref<readonly string[]>([]);
const remoteExpanded = ref<readonly TableNodeId[]>([]);

const remoteGrouping = computed({
  get: () =>
    Object.entries(REMOTE_GROUP_KEYS).find(([, keys]) =>
      sameKeys(keys, remoteGroupBy.value),
    )?.[0] ?? 'none',
  set: (key: string) => {
    remoteGroupBy.value = REMOTE_GROUP_KEYS[key] ?? [];
    remoteExpanded.value = [];
  },
});

const isQuick = (filter: TableFilter): filter is Extract<TableFilter, { kind: 'quick' }> =>
  filter.kind === 'quick';

const remoteFound = (conditions: readonly TableFilter[]): readonly RemoteOrder[] => {
  const text = conditions.find(isQuick)?.value.toLocaleLowerCase('ru') ?? '';

  return REMOTE_ORDERS.filter((row) =>
    `${row.customer} ${row.city}`.toLocaleLowerCase('ru').includes(text),
  );
};

const remoteSorted = (
  rows: readonly RemoteOrder[],
  sorting: readonly TableSort[],
): readonly RemoteOrder[] => {
  const [order = REMOTE_UNSORTED] = sorting;
  const compare = REMOTE_COMPARE[order.key];

  return compare === undefined
    ? rows
    : rows.toSorted((a, b) => compare(a, b) * REMOTE_SIGN[order.direction]);
};

const pause = (signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, REMOTE_DELAY);

    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });

const remoteValueOf = (row: RemoteOrder, key: string | undefined): string =>
  REMOTE_GROUP_VALUES[key ?? '']?.(row) ?? '';

const remoteInside = (
  rows: readonly RemoteOrder[],
  keys: readonly string[],
  path: readonly unknown[],
): readonly RemoteOrder[] =>
  path.length === 0
    ? rows
    : rows.filter((row) => path.every((value, depth) => remoteValueOf(row, keys[depth]) === value));

const remoteGroups = (rows: readonly RemoteOrder[], key: string): TableSourceGroup[] => {
  const groups = new Map<string, { count: number; amount: number }>();

  for (const row of rows) {
    const value = remoteValueOf(row, key);
    const group = groups.get(value) ?? { count: 0, amount: 0 };

    groups.set(value, { count: group.count + 1, amount: group.amount + row.amount });
  }
  return [...groups]
    .toSorted((a, b) => a[0].localeCompare(b[0], 'ru'))
    .map(([value, { count, amount }]) => ({ value, count, aggregates: { amount } }));
};

const remoteSource: TableSource<RemoteOrder> = {
  fetch: async ({
    offset,
    limit,
    sort: sorting,
    filters: conditions,
    groupBy: keys,
    groupPath,
    signal,
  }) => {
    remoteRequests.value += 1;
    lastRemote.value = `${groupPath.join('/')}:${offset}+${limit}`;
    await pause(signal);

    const inside = remoteInside(remoteFound(conditions), keys, groupPath);
    const level = keys[groupPath.length];

    if (level !== undefined) {
      const groups = remoteGroups(inside, level);

      return { groups: groups.slice(offset, offset + limit), total: groups.length };
    }
    const found = remoteSorted(inside, sorting);

    return { rows: found.slice(offset, offset + limit), total: found.length };
  },
  totals: async ({ filters: conditions, signal }) => {
    await pause(signal);
    return { amount: remoteFound(conditions).reduce((sum, row) => sum + row.amount, 0) };
  },
};

const remoteUnitsExpanded = ref<readonly TableNodeId[]>([]);

const hasRemoteUnits = (unit: Unit): boolean =>
  unit.lazy === true || (unit.children?.length ?? 0) > 0;

const remoteUnitSource: TableSource<Unit> = {
  fetch: async ({ offset, limit, signal }) => {
    await pause(signal);
    return { rows: UNITS.slice(offset, offset + limit), total: UNITS.length };
  },
  children: async ({ row, signal }) => {
    await pause(signal);
    return row.children ?? OPERATIONS;
  },
};

const remoteOutput = computed(() =>
  JSON.stringify({ requests: remoteRequests.value, last: lastRemote.value }),
);

const downloadCsv = async (): Promise<void> => {
  const text = await ordersTable.value?.exportCsv({ separator: ';' });

  if (text === undefined) {
    return;
  }
  const url = URL.createObjectURL(new Blob(['\uFEFF', text], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');

  link.href = url;
  link.download = 'orders.csv';
  link.click();
  URL.revokeObjectURL(url);
};

const onOrderEdit = (event: NuiTableEditEvent<Order>): void => {
  for (const { row, key, value } of event.changes) {
    ORDER_SETTERS[key]?.(row, value);
  }
  lastEdit.value = `${event.kind}:${event.changes.length}`;
};

const orderMenu = (scope: NuiTableContextScope<Order>): NuiMenuEntry[] => [
  {
    label: `Открыть заказ ${scope.row.id}`,
    icon: 'external-link',
    onSelect: () => {
      lastOpened.value = scope.row.id;
    },
  },
];

const LOAD_DELAY = 700;

const inserted = (list: readonly Unit[], unit: Unit, index: number): Unit[] => [
  ...list.slice(0, index),
  unit,
  ...list.slice(index),
];

const without = (list: readonly Unit[], id: string): Unit[] =>
  list.flatMap((unit) => {
    if (unit.id === id) {
      return [];
    }
    return [unit.children === undefined ? unit : { ...unit, children: without(unit.children, id) }];
  });

const placed = (
  list: readonly Unit[],
  parentId: string | undefined,
  unit: Unit,
  index: number,
): Unit[] => {
  if (parentId === undefined) {
    return inserted(list, unit, index);
  }
  return list.map((entry) => {
    if (entry.id === parentId) {
      return { ...entry, children: inserted(entry.children ?? [], unit, index) };
    }
    return entry.children === undefined
      ? entry
      : { ...entry, children: placed(entry.children, parentId, unit, index) };
  });
};

const idOf = (unit: Unit | undefined): string => (unit === undefined ? 'root' : unit.id);

const withParent = (ids: readonly TableNodeId[], id: string | undefined): readonly TableNodeId[] =>
  id === undefined || ids.includes(id) ? ids : [...ids, id];

const reorderMark = (event: NuiTableReorderEvent<Unit>): string =>
  `${event.row.id}:${event.from}>${event.to}:${idOf(event.parent)}>${idOf(event.toParent)}`;

const onUnitReorder = (event: NuiTableReorderEvent<Unit>): void => {
  const target = event.toParent === undefined ? undefined : event.toParent.id;

  units.value = placed(without(units.value, event.row.id), target, event.row, event.to);
  unitsExpanded.value = withParent(unitsExpanded.value, target);
  lastReorder.value = reorderMark(event);
};

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
    widths: widths.value,
    columnOrder: columnOrder.value,
    selected: selectedUnits.value.map((unit) => unit.id),
    lastClick: lastUnitClick.value,
    lastReorder: lastReorder.value,
    ranges: ranges.value,
    lastOpened: lastOpened.value,
    lastEdit: lastEdit.value,
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
  widths.value = {};
  columnOrder.value = [];
};
</script>
