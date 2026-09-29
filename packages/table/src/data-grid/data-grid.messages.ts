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
  readonly blank: string;
  readonly filterTruncated: string;
  readonly filterApply: string;
  readonly filterReset: string;
  readonly rowsShown: (params: { readonly count: number }) => string;
  readonly totals: string;
  readonly groupExpanded: (params: { readonly group: string }) => string;
  readonly groupCollapsed: (params: { readonly group: string }) => string;
  readonly rowExpanded: (params: { readonly row: string }) => string;
  readonly rowCollapsed: (params: { readonly row: string }) => string;
  readonly columnMenu: (params: { readonly column: string }) => string;
  readonly menuSortAscending: string;
  readonly menuSortDescending: string;
  readonly menuSortClear: string;
  readonly menuFilter: string;
  readonly menuGroup: string;
  readonly menuUngroup: string;
  readonly menuPin: string;
  readonly menuPinStart: string;
  readonly menuPinNone: string;
  readonly menuPinEnd: string;
  readonly menuHide: string;
  readonly menuColumns: string;
  readonly columnPinnedStart: (params: { readonly column: string }) => string;
  readonly columnPinnedEnd: (params: { readonly column: string }) => string;
  readonly columnUnpinned: (params: { readonly column: string }) => string;
  readonly columnHidden: (params: { readonly column: string }) => string;
  readonly columnShown: (params: { readonly column: string }) => string;
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
    blank: '(blank)',
    filterTruncated: 'Only the first values are listed',
    filterApply: 'Apply',
    filterReset: 'Reset',
    rowsShown: ({ count }) =>
      `${count.toLocaleString('en-US')} ${plural('en', count, { one: 'row', other: 'rows' })} shown`,
    totals: 'Total',
    groupExpanded: ({ group }) => `Group ${group} expanded`,
    groupCollapsed: ({ group }) => `Group ${group} collapsed`,
    rowExpanded: ({ row }) => `Row ${row} expanded`,
    rowCollapsed: ({ row }) => `Row ${row} collapsed`,
    columnMenu: ({ column }) => `Column menu: ${column}`,
    menuSortAscending: 'Sort ascending',
    menuSortDescending: 'Sort descending',
    menuSortClear: 'Clear sorting',
    menuFilter: 'Filter…',
    menuGroup: 'Group by this column',
    menuUngroup: 'Remove from grouping',
    menuPin: 'Pinning',
    menuPinStart: 'At the start',
    menuPinNone: 'Not pinned',
    menuPinEnd: 'At the end',
    menuHide: 'Hide column',
    menuColumns: 'Columns',
    columnPinnedStart: ({ column }) => `Column ${column} pinned at the start`,
    columnPinnedEnd: ({ column }) => `Column ${column} pinned at the end`,
    columnUnpinned: ({ column }) => `Column ${column} unpinned`,
    columnHidden: ({ column }) => `Column ${column} hidden`,
    columnShown: ({ column }) => `Column ${column} shown`,
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
    blank: '(пусто)',
    filterTruncated: 'Показаны только первые значения',
    filterApply: 'Применить',
    filterReset: 'Сбросить',
    rowsShown: ({ count }) =>
      `${plural('ru', count, { one: 'Показана', few: 'Показаны', many: 'Показано', other: 'Показано' })} ${count.toLocaleString('ru-RU')} ${plural('ru', count, { one: 'строка', few: 'строки', many: 'строк', other: 'строки' })}`,
    totals: 'Итого',
    groupExpanded: ({ group }) => `Группа «${group}» развёрнута`,
    groupCollapsed: ({ group }) => `Группа «${group}» свёрнута`,
    rowExpanded: ({ row }) => `Строка «${row}» развёрнута`,
    rowCollapsed: ({ row }) => `Строка «${row}» свёрнута`,
    columnMenu: ({ column }) => `Меню колонки «${column}»`,
    menuSortAscending: 'Сортировать по возрастанию',
    menuSortDescending: 'Сортировать по убыванию',
    menuSortClear: 'Снять сортировку',
    menuFilter: 'Фильтр…',
    menuGroup: 'Группировать по колонке',
    menuUngroup: 'Убрать из группировки',
    menuPin: 'Закрепление',
    menuPinStart: 'В начале',
    menuPinNone: 'Не закреплять',
    menuPinEnd: 'В конце',
    menuHide: 'Скрыть колонку',
    menuColumns: 'Колонки',
    columnPinnedStart: ({ column }) => `Колонка «${column}» закреплена в начале`,
    columnPinnedEnd: ({ column }) => `Колонка «${column}» закреплена в конце`,
    columnUnpinned: ({ column }) => `Колонка «${column}» откреплена`,
    columnHidden: ({ column }) => `Колонка «${column}» скрыта`,
    columnShown: ({ column }) => `Колонка «${column}» показана`,
  },
};
