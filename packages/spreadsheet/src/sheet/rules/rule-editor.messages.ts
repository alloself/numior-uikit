import type { NuiMessageCatalog } from '@numior/primitives';
import type { CellIsOperator, TextOperator } from '../../core/conditional/conditional.types';
import type { AverageChoice, RuleField, RuleFormKind } from './rules.types';

export interface NuiSpreadsheetRuleEditorMessages {
  readonly newRule: string;
  readonly changeRule: string;
  readonly applyTo: string;
  readonly ruleKind: string;
  readonly kind: (params: { readonly kind: RuleFormKind }) => string;
  readonly operator: string;
  readonly operatorName: (params: { readonly operator: CellIsOperator }) => string;
  readonly textOperatorName: (params: { readonly operator: TextOperator }) => string;
  readonly averageName: (params: { readonly choice: AverageChoice }) => string;
  readonly value: string;
  readonly secondValue: string;
  readonly formula: string;
  readonly text: string;
  readonly period: string;
  readonly edge: string;
  readonly edgeName: (params: { readonly bottom: boolean }) => string;
  readonly rank: string;
  readonly percent: string;
  readonly look: string;
  readonly preset: (params: { readonly preset: string }) => string;
  readonly bold: string;
  readonly italic: string;
  readonly strike: string;
  readonly textColor: string;
  readonly fillColor: string;
  readonly noColor: string;
  readonly swatch: (params: { readonly slot: number; readonly tint: number }) => string;
  readonly stops: (params: { readonly count: number }) => readonly string[];
  readonly barColor: string;
  readonly icons: string;
  readonly iconSetName: (params: { readonly set: string }) => string;
  readonly showValue: string;
  readonly stopIfTrue: string;
  readonly save: string;
  readonly cancel: string;
  readonly saved: string;
  readonly error: (params: { readonly field: RuleField }) => string;
}

const EN_KINDS: Readonly<Record<RuleFormKind, string>> = {
  cellIs: 'Cell value',
  expression: 'Formula',
  text: 'Text',
  timePeriod: 'Date',
  top: 'Top or bottom values',
  aboveAverage: 'Above or below average',
  duplicates: 'Duplicate values',
  uniques: 'Unique values',
  blanks: 'Blank cells',
  filled: 'Cells that are not blank',
  errors: 'Cells with errors',
  noErrors: 'Cells without errors',
  twoColorScale: '2-colour scale',
  threeColorScale: '3-colour scale',
  dataBar: 'Data bars',
  iconSet: 'Icon set',
};

const RU_KINDS: Readonly<Record<RuleFormKind, string>> = {
  cellIs: 'Значение ячейки',
  expression: 'Формула',
  text: 'Текст',
  timePeriod: 'Дата',
  top: 'Первые или последние',
  aboveAverage: 'Выше или ниже среднего',
  duplicates: 'Повторяющиеся значения',
  uniques: 'Уникальные значения',
  blanks: 'Пустые ячейки',
  filled: 'Непустые ячейки',
  errors: 'Ячейки с ошибками',
  noErrors: 'Ячейки без ошибок',
  twoColorScale: 'Двухцветная шкала',
  threeColorScale: 'Трёхцветная шкала',
  dataBar: 'Гистограммы',
  iconSet: 'Набор значков',
};

const EN_OPERATORS: Readonly<Record<CellIsOperator, string>> = {
  between: 'between',
  notBetween: 'not between',
  equal: 'equal to',
  notEqual: 'not equal to',
  greaterThan: 'greater than',
  lessThan: 'less than',
  greaterThanOrEqual: 'greater than or equal to',
  lessThanOrEqual: 'less than or equal to',
};

const RU_OPERATORS: Readonly<Record<CellIsOperator, string>> = {
  between: 'между',
  notBetween: 'вне диапазона',
  equal: 'равно',
  notEqual: 'не равно',
  greaterThan: 'больше',
  lessThan: 'меньше',
  greaterThanOrEqual: 'больше или равно',
  lessThanOrEqual: 'меньше или равно',
};

const EN_TEXT_OPERATORS: Readonly<Record<TextOperator, string>> = {
  contains: 'contains',
  notContains: 'does not contain',
  beginsWith: 'begins with',
  endsWith: 'ends with',
};

const RU_TEXT_OPERATORS: Readonly<Record<TextOperator, string>> = {
  contains: 'содержит',
  notContains: 'не содержит',
  beginsWith: 'начинается с',
  endsWith: 'заканчивается на',
};

const EN_AVERAGES: Readonly<Record<AverageChoice, string>> = {
  above: 'above average',
  below: 'below average',
  aboveEqual: 'above or equal to average',
  belowEqual: 'below or equal to average',
};

const RU_AVERAGES: Readonly<Record<AverageChoice, string>> = {
  above: 'выше среднего',
  below: 'ниже среднего',
  aboveEqual: 'не ниже среднего',
  belowEqual: 'не выше среднего',
};

const EN_PRESETS: Readonly<Record<string, string>> = {
  redText: 'Light red fill with dark red text',
  yellowText: 'Yellow fill with dark yellow text',
  greenText: 'Green fill with dark green text',
  redFill: 'Light red fill',
  redFont: 'Red text',
  redBorder: 'Red border',
  custom: 'Custom format',
};

const RU_PRESETS: Readonly<Record<string, string>> = {
  redText: 'Светло-красная заливка и тёмно-красный текст',
  yellowText: 'Жёлтая заливка и тёмно-жёлтый текст',
  greenText: 'Зелёная заливка и тёмно-зелёный текст',
  redFill: 'Светло-красная заливка',
  redFont: 'Красный текст',
  redBorder: 'Красная граница',
  custom: 'Свой формат',
};

const EN_SLOTS = [
  'Background 1',
  'Text 1',
  'Background 2',
  'Text 2',
  'Accent 1',
  'Accent 2',
  'Accent 3',
  'Accent 4',
  'Accent 5',
  'Accent 6',
];

const RU_SLOTS = [
  'Фон 1',
  'Текст 1',
  'Фон 2',
  'Текст 2',
  'Акцент 1',
  'Акцент 2',
  'Акцент 3',
  'Акцент 4',
  'Акцент 5',
  'Акцент 6',
];

const EN_SETS: Readonly<Record<string, string>> = {
  '3Arrows': '3 arrows',
  '3ArrowsGray': '3 grey arrows',
  '4Arrows': '4 arrows',
  '4ArrowsGray': '4 grey arrows',
  '5Arrows': '5 arrows',
  '5ArrowsGray': '5 grey arrows',
  '3Flags': '3 flags',
  '3TrafficLights1': '3 traffic lights',
  '4TrafficLights': '4 traffic lights',
  '3Signs': '3 signs',
  '3Symbols': '3 symbols in circles',
  '3Symbols2': '3 symbols',
  '4RedToBlack': 'Red to black',
  '4Rating': '4 ratings',
  '5Rating': '5 ratings',
  '5Quarters': '5 quarters',
  '3Stars': '3 stars',
  '3Triangles': '3 triangles',
};

const RU_SETS: Readonly<Record<string, string>> = {
  '3Arrows': '3 стрелки',
  '3ArrowsGray': '3 серые стрелки',
  '4Arrows': '4 стрелки',
  '4ArrowsGray': '4 серые стрелки',
  '5Arrows': '5 стрелок',
  '5ArrowsGray': '5 серых стрелок',
  '3Flags': '3 флажка',
  '3TrafficLights1': '3 светофора',
  '4TrafficLights': '4 светофора',
  '3Signs': '3 знака',
  '3Symbols': '3 символа в кругах',
  '3Symbols2': '3 символа',
  '4RedToBlack': 'От красного к чёрному',
  '4Rating': '4 оценки',
  '5Rating': '5 оценок',
  '5Quarters': '5 четвертей',
  '3Stars': '3 звезды',
  '3Triangles': '3 треугольника',
};

const EN_ERRORS: Readonly<Record<RuleField, string>> = {
  area: 'Enter cell ranges such as B2:B10',
  first: 'Enter a number or a formula',
  second: 'Enter a number or a formula',
  formula: 'Enter a valid formula',
  text: 'Enter the text',
  rank: 'Enter a whole number from 1',
};

const RU_ERRORS: Readonly<Record<RuleField, string>> = {
  area: 'Укажите диапазоны, например B2:B10',
  first: 'Введите число или формулу',
  second: 'Введите число или формулу',
  formula: 'Введите правильную формулу',
  text: 'Введите текст',
  rank: 'Введите целое число от 1',
};

const percentOf = (tint: number): string => String(Math.round(Math.abs(tint) * 100));

const enTint = (tint: number): string => {
  if (tint === 0) {
    return '';
  }
  return tint > 0 ? `, lighter ${percentOf(tint)}%` : `, darker ${percentOf(tint)}%`;
};

const ruTint = (tint: number): string => {
  if (tint === 0) {
    return '';
  }
  return tint > 0 ? `, светлее на ${percentOf(tint)}%` : `, темнее на ${percentOf(tint)}%`;
};

export const spreadsheetRuleEditorMessages: NuiMessageCatalog<NuiSpreadsheetRuleEditorMessages> = {
  namespace: 'spreadsheetRuleEditor',
  en: {
    newRule: 'New rule',
    changeRule: 'Edit rule',
    applyTo: 'Apply to',
    ruleKind: 'Format cells when',
    kind: ({ kind }) => EN_KINDS[kind],
    operator: 'Condition',
    operatorName: ({ operator }) => EN_OPERATORS[operator],
    textOperatorName: ({ operator }) => EN_TEXT_OPERATORS[operator],
    averageName: ({ choice }) => EN_AVERAGES[choice],
    value: 'Value',
    secondValue: 'And',
    formula: 'Formula',
    text: 'Text',
    period: 'Period',
    edge: 'Values',
    edgeName: ({ bottom }) => (bottom ? 'Bottom' : 'Top'),
    rank: 'Count',
    percent: 'Percent of the range',
    look: 'Format',
    preset: ({ preset }) => EN_PRESETS[preset] ?? preset,
    bold: 'Bold',
    italic: 'Italic',
    strike: 'Strikethrough',
    textColor: 'Text colour',
    fillColor: 'Fill',
    noColor: 'No colour',
    swatch: ({ slot, tint }) => `${EN_SLOTS[slot] ?? ''}${enTint(tint)}`,
    stops: ({ count }) => (count > 2 ? ['Minimum', 'Midpoint', 'Maximum'] : ['Minimum', 'Maximum']),
    barColor: 'Bar colour',
    icons: 'Icons',
    iconSetName: ({ set }) => EN_SETS[set] ?? set,
    showValue: 'Show the value',
    stopIfTrue: 'Stop if true',
    save: 'Done',
    cancel: 'Cancel',
    saved: 'Rule saved',
    error: ({ field }) => EN_ERRORS[field],
  },
  ru: {
    newRule: 'Новое правило',
    changeRule: 'Изменение правила',
    applyTo: 'Применить к',
    ruleKind: 'Форматировать ячейки, если',
    kind: ({ kind }) => RU_KINDS[kind],
    operator: 'Условие',
    operatorName: ({ operator }) => RU_OPERATORS[operator],
    textOperatorName: ({ operator }) => RU_TEXT_OPERATORS[operator],
    averageName: ({ choice }) => RU_AVERAGES[choice],
    value: 'Значение',
    secondValue: 'И',
    formula: 'Формула',
    text: 'Текст',
    period: 'Период',
    edge: 'Значения',
    edgeName: ({ bottom }) => (bottom ? 'Последние' : 'Первые'),
    rank: 'Количество',
    percent: 'Процент от диапазона',
    look: 'Формат',
    preset: ({ preset }) => RU_PRESETS[preset] ?? preset,
    bold: 'Полужирный',
    italic: 'Курсив',
    strike: 'Зачёркнутый',
    textColor: 'Цвет текста',
    fillColor: 'Заливка',
    noColor: 'Нет цвета',
    swatch: ({ slot, tint }) => `${RU_SLOTS[slot] ?? ''}${ruTint(tint)}`,
    stops: ({ count }) =>
      count > 2 ? ['Минимум', 'Середина', 'Максимум'] : ['Минимум', 'Максимум'],
    barColor: 'Цвет полосы',
    icons: 'Значки',
    iconSetName: ({ set }) => RU_SETS[set] ?? set,
    showValue: 'Показывать значение',
    stopIfTrue: 'Остановить, если истина',
    save: 'Готово',
    cancel: 'Отмена',
    saved: 'Правило сохранено',
    error: ({ field }) => RU_ERRORS[field],
  },
};
