<template>
  <section class="panel" aria-labelledby="formulas-title">
    <div class="section-heading">
      <h2 id="formulas-title">Формулы</h2>
      <span class="tag"
        >NuiSpreadsheet · createCalculator · граф зависимостей · разлив · пересчёт кусками</span
      >
    </div>
    <div class="data-row">
      <NuiToggleGroup
        :model-value="localeName"
        :items="LOCALES"
        variant="segmented"
        required
        label="Локаль книги"
        data-testid="formulas-locale"
        @update:model-value="switchLocale"
      />
      <NuiButton
        variant="outline"
        tone="neutral"
        :disabled="loader.busy.value"
        data-testid="formulas-recalc"
        @click="recalculate"
      >
        Пересчитать
      </NuiButton>
      <NuiButton
        variant="outline"
        tone="neutral"
        :disabled="loader.busy.value || loaded"
        data-testid="formulas-load"
        @click="fillLoad"
      >
        20 000 строк
      </NuiButton>
      <NuiSelect
        :model-value="formats.current.value"
        :options="formats.options.value"
        :disabled="formats.current.value === undefined"
        aria-label="Формат ячеек"
        class="formulas-format"
        data-testid="formulas-format"
        @update:model-value="formats.choose"
      />
      <div v-if="loader.progress.value" class="formulas-progress">
        <NuiProgress
          :value="loader.progress.value.done"
          :max="loader.progress.value.total"
          size="sm"
          label="Пересчёт"
          data-testid="formulas-progress"
        />
      </div>
    </div>
    <NuiSpreadsheet
      ref="sheet"
      :book="sample.book"
      :calculator="sample.calculator"
      v-model:sheet="sheetIndex"
      v-model:selection="selection"
      :locale="locale"
      label="Лист с формулами"
      data-testid="formulas"
      @change="onChange"
    />
    <p role="status" class="formulas-status" data-testid="formulas-status">
      {{ loader.status.value }}
    </p>
  </section>
</template>

<script setup lang="ts">
import {
  NuiSpreadsheet,
  type NuiSpreadsheetExposed,
  type NuiSpreadsheetSelection,
} from '@numior/spreadsheet';
import { EN_LOCALE, RU_LOCALE } from '@numior/spreadsheet/core';
import { NuiButton, NuiProgress, NuiSelect, NuiToggleGroup, type NuiToggleItem } from '@numior/vue';
import { computed, markRaw, ref, shallowRef, useTemplateRef } from 'vue';
import { LOAD_SHEET, formulaSample } from './formula-sample';
import { useFormatList } from './use-format-list';
import { useSheetLoad } from './use-sheet-load';

const LOCALES: readonly NuiToggleItem[] = [
  { value: 'ru', label: 'RU' },
  { value: 'en', label: 'EN' },
];

const sample = markRaw(formulaSample());

const sheet = useTemplateRef<NuiSpreadsheetExposed>('sheet');
const sheetIndex = ref(0);
const localeName = ref('ru');
const loaded = ref(false);
const selection = shallowRef<NuiSpreadsheetSelection>();

const locale = computed(() => (localeName.value === 'en' ? EN_LOCALE : RU_LOCALE));

const formats = useFormatList({
  sample,
  sheet: sheetIndex,
  selection,
  target: () => sheet.value,
});

const loader = useSheetLoad(sample, () => {
  sheet.value?.refresh();
});

const switchLocale = (value: unknown): void => {
  if (value !== 'ru' && value !== 'en') {
    return;
  }

  localeName.value = value;
  sample.calculator.setLocale(locale.value);
  formats.touch();
  void loader.recalculate();
};

const recalculate = (): void => {
  void loader.recalculate();
};

const fillLoad = (): void => {
  const index = sample.book.sheets.findIndex((item) => item.name === LOAD_SHEET);
  const target = sample.book.sheets[index];

  if (target === undefined) {
    return;
  }

  loaded.value = true;
  sheetIndex.value = index;
  void loader.load(target);
};

const onChange = (): void => {
  formats.touch();
  void loader.recalculate();
};
</script>
