import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiComboboxMessages {
  readonly empty: string;
  readonly clear: string;
  readonly remove: string;
  readonly toggle: string;
}

export const comboboxMessages: NuiMessageCatalog<'combobox'> = {
  namespace: 'combobox',
  en: { empty: 'No matches', clear: 'Clear', remove: 'Remove', toggle: 'Show options' },
  ru: {
    empty: 'Ничего не найдено',
    clear: 'Очистить',
    remove: 'Убрать',
    toggle: 'Показать варианты',
  },
};
