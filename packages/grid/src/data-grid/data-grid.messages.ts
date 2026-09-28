import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiDataGridMessages {
  readonly label: string;
  readonly empty: string;
  readonly yes: string;
  readonly no: string;
}

export const dataGridMessages: NuiMessageCatalog<'dataGrid'> = {
  namespace: 'dataGrid',
  en: {
    label: 'Data grid',
    empty: 'No rows to show',
    yes: 'Yes',
    no: 'No',
  },
  ru: {
    label: 'Таблица данных',
    empty: 'Нет строк для показа',
    yes: 'Да',
    no: 'Нет',
  },
};
