import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiAlertMessages {
  readonly dismiss: string;
}

export const alertMessages: NuiMessageCatalog<NuiAlertMessages> = {
  namespace: 'alert',
  en: { dismiss: 'Close' },
  ru: { dismiss: 'Закрыть' },
};
