<template>
  <section class="panel" aria-labelledby="table-sheet-title">
    <div class="section-heading">
      <h2 id="table-sheet-title">Лист</h2>
      <span class="tag"
        >NuiTable · bordered · cellStyle · rowHeaders · rowHeights · merges · overflow · frozenRows
        · overlay</span
      >
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
        <NuiSwitch v-model="long" data-testid="table-sheet-long">Журнал</NuiSwitch>
        <NuiSwitch v-model="frozen" data-testid="table-sheet-frozen">Закрепить шапку</NuiSwitch>
        <NuiSwitch v-model="refs" data-testid="table-sheet-refs">Ссылки</NuiSwitch>
      </div>
      <NuiTable
        ref="sheet"
        v-model:ranges="ranges"
        v-model:row-heights="rowHeights"
        :columns="SHEET_COLUMNS"
        :rows="long ? LONG_ROWS : SHEET_ROWS"
        :get-key="(row) => row.index"
        :cell-style="styleOf"
        :merges="merges"
        :bordered="bordered"
        :row-headers="ROW_HEADERS"
        :frozen-rows="frozen ? FROZEN_ROWS : 0"
        :hidden="quarter ? LATER_MONTHS : NO_COLUMNS"
        :height="windowed ? '18rem' : undefined"
        :column-menu="false"
        size="sm"
        label="Бюджет"
        data-testid="table-sheet"
        @pointermove="onPointer"
        @pointerleave="pointer = ''"
      >
        <template v-if="refs" #overlay="{ rectOf }">
          <div
            v-for="box in referenceBoxes(rectOf)"
            :key="box.key"
            class="sheet-ref"
            :style="box.style"
          ></div>
        </template>
      </NuiTable>
      <pre class="output" data-testid="table-sheet-output">{{ output }}</pre>
      <p class="output" data-testid="table-sheet-pointer">{{ pointer }}</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { NuiButton, NuiSwitch } from '@numior/vue';
import {
  NuiTable,
  type NuiTableCellRef,
  type NuiTableCellStyle,
  type NuiTableColumnDef,
  type NuiTableExposed,
  type NuiTableRect,
  type NuiTableRange,
  type NuiTableRanges,
  type NuiTableRowHeights,
} from '@numior/table';

type SheetValue = string | number | null;
type SheetRowKind = 'title' | 'head' | 'section' | 'item' | 'total' | 'result' | 'note';

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

interface SheetReference {
  readonly range: NuiTableRange;
  readonly tone: string;
}

interface SheetBlock {
  readonly top: number;
  readonly bottom: number;
}

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
const LETTERS = 'ABCDEFGHIJKLMNO';
const LABEL_WIDTH = 190;
const VALUE_WIDTH = 92;
const NOTE_WIDTH = 170;
const NOTE = LETTERS.length - 1;
const HEAT_LIMIT = 45;
const INCOME_NOTE = 'Рост держат подписки';
const COSTS_NOTE = 'Маркетинг растёт быстрее выручки';
const JOURNAL_NOTE = 'Операции сверены с банком';
const FOOTNOTE = 'Прибыль посчитана после постоянных расходов: 620 тыс. ₽ в месяц';
const JOURNAL = 60;
const FROZEN_ROWS = 2;
const BANDS: readonly number[] = [0, 2, 7];

const NOTES: readonly SheetBlock[] = [
  { top: 3, bottom: 5 },
  { top: 8, bottom: 12 },
];

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

const NOTE_STYLE: NuiTableCellStyle = {
  color: 'var(--nui-text-muted)',
  align: 'center',
  wrap: true,
};

const FOOTNOTE_STYLE: NuiTableCellStyle = { color: 'var(--nui-text-muted)', overflow: true };
const TOTAL: NuiTableCellStyle = { style: BOLD, borders: { top: '1px solid var(--nui-text)' } };
const RESULT: NuiTableCellStyle = { style: BOLD, borders: { top: '3px double var(--nui-text)' } };
const PLAIN: NuiTableCellStyle = {};
const numbers = new Intl.NumberFormat('ru-RU');

const monthsOf = (line: SheetLine, shift: number): number[] =>
  MONTHS.map((_, month) => line.base + line.step * month + ((month * 53 + shift * 17) % 61) - 30);

const sumOf = (values: readonly number[]): number => values.reduce((sum, value) => sum + value, 0);

const withYear = (label: string, months: readonly number[], note: string | null): SheetValue[] => [
  label,
  ...months,
  sumOf(months),
  note,
];

const totalsOf = (lines: readonly (readonly number[])[]): number[] =>
  MONTHS.map((_, month) => sumOf(lines.map((line) => line[month] ?? 0)));

const blank = (label: string): SheetValue[] => [label, ...MONTHS.map(() => null), null, null];

const itemsOf = (
  lines: readonly SheetLine[],
  months: readonly (readonly number[])[],
  note: string,
): Array<[SheetRowKind, SheetValue[]]> =>
  lines.map((line, index) => [
    'item',
    withYear(line.label, months[index] ?? [], index === 0 ? note : null),
  ]);

const journalLine = (index: number): [SheetRowKind, SheetValue[]] => [
  'item',
  withYear(
    `Операция ${index + 1}`,
    monthsOf({ label: '', base: 20 + (index % 7) * 9, step: (index % 5) - 2 }, index),
    index === 0 ? JOURNAL_NOTE : null,
  ),
];

const journalOf = (): Array<[SheetRowKind, SheetValue[]]> => [
  ['section', blank('Журнал операций')],
  ...Array.from({ length: JOURNAL }, (_, index) => journalLine(index)),
];

const buildRows = (journal: boolean): SheetRow[] => {
  const income = INCOME.map((line, index) => monthsOf(line, index));
  const costs = COSTS.map((line, index) => monthsOf(line, index + INCOME.length));
  const earned = totalsOf(income);
  const spent = totalsOf(costs);

  const lines: Array<[SheetRowKind, SheetValue[]]> = [
    ['title', blank('Бюджет на 2026 год, тыс. ₽')],
    ['head', ['Статья', ...MONTHS, 'Год', 'Комментарий']],
    ['section', blank('Доходы')],
    ...itemsOf(INCOME, income, INCOME_NOTE),
    ['total', withYear('Итого доходы', earned, null)],
    ['section', blank('Расходы')],
    ...itemsOf(COSTS, costs, COSTS_NOTE),
    ['total', withYear('Итого расходы', spent, null)],
    [
      'result',
      withYear(
        'Прибыль',
        earned.map((value, month) => value - (spent[month] ?? 0) - 620),
        null,
      ),
    ],
    ['note', ['Примечание', FOOTNOTE, ...MONTHS.slice(1).map(() => null), null, null]],
    ...(journal ? journalOf() : []),
  ];

  return lines.map(([kind, cells], index) => ({ index, kind, cells }));
};

const SHEET_ROWS: readonly SheetRow[] = buildRows(false);
const LONG_ROWS: readonly SheetRow[] = buildRows(true);
const JOURNAL_BAND = SHEET_ROWS.length;
const JOURNAL_BLOCK: SheetBlock = { top: JOURNAL_BAND + 1, bottom: JOURNAL_BAND + JOURNAL };

const textOf = (value: SheetValue): string =>
  typeof value === 'number' ? numbers.format(value) : (value ?? '');

const widthOf = (col: number): number => {
  if (col === NOTE) {
    return NOTE_WIDTH;
  }
  return col === 0 ? LABEL_WIDTH : VALUE_WIDTH;
};

const SHEET_COLUMNS: NuiTableColumnDef<SheetRow>[] = [...LETTERS].map((letter, col) => ({
  key: letter,
  label: letter,
  type: 'text',
  width: widthOf(col),
  pin: col === 0 ? 'start' : undefined,
  sortable: false,
  filter: false,
  value: (row) => textOf(row.cells[col] ?? null),
}));

const COLUMN_INDEX = new Map([...LETTERS].map((letter, col) => [letter, col]));
const ROW_HEADERS = { resizable: true };
const QUARTER_COLUMNS = 4;
const LATER_MONTHS: readonly string[] = [...LETTERS].slice(QUARTER_COLUMNS, MONTHS.length + 1);
const NO_COLUMNS: readonly string[] = [];

const REFERENCES: readonly SheetReference[] = [
  { range: { from: { row: 3, col: 1 }, to: { row: 5, col: 3 } }, tone: 'var(--nui-primary)' },
  { range: { from: { row: 6, col: 1 }, to: { row: 6, col: 3 } }, tone: 'var(--nui-success)' },
];

const PEAK = Math.max(
  ...SHEET_ROWS.flatMap((row) =>
    row.kind === 'item' ? row.cells.slice(1, MONTHS.length + 1).map((value) => Number(value)) : [],
  ),
);

const shown = ref(false);
const bordered = ref(true);
const heat = ref(false);
const windowed = ref(false);
const quarter = ref(false);
const long = ref(false);
const frozen = ref(false);
const refs = ref(false);
const pointer = ref('');
const sheet = useTemplateRef<NuiTableExposed>('sheet');
const ranges = ref<NuiTableRanges>([]);
const rowHeights = ref<NuiTableRowHeights>({ 0: 44 });

const shownKeys = computed(() => {
  const hidden = new Set(quarter.value ? LATER_MONTHS : NO_COLUMNS);

  return [...LETTERS].filter((letter) => !hidden.has(letter));
});

const referenceBoxes = (rectOf: (range: NuiTableRange) => NuiTableRect | undefined) =>
  REFERENCES.flatMap((reference) => {
    const rect = rectOf(reference.range);

    return rect === undefined
      ? []
      : [
          {
            key: reference.tone,
            style: {
              '--_ref': reference.tone,
              insetBlockStart: `${rect.top}px`,
              insetInlineStart: `${rect.start}px`,
              inlineSize: `${rect.width}px`,
              blockSize: `${rect.height}px`,
            },
          },
        ];
  });

const onPointer = (event: PointerEvent): void => {
  const cell = sheet.value?.cellFromPoint(event.clientX, event.clientY);

  pointer.value = cell === undefined ? '' : `${shownKeys.value[cell.col] ?? ''}${cell.row + 1}`;
};

const output = computed(() =>
  JSON.stringify({ ranges: ranges.value, rowHeights: rowHeights.value }),
);

const merges = computed((): NuiTableRange[] => {
  const last = LETTERS.length - 1 - (quarter.value ? LATER_MONTHS.length : 0);
  const bands = long.value ? [...BANDS, JOURNAL_BAND] : BANDS;
  const notes = long.value ? [...NOTES, JOURNAL_BLOCK] : NOTES;

  return [
    ...bands.map((row) => ({ from: { row, col: 0 }, to: { row, col: last } })),
    ...notes.map(({ top, bottom }) => ({
      from: { row: top, col: last },
      to: { row: bottom, col: last },
    })),
  ];
});

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

const isMonth = (col: number): boolean => col > 0 && col <= MONTHS.length;

const itemStyle = (value: SheetValue, col: number): NuiTableCellStyle =>
  col === NOTE ? NOTE_STYLE : numberStyle(value, heat.value && isMonth(col));

const PAINTERS: Readonly<
  Record<SheetRowKind, (value: SheetValue, col: number) => NuiTableCellStyle>
> = {
  title: () => TITLE,
  head: (_, col) => (col === 0 ? HEAD_LABEL : HEAD_MONTH),
  section: () => SECTION,
  item: itemStyle,
  total: (value) => ({ ...numberStyle(value, false), ...TOTAL }),
  result: (value) => ({ ...numberStyle(value, false), ...RESULT }),
  note: (_, col) => (col === 1 ? FOOTNOTE_STYLE : PLAIN),
};

const styleOf = ({ row, column }: NuiTableCellRef<SheetRow>): NuiTableCellStyle => {
  const col = COLUMN_INDEX.get(column.key) ?? 0;

  return PAINTERS[row.kind](row.cells[col] ?? null, col);
};
</script>
