import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiSelectMessages {
  readonly empty: string;
  readonly clear: string;
  readonly toggle: string;
  readonly count: (params: { readonly count: number }) => string;
}

export const selectMessages: NuiMessageCatalog<NuiSelectMessages> = {
  namespace: 'select',
  en: {
    empty: 'No options',
    clear: 'Clear',
    toggle: 'Show options',
    count: ({ count }) => `${count} selected`,
  },
  ru: {
    empty: 'Нет вариантов',
    clear: 'Очистить',
    toggle: 'Показать варианты',
    count: ({ count }) => `Выбрано: ${count}`,
  },
};
