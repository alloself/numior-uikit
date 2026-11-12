import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiAlertMessages {
  readonly close: string;
}

export const alertMessages: NuiMessageCatalog<NuiAlertMessages> = {
  namespace: 'alert',
  en: { close: 'Close' },
  ru: { close: 'Закрыть' },
};
