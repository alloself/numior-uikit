<template>
  <section class="panel" aria-labelledby="formulas-title">
    <div class="section-heading">
      <h2 id="formulas-title">Формулы</h2>
      <span class="tag"
        >@numior/spreadsheet/core · createCalculator · граф зависимостей · разлив · пересчёт
        кусками</span
      >
    </div>
    <div class="data-row">
      <NuiButton
        size="sm"
        variant="outline"
        tone="neutral"
        data-testid="formulas-toggle"
        @click="toggle"
      >
        {{ book ? 'Скрыть лист' : 'Показать лист' }}
      </NuiButton>
    </div>
    <div v-if="book" ref="area" class="sheet-area">
      <div class="sheet-bar">
        <span class="sheet-name" data-testid="formulas-name">{{ nameOf(active) }}</span>
        <div ref="bar" class="sheet-formula">
          <NuiInput
            :model-value="barText"
            size="sm"
            dir="ltr"
            aria-label="Содержимое ячейки"
            data-testid="formulas-formula"
            @update:model-value="onBarInput"
            @focus="onBarFocus"
            @keydown="onBarKeydown"
            @blur="onBarBlur"
          />
        </div>
        <div class="sheet-format">
          <NuiSelect
            :model-value="formatPreset"
            :options="formatOptions"
            size="sm"
            aria-label="Формат ячеек"
            data-testid="formulas-format"
            @update:model-value="applyFormat"
          />
        </div>
        <NuiToggleGroup
          :model-value="localeName"
          :items="LOCALES"
          variant="segmented"
          size="sm"
          required
          label="Локаль книги"
          data-testid="formulas-locale"
          @update:model-value="switchLocale"
        />
        <NuiButton
          size="sm"
          variant="outline"
          tone="neutral"
          data-testid="formulas-recalc"
          @click="recalculate"
        >
          Пересчитать
        </NuiButton>
        <NuiButton
          size="sm"
          variant="outline"
          tone="neutral"
          :disabled="loaded"
          data-testid="formulas-load"
          @click="fillLoad"
        >
          20 000 строк
        </NuiButton>
      </div>
      <NuiTable
        v-if="cells"
        :key="current"
        ref="sheet"
        v-model:ranges="ranges"
        v-model:active="active"
        v-model:draft="draft"
        v-bind="cells"
        :keep-editing="inBar"
        :column-menu="false"
        bordered
        size="sm"
        height="20rem"
        :picking="picking"
        label="Лист с формулами"
        data-testid="formulas"
        @edit="onEdit"
        @pick="onPick"
      >
        <template #overlay="{ rectOf }">
          <div
            v-for="box in referenceBoxes(rectOf, formulaReferences)"
            :key="box.key"
            class="sheet-ref"
            :style="box.style"
          ></div>
        </template>
      </NuiTable>
      <div class="sheet-foot">
        <NuiToggleGroup
          v-model="current"
          :items="sheetItems"
          variant="segmented"
          size="sm"
          required
          label="Листы"
          data-testid="formulas-sheets"
        />
        <NuiProgress
          v-if="progress"
          class="sheet-progress"
          :value="progress.done"
          :max="progress.total"
          size="sm"
          label="Пересчёт"
          data-testid="formulas-progress"
        />
        <span class="sheet-status" role="status" data-testid="formulas-status">{{ status }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, useTemplateRef } from 'vue';
import {
  NuiButton,
  NuiInput,
  NuiProgress,
  NuiSelect,
  NuiToggleGroup,
  type NuiOption,
  type NuiToggleItem,
} from '@numior/vue';
import {
  NuiTable,
  columnIndex,
  tableCells,
  type NuiTableCells,
  type NuiTableCellSource,
  type NuiTableEditEvent,
  type NuiTableExposed,
  type NuiTableRanges,
  type TableCellPosition,
} from '@numior/table';
import {
  EN_LOCALE,
  RU_LOCALE,
  type CellRange,
  type Recalculation,
  type Sheet,
} from '@numior/spreadsheet/core';
import {
  createFormulaBook,
  FORMULA_COLS,
  FORMULA_ROWS,
  presetCode,
  type FormatPreset,
  type FormulaBook,
} from './formula-book';
import { referenceBoxes } from './sheet-references';
import { useFormulaBar } from './use-formula-bar';

interface Progress {
  readonly done: number;
  readonly total: number;
}

const VISIBLE = { top: 0, left: 0, bottom: 40, right: FORMULA_COLS - 1 };

const PRESETS: readonly (readonly [FormatPreset, string])[] = [
  ['general', 'Общий'],
  ['number', 'Числовой'],
  ['money', 'Денежный'],
  ['percent', 'Процентный'],
  ['date', 'Дата'],
  ['time', 'Время'],
  ['datetime', 'Дата и время'],
  ['fraction', 'Дробный'],
  ['scientific', 'Экспоненциальный'],
  ['text', 'Текстовый'],
];

const LOCALES: readonly NuiToggleItem[] = [
  { value: 'ru', label: 'RU' },
  { value: 'en', label: 'EN' },
];

const CUSTOM = 'custom';

const book = shallowRef<FormulaBook>();
const current = ref('Бюджет');
const ranges = ref<NuiTableRanges>([]);
const status = ref('');
const progress = shallowRef<Progress>();
const loaded = ref(false);
const localeName = ref('ru');
const sheet = useTemplateRef<NuiTableExposed>('sheet');
const area = useTemplateRef<HTMLElement>('area');
const bar = useTemplateRef<HTMLElement>('bar');

let latest: Recalculation | undefined;

const currentSheet = (): Sheet | undefined =>
  book.value?.sheets.find((candidate) => candidate.name === current.value);

const textAt = (position: TableCellPosition): string => {
  const target = currentSheet();

  return target === undefined
    ? ''
    : (book.value?.inputAt(target, position.row, position.col) ?? '');
};

const referencesOf = (formula: string) => {
  const target = currentSheet();

  return target === undefined ? [] : (book.value?.referencesOf(target, formula) ?? []);
};

const {
  active,
  draft,
  barText,
  formulaReferences,
  nameOf,
  picking,
  inBar,
  onPick,
  onBarFocus,
  onBarInput,
  onBarKeydown,
  onBarBlur,
} = useFormulaBar({ sheet, area, bar, textAt, referencesOf });

const activeCode = computed(() => {
  const target = currentSheet();
  const cell = active.value;

  return target === undefined || cell === undefined
    ? 'General'
    : (book.value?.formatAt(target, cell.row, cell.col) ?? 'General');
});

const localeOf = (name: string) => (name === 'en' ? EN_LOCALE : RU_LOCALE);

const presetOf = (code: string): string =>
  PRESETS.find(
    ([preset]) => presetCode(preset, localeOf(localeName.value).numbers) === code,
  )?.[0] ?? CUSTOM;

const formatPreset = computed(() => presetOf(activeCode.value));

const formatOptions = computed<NuiOption<string>[]>(() => [
  ...PRESETS.map(([value, label]) => ({ value, label })),
  ...(formatPreset.value === CUSTOM ? [{ value: CUSTOM, label: `Свой: ${activeCode.value}` }] : []),
]);

const isPreset = (value: string): value is FormatPreset =>
  PRESETS.some(([preset]) => preset === value);

const rangeOfSelection = (from: TableCellPosition, to: TableCellPosition): CellRange => ({
  top: Math.min(from.row, to.row),
  left: Math.min(from.col, to.col),
  bottom: Math.max(from.row, to.row),
  right: Math.max(from.col, to.col),
});

const selectedRanges = (): CellRange[] => {
  const cell = active.value;

  if (ranges.value.length > 0) {
    return ranges.value.map((range) => rangeOfSelection(range.from, range.to));
  }
  return cell === undefined ? [] : [rangeOfSelection(cell, cell)];
};

const refreshBar = (): void => {
  if (active.value !== undefined) {
    active.value = { ...active.value };
  }
};

const formatSelection = (preset: FormatPreset): void => {
  const target = currentSheet();
  const opened = book.value;

  if (target !== undefined && opened !== undefined) {
    opened.applyFormat(
      target,
      selectedRanges(),
      presetCode(preset, opened.calculator.locale.numbers),
    );

    sheet.value?.invalidate();
    refreshBar();
  }
};

const applyFormat = (value: unknown): void => {
  if (typeof value === 'string' && isPreset(value)) {
    formatSelection(value);
  }
};

const switchLocale = (value: unknown): void => {
  if (typeof value !== 'string' || book.value === undefined) {
    return;
  }
  localeName.value = value;
  book.value.setLocale(localeOf(value));
  recalculate();
  refreshBar();
};

const sheetItems = computed<readonly NuiToggleItem[]>(() =>
  (book.value?.sheets ?? []).map((item) => ({ value: item.name, label: item.name })),
);

const sourceOf = (opened: FormulaBook, target: Sheet): NuiTableCellSource => ({
  rows: FORMULA_ROWS,
  cols: FORMULA_COLS,
  cellAt: (row, col) => ({
    text: opened.displayAt(target, row, col),
    style: opened.styleAt(target, row, col),
  }),
});

const cellsOf = (opened: FormulaBook, target: Sheet): NuiTableCells => {
  const source = tableCells(sourceOf(opened, target));

  return {
    ...source,
    columns: source.columns.map((column, col) =>
      column.type === 'text'
        ? {
            ...column,
            editable: true,
            value: (row: number) => opened.inputAt(target, row, col),
            format: (_text: string, row: number | undefined) =>
              row === undefined ? '' : opened.displayAt(target, row, col),
          }
        : column,
    ),
  };
};

const cells = computed(() => {
  const target = currentSheet();

  return book.value === undefined || target === undefined ? undefined : cellsOf(book.value, target);
});

const report = (run: Recalculation, started: number): void => {
  const unknown = book.value?.calculator.limitations.map((item) => item.name) ?? [];

  const parts = [
    `Пересчитано формул: ${String(run.done)}`,
    `работа ${String(Math.round(run.busyMs))} мс`,
    `до конца ${String(Math.round(performance.now() - started))} мс`,
    unknown.length > 0 ? `неизвестные функции: ${unknown.join(', ')}` : '',
  ];

  status.value = parts.filter((part) => part !== '').join(' · ');
};

const settle = (run: Recalculation, started: number): void => {
  if (latest === run) {
    progress.value = undefined;
    latest = undefined;
    sheet.value?.invalidate();
    report(run, started);
  }
};

const follow = (run: Recalculation, started: number): void => {
  const tick = (): void => {
    if (latest !== run) {
      return;
    }
    progress.value = { done: run.done, total: run.total };
    sheet.value?.invalidate();
    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);

  void run.settled.then(() => settle(run, started));
};

const recalculate = (): void => {
  const target = currentSheet();
  const started = performance.now();

  if (book.value === undefined || target === undefined) {
    return;
  }

  const run = book.value.calculator.recalculate({
    viewport: { sheet: target, range: VISIBLE },
  });

  latest = run;
  sheet.value?.invalidate();
  if (run.done < run.total) {
    progress.value = { done: run.done, total: run.total };
    follow(run, started);
  } else {
    latest = undefined;
    progress.value = undefined;
    report(run, started);
  }
};

const textOf = (value: unknown): string => (typeof value === 'string' ? value : '');

const onEdit = (event: NuiTableEditEvent<number>): void => {
  const target = currentSheet();
  const opened = book.value;

  if (opened === undefined || target === undefined) {
    return;
  }

  const problems = event.changes.flatMap((change) => {
    const col = columnIndex(change.key);
    const problem = opened.enter(target, change.row, col, textOf(change.value));

    return problem === undefined ? [] : [`${change.key}${String(change.row + 1)}: ${problem}`];
  });

  recalculate();
  if (problems.length > 0) {
    status.value = `Формула не разобрана — ${problems.join(', ')}`;
  }
};

const fillLoad = (): void => {
  const opened = book.value;

  if (opened !== undefined) {
    current.value = opened.fillLoad().name;
    loaded.value = true;
    recalculate();
  }
};

const toggle = (): void => {
  if (book.value === undefined) {
    book.value = createFormulaBook();
    localeName.value = 'ru';
    recalculate();
  } else {
    book.value = undefined;
    latest = undefined;
    progress.value = undefined;
    status.value = '';
    loaded.value = false;
  }
  ranges.value = [];
};
</script>
