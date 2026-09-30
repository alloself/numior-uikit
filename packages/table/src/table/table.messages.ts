import { plural, type NuiMessageCatalog } from '@numior/primitives';

export interface NuiTableMessages {
  readonly label: string;
  readonly empty: string;
  readonly select: string;
  readonly selectAll: string;
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
  readonly rowsCount: (params: { readonly count: number }) => string;
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
  readonly columnWidth: (params: { readonly column: string; readonly width: number }) => string;
  readonly columnWidthReset: (params: { readonly column: string }) => string;
  readonly menuResetWidth: string;
  readonly columnMoved: (params: {
    readonly column: string;
    readonly position: number;
    readonly count: number;
  }) => string;
  readonly dragRow: (params: { readonly row: string }) => string;
  readonly rowMoved: (params: {
    readonly row: string;
    readonly position: number;
    readonly count: number;
  }) => string;
  readonly rowMovedInto: (params: {
    readonly row: string;
    readonly parent: string;
    readonly position: number;
    readonly count: number;
  }) => string;
  readonly rowMovedToRoot: (params: {
    readonly row: string;
    readonly position: number;
    readonly count: number;
  }) => string;
  readonly cellMenu: string;
  readonly menuCopy: string;
  readonly menuCopyWithHeaders: string;
  readonly copied: (params: { readonly count: number }) => string;
  readonly copiedPart: (params: { readonly count: number; readonly total: number }) => string;
  readonly copyDisjoint: string;
  readonly copyFailed: string;
  readonly rangeSelected: (params: { readonly rows: number; readonly cols: number }) => string;
}

export const tableMessages: NuiMessageCatalog<'table'> = {
  namespace: 'table',
  en: {
    label: 'Data grid',
    empty: 'No rows to show',
    select: 'Select row',
    selectAll: 'Select all rows',
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
    rowsCount: ({ count }) =>
      `${count.toLocaleString('en-US')} ${plural('en', count, { one: 'row', other: 'rows' })}`,
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
    columnWidth: ({ column, width }) => `Column ${column} is ${width} px wide`,
    columnWidthReset: ({ column }) => `Column ${column} width reset`,
    menuResetWidth: 'Reset width',
    columnMoved: ({ column, position, count }) =>
      `Column ${column} moved to position ${position} of ${count}`,
    dragRow: ({ row }) => `Drag row ${row}`,
    rowMoved: ({ row, position, count }) => `Row ${row} moved to position ${position} of ${count}`,
    rowMovedInto: ({ row, parent, position, count }) =>
      `Row ${row} moved into ${parent}, position ${position} of ${count}`,
    rowMovedToRoot: ({ row, position, count }) =>
      `Row ${row} moved to the top level, position ${position} of ${count}`,
    cellMenu: 'Cell actions',
    menuCopy: 'Copy',
    menuCopyWithHeaders: 'Copy with headers',
    copied: ({ count }) =>
      `Copied ${count.toLocaleString('en-US')} ${plural('en', count, { one: 'row', other: 'rows' })}`,
    copiedPart: ({ count, total }) =>
      `Copied ${count.toLocaleString('en-US')} of ${total.toLocaleString('en-US')} rows`,
    copyDisjoint: 'Separate ranges are copied only when they share rows or columns',
    copyFailed: 'Copying failed',
    rangeSelected: ({ rows, cols }) =>
      `Selected ${rows.toLocaleString('en-US')} ${plural('en', rows, { one: 'row', other: 'rows' })} and ${cols.toLocaleString('en-US')} ${plural('en', cols, { one: 'column', other: 'columns' })}`,
  },
  ru: {
    label: 'Таблица данных',
    empty: 'Нет строк для показа',
    select: 'Выбрать строку',
    selectAll: 'Выбрать все строки',
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
    rowsCount: ({ count }) =>
      `${count.toLocaleString('ru-RU')} ${plural('ru', count, { one: 'строка', few: 'строки', many: 'строк', other: 'строки' })}`,
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
    columnWidth: ({ column, width }) => `Ширина колонки «${column}»: ${width} px`,
    columnWidthReset: ({ column }) => `Ширина колонки «${column}» сброшена`,
    menuResetWidth: 'Сбросить ширину',
    columnMoved: ({ column, position, count }) =>
      `Колонка «${column}» перемещена на место ${position} из ${count}`,
    dragRow: ({ row }) => `Перетащить строку «${row}»`,
    rowMoved: ({ row, position, count }) =>
      `Строка «${row}» перемещена на место ${position} из ${count}`,
    rowMovedInto: ({ row, parent, position, count }) =>
      `Строка «${row}» перемещена в «${parent}», место ${position} из ${count}`,
    rowMovedToRoot: ({ row, position, count }) =>
      `Строка «${row}» перемещена на верхний уровень, место ${position} из ${count}`,
    cellMenu: 'Действия с ячейками',
    menuCopy: 'Копировать',
    menuCopyWithHeaders: 'Копировать с заголовками',
    copied: ({ count }) =>
      `${plural('ru', count, { one: 'Скопирована', few: 'Скопированы', many: 'Скопировано', other: 'Скопировано' })} ${count.toLocaleString('ru-RU')} ${plural('ru', count, { one: 'строка', few: 'строки', many: 'строк', other: 'строки' })}`,
    copiedPart: ({ count, total }) =>
      `Скопировано строк: ${count.toLocaleString('ru-RU')} из ${total.toLocaleString('ru-RU')}`,
    copyDisjoint: 'Разрывные диапазоны копируются, только если у них общие строки или колонки',
    copyFailed: 'Не удалось скопировать',
    rangeSelected: ({ rows, cols }) =>
      `Выделено строк: ${rows.toLocaleString('ru-RU')}, колонок: ${cols.toLocaleString('ru-RU')}`,
  },
};
