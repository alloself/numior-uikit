import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiSelectMessages {
  readonly empty: string;
  readonly clear: string;
  readonly count: (params: { readonly count: number }) => string;
}

export const selectMessages: NuiMessageCatalog<'select'> = {
  namespace: 'select',
  en: { empty: 'No options', clear: 'Clear', count: ({ count }) => `${count} selected` },
  ru: { empty: 'Нет вариантов', clear: 'Очистить', count: ({ count }) => `Выбрано: ${count}` },
};
