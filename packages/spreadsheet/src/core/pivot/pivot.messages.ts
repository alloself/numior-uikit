import type { PivotAggregate, PivotCaptions, PivotLanguage } from './pivot.types';

const CAPTIONS: Readonly<Record<PivotLanguage, PivotCaptions>> = {
  en: {
    rows: 'Row Labels',
    columns: 'Column Labels',
    values: 'Values',
    total: 'Total',
    grandTotal: 'Grand Total',
    blank: '(blank)',
    all: '(All)',
    multiple: '(Multiple Items)',
  },
  ru: {
    rows: 'Названия строк',
    columns: 'Названия столбцов',
    values: 'Значения',
    total: 'Итог',
    grandTotal: 'Общий итог',
    blank: '(пусто)',
    all: '(Все)',
    multiple: '(несколько элементов)',
  },
};

const VALUE_NAMES: Readonly<Record<PivotLanguage, Readonly<Record<PivotAggregate, string>>>> = {
  en: {
    sum: 'Sum of',
    count: 'Count of',
    average: 'Average of',
    max: 'Max of',
    min: 'Min of',
    product: 'Product of',
    countNums: 'Count of',
    stdDev: 'StdDev of',
    stdDevp: 'StdDevp of',
    var: 'Var of',
    varp: 'Varp of',
  },
  ru: {
    sum: 'Сумма по полю',
    count: 'Количество по полю',
    average: 'Среднее по полю',
    max: 'Максимум по полю',
    min: 'Минимум по полю',
    product: 'Произведение по полю',
    countNums: 'Количество чисел по полю',
    stdDev: 'Стандартное отклонение по полю',
    stdDevp: 'Стандартное отклонение совокупности по полю',
    var: 'Дисперсия по полю',
    varp: 'Дисперсия совокупности по полю',
  },
};

export const pivotCaptions = (language: PivotLanguage): PivotCaptions => CAPTIONS[language];

export const pivotValueName = (
  aggregate: PivotAggregate,
  field: string,
  language: PivotLanguage,
): string => `${VALUE_NAMES[language][aggregate]} ${field}`;
