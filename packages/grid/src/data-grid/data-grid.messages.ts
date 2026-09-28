import { plural, type NuiMessageCatalog } from '@numior/primitives';

export interface NuiDataGridMessages {
  readonly label: string;
  readonly empty: string;
  readonly yes: string;
  readonly no: string;
  readonly sortedAscending: (params: { readonly column: string }) => string;
  readonly sortedDescending: (params: { readonly column: string }) => string;
  readonly sortCleared: string;
  readonly sortKey: (params: { readonly order: number }) => string;
  readonly busy: string;
  readonly filterColumn: (params: { readonly column: string }) => string;
  readonly filterOperator: string;
  readonly filterValue: string;
  readonly filterContains: string;
  readonly filterEquals: string;
  readonly filterStarts: string;
  readonly filterEmpty: string;
  readonly filterMin: string;
  readonly filterMax: string;
  readonly filterFrom: string;
  readonly filterTo: string;
  readonly filterSelectAll: string;
  readonly filterBlank: string;
  readonly filterTruncated: string;
  readonly filterApply: string;
  readonly filterReset: string;
  readonly rowsShown: (params: { readonly count: number }) => string;
}

export const dataGridMessages: NuiMessageCatalog<'dataGrid'> = {
  namespace: 'dataGrid',
  en: {
    label: 'Data grid',
    empty: 'No rows to show',
    yes: 'Yes',
    no: 'No',
    sortedAscending: ({ column }) => `Sorted by ${column}, ascending`,
    sortedDescending: ({ column }) => `Sorted by ${column}, descending`,
    sortCleared: 'Sorting removed',
    sortKey: ({ order }) => `sort key ${order}`,
    busy: 'Updating rows',
    filterColumn: ({ column }) => `Filter: ${column}`,
    filterOperator: 'Condition',
    filterValue: 'Value',
    filterContains: 'Contains',
    filterEquals: 'Equals',
    filterStarts: 'Starts with',
    filterEmpty: 'Is empty',
    filterMin: 'From',
    filterMax: 'To',
    filterFrom: 'From date',
    filterTo: 'To date',
    filterSelectAll: 'Select all',
    filterBlank: '(blank)',
    filterTruncated: 'Only the first values are listed',
    filterApply: 'Apply',
    filterReset: 'Reset',
    rowsShown: ({ count }) =>
      `${count.toLocaleString('en-US')} ${plural('en', count, { one: 'row', other: 'rows' })} shown`,
  },
  ru: {
    label: 'Таблица данных',
    empty: 'Нет строк для показа',
    yes: 'Да',
    no: 'Нет',
    sortedAscending: ({ column }) => `Сортировка по колонке «${column}» по возрастанию`,
    sortedDescending: ({ column }) => `Сортировка по колонке «${column}» по убыванию`,
    sortCleared: 'Сортировка снята',
    sortKey: ({ order }) => `ключ сортировки ${order}`,
    busy: 'Строки обновляются',
    filterColumn: ({ column }) => `Фильтр: ${column}`,
    filterOperator: 'Условие',
    filterValue: 'Значение',
    filterContains: 'Содержит',
    filterEquals: 'Равно',
    filterStarts: 'Начинается с',
    filterEmpty: 'Пусто',
    filterMin: 'От',
    filterMax: 'До',
    filterFrom: 'С даты',
    filterTo: 'По дату',
    filterSelectAll: 'Выбрать все',
    filterBlank: '(пусто)',
    filterTruncated: 'Показаны только первые значения',
    filterApply: 'Применить',
    filterReset: 'Сбросить',
    rowsShown: ({ count }) =>
      `${plural('ru', count, { one: 'Показана', few: 'Показаны', many: 'Показано', other: 'Показано' })} ${count.toLocaleString('ru-RU')} ${plural('ru', count, { one: 'строка', few: 'строки', many: 'строк', other: 'строки' })}`,
  },
};
