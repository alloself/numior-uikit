import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiListMessages {
  readonly loading: string;
  readonly empty: string;
}

export const listMessages: NuiMessageCatalog<NuiListMessages> = {
  namespace: 'list',
  en: { loading: 'Loading', empty: 'No items' },
  ru: { loading: 'Загрузка', empty: 'Список пуст' },
};
