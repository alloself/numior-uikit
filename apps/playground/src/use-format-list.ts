import type { NuiSpreadsheetExposed, NuiSpreadsheetSelection } from '@numior/spreadsheet';
import {
  createCellEditor,
  currencyFormat,
  type NumberLocale,
  type Sheet,
  type WorkbookStep,
} from '@numior/spreadsheet/core';
import type { NuiOption } from '@numior/vue';
import { computed, ref, type ComputedRef, type Ref } from 'vue';
import type { SampleBook } from './book-sample';

interface FormatListOptions {
  readonly sample: SampleBook;
  readonly sheet: Ref<number>;
  readonly selection: Ref<NuiSpreadsheetSelection | undefined>;
  readonly target: () => NuiSpreadsheetExposed | null;
}

interface FormatList {
  readonly options: ComputedRef<readonly NuiOption[]>;
  readonly current: ComputedRef<string | undefined>;
  choose(code: unknown): void;
  touch(): void;
}

const presetsOf = (numbers: NumberLocale): readonly NuiOption[] => [
  { value: 'General', label: 'Общий' },
  { value: '#,##0.00', label: 'Числовой' },
  { value: currencyFormat(numbers, 2), label: 'Денежный' },
  { value: '0.00%', label: 'Процентный' },
  { value: numbers.shortDate, label: 'Дата' },
  { value: numbers.longTime, label: 'Время' },
  { value: `${numbers.shortDate} ${numbers.shortTime}`, label: 'Дата и время' },
  { value: '# ?/?', label: 'Дробный' },
  { value: '0.00E+00', label: 'Экспоненциальный' },
  { value: '@', label: 'Текстовый' },
];

export const useFormatList = (options: FormatListOptions): FormatList => {
  const editor = createCellEditor(options.sample.book, options.sample.calculator);

  const revision = ref(0);

  const shownSheet = (): Sheet | undefined =>
    revision.value >= 0 ? options.sample.book.sheets[options.sheet.value] : undefined;

  const activeCell = () => options.selection.value?.active;

  const selectedRanges = () => options.selection.value?.ranges ?? [];

  const current = computed((): string | undefined => {
    const sheet = shownSheet();
    const active = activeCell();

    return sheet === undefined || active === undefined
      ? undefined
      : editor.formatAt(sheet, active.row, active.col);
  });

  const listed = computed((): readonly NuiOption[] => {
    const presets = presetsOf(options.sample.calculator.locale.numbers);
    const code = current.value;

    return code === undefined || presets.some((preset) => preset.value === code)
      ? presets
      : [...presets, { value: code, label: `Свой: ${code}` }];
  });

  const touch = (): void => {
    revision.value += 1;
  };

  const stepsFor = (sheet: Sheet | undefined, code: unknown): WorkbookStep[] =>
    typeof code === 'string' && sheet !== undefined
      ? selectedRanges().map((range) => editor.formatStep(sheet, range, code))
      : [];

  const choose = (code: unknown): void => {
    const steps = stepsFor(shownSheet(), code);

    if (steps.length === 0) {
      return;
    }

    options.target()?.apply(steps);
    touch();
  };

  return { options: listed, current, choose, touch };
};
