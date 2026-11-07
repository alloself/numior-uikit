import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiSpreadsheetPivotMessages {
  readonly insertPivot: string;
  readonly pivotFields: string;
  readonly refreshPivot: string;
  readonly title: string;
  readonly close: string;
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

export const spreadsheetPivotMessages: NuiMessageCatalog<NuiSpreadsheetPivotMessages> = {
  namespace: 'spreadsheetPivot',
  en: {
    insertPivot: 'Insert pivot table',
    pivotFields: 'Pivot table fields…',
    refreshPivot: 'Refresh',
    title: 'Pivot table fields',
    close: 'Close',
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
