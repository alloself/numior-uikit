import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiAlertMessages {
  readonly dismiss: string;
}

export const alertMessages: NuiMessageCatalog<'alert'> = {
  namespace: 'alert',
  en: { dismiss: 'Close' },
  ru: { dismiss: 'Закрыть' },
};
