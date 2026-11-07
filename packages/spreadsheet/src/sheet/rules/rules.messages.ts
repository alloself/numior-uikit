import type { NuiMessageCatalog } from '@numior/primitives';
import type {
  CellIsOperator,
  TextOperator,
  TimePeriod,
} from '../../core/conditional/conditional.types';
import type { ValueTestKind } from './rules.types';

export interface NuiSpreadsheetRulesMessages {
  readonly title: string;
  readonly openRules: string;
  readonly close: string;
  readonly addRule: string;
  readonly onlySelection: string;
  readonly noRules: string;
  readonly noRulesHere: string;
  readonly sample: string;
  readonly grabbed: (params: { readonly position: number; readonly count: number }) => string;
  readonly cancelled: string;
  readonly editRule: (params: { readonly rule: string }) => string;
  readonly deleteRule: (params: { readonly rule: string }) => string;
  readonly moveRule: (params: { readonly rule: string }) => string;
  readonly ruleMoved: (params: { readonly position: number; readonly count: number }) => string;
  readonly ruleDeleted: string;
  readonly cellIs: (params: {
    readonly operator: CellIsOperator;
    readonly first: string;
    readonly second: string;
  }) => string;
  readonly expression: (params: { readonly formula: string }) => string;
  readonly colorScale: (params: { readonly count: number }) => string;
  readonly dataBar: string;
  readonly iconSet: string;
  readonly top: (params: {
    readonly bottom: boolean;
    readonly rank: number;
    readonly percent: boolean;
  }) => string;
  readonly average: (params: { readonly below: boolean; readonly equal: boolean }) => string;
  readonly text: (params: { readonly operator: TextOperator; readonly text: string }) => string;
  readonly valueTest: (params: { readonly kind: ValueTestKind }) => string;
  readonly period: (params: { readonly period: TimePeriod }) => string;
  readonly foreign: string;
}

const EN_OPERATORS: Readonly<Record<CellIsOperator, string>> = {
  between: 'Value is between {first} and {second}',
  notBetween: 'Value is not between {first} and {second}',
  equal: 'Value equals {first}',
  notEqual: 'Value does not equal {first}',
  greaterThan: 'Value is greater than {first}',
  lessThan: 'Value is less than {first}',
  greaterThanOrEqual: 'Value is at least {first}',
  lessThanOrEqual: 'Value is at most {first}',
};

const RU_OPERATORS: Readonly<Record<CellIsOperator, string>> = {
  between: 'Значение между {first} и {second}',
  notBetween: 'Значение вне {first}–{second}',
  equal: 'Значение равно {first}',
  notEqual: 'Значение не равно {first}',
  greaterThan: 'Значение больше {first}',
  lessThan: 'Значение меньше {first}',
  greaterThanOrEqual: 'Значение не меньше {first}',
  lessThanOrEqual: 'Значение не больше {first}',
};

const EN_TEXTS: Readonly<Record<TextOperator, string>> = {
  contains: 'Text contains',
  notContains: 'Text does not contain',
  beginsWith: 'Text begins with',
  endsWith: 'Text ends with',
};

const RU_TEXTS: Readonly<Record<TextOperator, string>> = {
  contains: 'Текст содержит',
  notContains: 'Текст не содержит',
  beginsWith: 'Текст начинается с',
  endsWith: 'Текст заканчивается на',
};

const EN_TESTS: Readonly<Record<ValueTestKind, string>> = {
  duplicates: 'Duplicate values',
  uniques: 'Unique values',
  blanks: 'Blank cells',
  filled: 'Cells that are not blank',
  errors: 'Cells with errors',
  noErrors: 'Cells without errors',
};

const RU_TESTS: Readonly<Record<ValueTestKind, string>> = {
  duplicates: 'Повторяющиеся значения',
  uniques: 'Уникальные значения',
  blanks: 'Пустые ячейки',
  filled: 'Непустые ячейки',
  errors: 'Ячейки с ошибками',
  noErrors: 'Ячейки без ошибок',
};

const EN_PERIODS: Readonly<Record<TimePeriod, string>> = {
  today: 'Date is today',
  yesterday: 'Date is yesterday',
  tomorrow: 'Date is tomorrow',
  last7Days: 'Date is in the last 7 days',
  thisWeek: 'Date is this week',
  lastWeek: 'Date is last week',
  nextWeek: 'Date is next week',
  thisMonth: 'Date is this month',
  lastMonth: 'Date is last month',
  nextMonth: 'Date is next month',
};

const RU_PERIODS: Readonly<Record<TimePeriod, string>> = {
  today: 'Дата — сегодня',
  yesterday: 'Дата — вчера',
  tomorrow: 'Дата — завтра',
  last7Days: 'Дата за последние 7 дней',
  thisWeek: 'Дата на этой неделе',
  lastWeek: 'Дата на прошлой неделе',
  nextWeek: 'Дата на следующей неделе',
  thisMonth: 'Дата в этом месяце',
  lastMonth: 'Дата в прошлом месяце',
  nextMonth: 'Дата в следующем месяце',
};

const filled = (template: string, first: string, second: string): string =>
  template.replace('{first}', first).replace('{second}', second);

export const spreadsheetRulesMessages: NuiMessageCatalog<NuiSpreadsheetRulesMessages> = {
  namespace: 'spreadsheetRules',
  en: {
    title: 'Conditional formatting',
    openRules: 'Conditional formatting…',
    close: 'Close',
    addRule: 'Add rule',
    onlySelection: 'Only for the selection',
    noRules: 'This sheet has no rules',
    noRulesHere: 'No rules touch the selection',
    sample: 'AaBbCc',
    grabbed: ({ position, count }) =>
      `Rule grabbed at position ${String(position)} of ${String(count)}`,
    cancelled: 'Move cancelled',
    editRule: ({ rule }) => `Edit: ${rule}`,
    deleteRule: ({ rule }) => `Delete: ${rule}`,
    moveRule: ({ rule }) => `Move: ${rule}`,
    ruleMoved: ({ position, count }) =>
      `Rule moved to position ${String(position)} of ${String(count)}`,
    ruleDeleted: 'Rule deleted',
    cellIs: ({ operator, first, second }) => filled(EN_OPERATORS[operator], first, second),
    expression: ({ formula }) => `Formula =${formula}`,
    colorScale: ({ count }) => `${String(count)}-colour scale`,
    dataBar: 'Data bars',
    iconSet: 'Icon set',
    top: ({ bottom, rank, percent }) =>
      `${bottom ? 'Bottom' : 'Top'} ${String(rank)}${percent ? '%' : ''}`,
    average: ({ below, equal }) =>
      `${below ? 'Below' : 'Above'} average${equal ? ' or equal' : ''}`,
    text: ({ operator, text }) => `${EN_TEXTS[operator]} “${text}”`,
    valueTest: ({ kind }) => EN_TESTS[kind],
    period: ({ period }) => EN_PERIODS[period],
    foreign: 'Rule kept from the file',
  },
  ru: {
    title: 'Условное форматирование',
    openRules: 'Условное форматирование…',
    close: 'Закрыть',
    addRule: 'Добавить правило',
    onlySelection: 'Только для выделения',
    noRules: 'На листе нет правил',
    noRulesHere: 'У выделения нет правил',
    sample: 'АаБбВв',
    grabbed: ({ position, count }) =>
      `Правило взято на месте ${String(position)} из ${String(count)}`,
    cancelled: 'Перемещение отменено',
    editRule: ({ rule }) => `Изменить: ${rule}`,
    deleteRule: ({ rule }) => `Удалить: ${rule}`,
    moveRule: ({ rule }) => `Переместить: ${rule}`,
    ruleMoved: ({ position, count }) => `Правило на месте ${String(position)} из ${String(count)}`,
    ruleDeleted: 'Правило удалено',
    cellIs: ({ operator, first, second }) => filled(RU_OPERATORS[operator], first, second),
    expression: ({ formula }) => `Формула =${formula}`,
    colorScale: ({ count }) => `Цветовая шкала из ${String(count)} цветов`,
    dataBar: 'Гистограммы',
    iconSet: 'Набор значков',
    top: ({ bottom, rank, percent }) =>
      `${bottom ? 'Последние' : 'Первые'} ${String(rank)}${percent ? '%' : ''}`,
    average: ({ below, equal }) =>
      `${below ? 'Ниже' : 'Выше'} среднего${equal ? ' или равно' : ''}`,
    text: ({ operator, text }) => `${RU_TEXTS[operator]} «${text}»`,
    valueTest: ({ kind }) => RU_TESTS[kind],
    period: ({ period }) => RU_PERIODS[period],
    foreign: 'Правило из файла',
  },
};
