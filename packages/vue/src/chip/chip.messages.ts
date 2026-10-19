import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiChipMessages {
  readonly remove: string;
}

export const chipMessages: NuiMessageCatalog<NuiChipMessages> = {
  namespace: 'chip',
  en: { remove: 'Remove' },
  ru: { remove: 'Убрать' },
};
