import type { NuiMessageCatalog } from '@numior/primitives';
import type { PivotAggregate, PivotShowAsKind } from '../../core';

export interface NuiSpreadsheetPivotMessages {
  readonly insertPivot: string;
  readonly pivotFields: string;
  readonly refreshPivot: string;
  readonly title: string;
  readonly close: string;
  readonly options: string;
  readonly reportLayout: string;
  readonly layoutCompact: string;
  readonly layoutOutline: string;
  readonly layoutTabular: string;
  readonly rowGrandTotals: string;
  readonly columnGrandTotals: string;
  readonly autofit: string;
  readonly optionsChanged: string;
  readonly fields: string;
  readonly filtersArea: string;
  readonly columnsArea: string;
  readonly rowsArea: string;
  readonly valuesArea: string;
  readonly dropHere: string;
  readonly valuesField: string;
  readonly fieldMenu: (params: { readonly field: string }) => string;
  readonly moveUp: string;
  readonly moveDown: string;
  readonly moveFirst: string;
  readonly moveLast: string;
  readonly moveToFilters: string;
  readonly moveToColumns: string;
  readonly moveToRows: string;
  readonly moveToValues: string;
  readonly removeField: string;
  readonly filterAndSort: string;
  readonly filterItems: string;
  readonly subtotals: string;
  readonly valueSettings: string;
  readonly sortOrder: string;
  readonly sortAscending: string;
  readonly sortDescending: string;
  readonly sortManual: string;
  readonly search: string;
  readonly items: string;
  readonly selectAll: string;
  readonly noMatches: string;
  readonly apply: string;
  readonly cancel: string;
  readonly itemsApplied: (params: { readonly field: string }) => string;
  readonly valueName: string;
  readonly aggregate: string;
  readonly aggregateName: (params: { readonly aggregate: PivotAggregate }) => string;
  readonly showAs: string;
  readonly showAsName: (params: { readonly kind: PivotShowAsKind }) => string;
  readonly baseField: string;
  readonly baseItem: string;
  readonly previousItem: string;
  readonly nextItem: string;
  readonly numberFormat: string;
  readonly formatGeneral: string;
  readonly formatName: (params: { readonly code: string; readonly sample: string }) => string;
  readonly nameRequired: string;
  readonly nameTaken: string;
  readonly valueApplied: (params: { readonly name: string }) => string;
  readonly fieldPlaced: (params: { readonly field: string; readonly area: string }) => string;
  readonly fieldRemoved: (params: { readonly field: string }) => string;
  readonly dragCancelled: string;
  readonly noSource: string;
  readonly sourceLost: string;
  readonly refused: string;
  readonly refreshed: string;
  readonly pivotSheet: (params: { readonly index: number }) => string;
  readonly pivotName: (params: { readonly index: number }) => string;
}

const EN_AGGREGATES: Readonly<Record<PivotAggregate, string>> = {
  sum: 'Sum',
  count: 'Count',
  average: 'Average',
  max: 'Max',
  min: 'Min',
  product: 'Product',
  countNums: 'Count Numbers',
  stdDev: 'StdDev',
  stdDevp: 'StdDevp',
  var: 'Var',
  varp: 'Varp',
};

const RU_AGGREGATES: Readonly<Record<PivotAggregate, string>> = {
  sum: 'Сумма',
  count: 'Количество',
  average: 'Среднее',
  max: 'Максимум',
  min: 'Минимум',
  product: 'Произведение',
  countNums: 'Количество чисел',
  stdDev: 'Стандартное отклонение',
  stdDevp: 'Смещённое отклонение',
  var: 'Дисперсия',
  varp: 'Смещённая дисперсия',
};

const EN_SHOW_AS: Readonly<Record<PivotShowAsKind, string>> = {
  normal: 'No calculation',
  percentOfTotal: '% of grand total',
  percentOfRow: '% of row total',
  percentOfCol: '% of column total',
  index: 'Index',
  runTotal: 'Running total in',
  difference: 'Difference from',
  percent: '% of',
  percentDiff: '% difference from',
};

const RU_SHOW_AS: Readonly<Record<PivotShowAsKind, string>> = {
  normal: 'Без вычислений',
  percentOfTotal: '% от общей суммы',
  percentOfRow: '% от суммы по строке',
  percentOfCol: '% от суммы по столбцу',
  index: 'Индекс',
  runTotal: 'С нарастающим итогом в поле',
  difference: 'Отличие',
  percent: 'Доля',
  percentDiff: 'Приведённое отличие',
};

export const spreadsheetPivotMessages: NuiMessageCatalog<NuiSpreadsheetPivotMessages> = {
  namespace: 'spreadsheetPivot',
  en: {
    insertPivot: 'Insert pivot table',
    pivotFields: 'Pivot table fields…',
    refreshPivot: 'Refresh',
    title: 'Pivot table fields',
    close: 'Close',
    options: 'PivotTable options',
    reportLayout: 'Report layout',
    layoutCompact: 'Compact form',
    layoutOutline: 'Outline form',
    layoutTabular: 'Tabular form',
    rowGrandTotals: 'Grand totals for rows',
    columnGrandTotals: 'Grand totals for columns',
    autofit: 'Autofit column widths',
    optionsChanged: 'Pivot table options changed',
    fields: 'Fields',
    filtersArea: 'Filters',
    columnsArea: 'Columns',
    rowsArea: 'Rows',
    valuesArea: 'Values',
    dropHere: 'Drag fields here',
    valuesField: 'Σ Values',
    fieldMenu: ({ field }) => `${field}: field actions`,
    moveUp: 'Move up',
    moveDown: 'Move down',
    moveFirst: 'Move to beginning',
    moveLast: 'Move to end',
    moveToFilters: 'Move to filters',
    moveToColumns: 'Move to columns',
    moveToRows: 'Move to rows',
    moveToValues: 'Move to values',
    removeField: 'Remove field',
    filterAndSort: 'Filter and sort…',
    filterItems: 'Select items…',
    subtotals: 'Show subtotals',
    valueSettings: 'Value field settings…',
    sortOrder: 'Sort',
    sortAscending: 'Ascending (A to Z)',
    sortDescending: 'Descending (Z to A)',
    sortManual: 'Source order',
    search: 'Search',
    items: 'Items',
    selectAll: '(Select all)',
    noMatches: 'No matching items',
    apply: 'Apply',
    cancel: 'Cancel',
    itemsApplied: ({ field }) => `${field}: items updated`,
    valueName: 'Custom name',
    aggregate: 'Summarize by',
    aggregateName: ({ aggregate }) => EN_AGGREGATES[aggregate],
    showAs: 'Show values as',
    showAsName: ({ kind }) => EN_SHOW_AS[kind],
    baseField: 'Base field',
    baseItem: 'Base item',
    previousItem: '(previous)',
    nextItem: '(next)',
    numberFormat: 'Number format',
    formatGeneral: 'General',
    formatName: ({ code, sample }) => `${code} — ${sample}`,
    nameRequired: 'Enter a name',
    nameTaken: 'This name is already used by a field of the pivot table',
    valueApplied: ({ name }) => `${name}: settings applied`,
    fieldPlaced: ({ field, area }) => `${field} moved to ${area}`,
    fieldRemoved: ({ field }) => `${field} removed`,
    dragCancelled: 'Move cancelled',
    noSource: 'Select a table with a header row to build a pivot table',
    sourceLost: 'The source of this pivot table is gone',
    refused: 'The pivot table did not change: it would cover other data',
    refreshed: 'Pivot table refreshed',
    pivotSheet: ({ index }) => `Pivot ${String(index)}`,
    pivotName: ({ index }) => `PivotTable${String(index)}`,
  },
  ru: {
    insertPivot: 'Вставить сводную таблицу',
    pivotFields: 'Поля сводной таблицы…',
    refreshPivot: 'Обновить',
    title: 'Поля сводной таблицы',
    close: 'Закрыть',
    options: 'Параметры сводной таблицы',
    reportLayout: 'Макет отчёта',
    layoutCompact: 'Сжатая форма',
    layoutOutline: 'Форма структуры',
    layoutTabular: 'Табличная форма',
    rowGrandTotals: 'Общие итоги для строк',
    columnGrandTotals: 'Общие итоги для столбцов',
    autofit: 'Автоподбор ширины столбцов',
    optionsChanged: 'Параметры сводной таблицы изменены',
    fields: 'Поля',
    filtersArea: 'Фильтры',
    columnsArea: 'Столбцы',
    rowsArea: 'Строки',
    valuesArea: 'Значения',
    dropHere: 'Перетащите поля сюда',
    valuesField: 'Σ Значения',
    fieldMenu: ({ field }) => `${field}: действия с полем`,
    moveUp: 'Переместить вверх',
    moveDown: 'Переместить вниз',
    moveFirst: 'Переместить в начало',
    moveLast: 'Переместить в конец',
    moveToFilters: 'Переместить в фильтры',
    moveToColumns: 'Переместить в столбцы',
    moveToRows: 'Переместить в строки',
    moveToValues: 'Переместить в значения',
    removeField: 'Удалить поле',
    filterAndSort: 'Фильтр и сортировка…',
    filterItems: 'Выбрать элементы…',
    subtotals: 'Промежуточные итоги',
    valueSettings: 'Параметры полей значений…',
    sortOrder: 'Сортировка',
    sortAscending: 'По возрастанию (от А до Я)',
    sortDescending: 'По убыванию (от Я до А)',
    sortManual: 'Как в источнике',
    search: 'Поиск',
    items: 'Элементы',
    selectAll: '(Выделить все)',
    noMatches: 'Совпадений нет',
    apply: 'Применить',
    cancel: 'Отмена',
    itemsApplied: ({ field }) => `${field}: элементы обновлены`,
    valueName: 'Имя',
    aggregate: 'Операция',
    aggregateName: ({ aggregate }) => RU_AGGREGATES[aggregate],
    showAs: 'Дополнительные вычисления',
    showAsName: ({ kind }) => RU_SHOW_AS[kind],
    baseField: 'Поле',
    baseItem: 'Элемент',
    previousItem: '(назад)',
    nextItem: '(вперёд)',
    numberFormat: 'Числовой формат',
    formatGeneral: 'Общий',
    formatName: ({ code, sample }) => `${code} — ${sample}`,
    nameRequired: 'Введите имя',
    nameTaken: 'Это имя уже занято полем сводной таблицы',
    valueApplied: ({ name }) => `${name}: параметры применены`,
    fieldPlaced: ({ field, area }) => `${field}: область «${area}»`,
    fieldRemoved: ({ field }) => `${field}: поле удалено`,
    dragCancelled: 'Перемещение отменено',
    noSource: 'Выделите таблицу со строкой заголовков, чтобы построить сводную',
    sourceLost: 'Источник этой сводной таблицы больше не существует',
    refused: 'Сводная таблица не изменилась: она закрыла бы другие данные',
    refreshed: 'Сводная таблица обновлена',
    pivotSheet: ({ index }) => `Сводная ${String(index)}`,
    pivotName: ({ index }) => `СводнаяТаблица${String(index)}`,
  },
};
