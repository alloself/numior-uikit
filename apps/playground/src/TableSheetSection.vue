<template>
  <section class="panel" aria-labelledby="table-sheet-title">
    <div class="section-heading">
      <h2 id="table-sheet-title">Лист</h2>
      <span class="tag">NuiTable · bordered · cellStyle · rowHeaders</span>
    </div>
    <div class="data-row">
      <NuiButton
        size="sm"
        variant="outline"
        tone="neutral"
        data-testid="table-sheet-toggle"
        @click="shown = !shown"
      >
        {{ shown ? 'Скрыть лист' : 'Показать лист' }}
      </NuiButton>
    </div>
    <template v-if="shown">
      <div class="data-row">
        <NuiSwitch v-model="bordered" data-testid="table-sheet-bordered">Сетка</NuiSwitch>
        <NuiSwitch v-model="heat" data-testid="table-sheet-heat">Тепловая карта</NuiSwitch>
        <NuiSwitch v-model="windowed" data-testid="table-sheet-window">Окно строк</NuiSwitch>
        <NuiSwitch v-model="quarter" data-testid="table-sheet-quarter">Первый квартал</NuiSwitch>
      </div>
      <NuiTable
        v-model:ranges="ranges"
        :columns="SHEET_COLUMNS"
        :rows="SHEET_ROWS"
        :get-key="(row) => row.index"
        :cell-style="styleOf"
        :bordered="bordered"
        row-headers
        :hidden="quarter ? LATER_MONTHS : NO_COLUMNS"
        :height="windowed ? '18rem' : undefined"
        :column-menu="false"
        size="sm"
        label="Бюджет"
        data-testid="table-sheet"
      />
      <pre class="output" data-testid="table-sheet-output">{{ output }}</pre>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiButton, NuiSwitch } from '@numior/vue';
import {
  NuiTable,
  type NuiTableCellRef,
  type NuiTableCellStyle,
  type NuiTableColumnDef,
  type NuiTableRanges,
} from '@numior/table';

type SheetValue = string | number | null;
type SheetRowKind = 'title' | 'head' | 'section' | 'item' | 'total' | 'result';

interface SheetRow {
  readonly index: number;
  readonly kind: SheetRowKind;
  readonly cells: readonly SheetValue[];
}

interface SheetLine {
  readonly label: string;
  readonly base: number;
  readonly step: number;
}

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
const LETTERS = 'ABCDEFGHIJKLMN';
const LABEL_WIDTH = 190;
const VALUE_WIDTH = 92;
const HEAT_LIMIT = 45;

const INCOME: readonly SheetLine[] = [
  { label: 'Продажи', base: 820, step: 37 },
  { label: 'Услуги', base: 310, step: -9 },
  { label: 'Подписки', base: 140, step: 22 },
];

const COSTS: readonly SheetLine[] = [
  { label: 'Зарплата', base: 640, step: 12 },
  { label: 'Аренда', base: 180, step: 0 },
  { label: 'Маркетинг', base: 90, step: 41 },
  { label: 'Облако', base: 60, step: 9 },
  { label: 'Налоги', base: 150, step: 15 },
];

const BOLD = { 'font-weight': 'var(--nui-font-weight-semibold)' } as const;
const TITLE: NuiTableCellStyle = { style: BOLD };
const SECTION: NuiTableCellStyle = { fill: 'var(--nui-neutral-soft)', style: BOLD };
const HEAD_LABEL: NuiTableCellStyle = { fill: 'var(--nui-surface-muted)', style: BOLD };
const HEAD_MONTH: NuiTableCellStyle = { ...HEAD_LABEL, align: 'center' };
const TOTAL: NuiTableCellStyle = { style: BOLD, borders: { top: '1px solid var(--nui-text)' } };
const RESULT: NuiTableCellStyle = { style: BOLD, borders: { top: '3px double var(--nui-text)' } };
const numbers = new Intl.NumberFormat('ru-RU');

const monthsOf = (line: SheetLine, shift: number): number[] =>
  MONTHS.map((_, month) => line.base + line.step * month + ((month * 53 + shift * 17) % 61) - 30);

const sumOf = (values: readonly number[]): number => values.reduce((sum, value) => sum + value, 0);

const withYear = (label: string, months: readonly number[]): SheetValue[] => [
  label,
  ...months,
  sumOf(months),
];

const totalsOf = (lines: readonly (readonly number[])[]): number[] =>
  MONTHS.map((_, month) => sumOf(lines.map((line) => line[month] ?? 0)));

const blank = (label: string): SheetValue[] => [label, ...MONTHS.map(() => null), null];

const buildRows = (): SheetRow[] => {
  const income = INCOME.map((line, index) => monthsOf(line, index));
  const costs = COSTS.map((line, index) => monthsOf(line, index + INCOME.length));
  const earned = totalsOf(income);
  const spent = totalsOf(costs);

  const lines: Array<[SheetRowKind, SheetValue[]]> = [
    ['title', blank('Бюджет на 2026 год, тыс. ₽')],
    ['head', ['Статья', ...MONTHS, 'Год']],
    ['section', blank('Доходы')],
    ...INCOME.map((line, index): [SheetRowKind, SheetValue[]] => [
      'item',
      withYear(line.label, income[index] ?? []),
    ]),
    ['total', withYear('Итого доходы', earned)],
    ['section', blank('Расходы')],
    ...COSTS.map((line, index): [SheetRowKind, SheetValue[]] => [
      'item',
      withYear(line.label, costs[index] ?? []),
    ]),
    ['total', withYear('Итого расходы', spent)],
    [
      'result',
      withYear(
        'Прибыль',
        earned.map((value, month) => value - (spent[month] ?? 0) - 620),
      ),
    ],
  ];

  return lines.map(([kind, cells], index) => ({ index, kind, cells }));
};

const SHEET_ROWS: readonly SheetRow[] = buildRows();

const textOf = (value: SheetValue): string =>
  typeof value === 'number' ? numbers.format(value) : (value ?? '');

const SHEET_COLUMNS: NuiTableColumnDef<SheetRow>[] = [...LETTERS].map((letter, col) => ({
  key: letter,
  label: letter,
  type: 'text',
  width: col === 0 ? LABEL_WIDTH : VALUE_WIDTH,
  pin: col === 0 ? 'start' : undefined,
  sortable: false,
  filter: false,
  value: (row) => textOf(row.cells[col] ?? null),
}));

const COLUMN_INDEX = new Map([...LETTERS].map((letter, col) => [letter, col]));
const QUARTER_COLUMNS = 4;
const LATER_MONTHS: readonly string[] = [...LETTERS].slice(QUARTER_COLUMNS, -1);
const NO_COLUMNS: readonly string[] = [];

const PEAK = Math.max(
  ...SHEET_ROWS.flatMap((row) =>
    row.kind === 'item' ? row.cells.slice(1, -1).map((value) => Number(value)) : [],
  ),
);

const shown = ref(false);
const bordered = ref(true);
const heat = ref(false);
const windowed = ref(false);
const quarter = ref(false);
const ranges = ref<NuiTableRanges>([]);
const output = computed(() => JSON.stringify({ ranges: ranges.value }));

const heatOf = (value: number): string =>
  `color-mix(in oklab, var(--nui-success) ${Math.round((Math.max(0, value) / PEAK) * HEAT_LIMIT)}%, transparent)`;

const numberStyle = (value: SheetValue, warm: boolean): NuiTableCellStyle =>
  typeof value === 'number'
    ? {
        align: 'end',
        color: value < 0 ? 'var(--nui-error)' : undefined,
        fill: warm ? heatOf(value) : undefined,
      }
    : {};

const isMonth = (col: number): boolean => col > 0 && col < LETTERS.length - 1;

const PAINTERS: Readonly<
  Record<SheetRowKind, (value: SheetValue, col: number) => NuiTableCellStyle>
> = {
  title: () => TITLE,
  head: (_, col) => (col === 0 ? HEAD_LABEL : HEAD_MONTH),
  section: () => SECTION,
  item: (value, col) => numberStyle(value, heat.value && isMonth(col)),
  total: (value) => ({ ...numberStyle(value, false), ...TOTAL }),
  result: (value) => ({ ...numberStyle(value, false), ...RESULT }),
};

const styleOf = ({ row, column }: NuiTableCellRef<SheetRow>): NuiTableCellStyle => {
  const col = COLUMN_INDEX.get(column.key) ?? 0;

  return PAINTERS[row.kind](row.cells[col] ?? null, col);
};
</script>
