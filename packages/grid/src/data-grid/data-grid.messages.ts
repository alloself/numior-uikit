import type { NuiMessageCatalog } from '@numior/primitives';

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
  },
};
