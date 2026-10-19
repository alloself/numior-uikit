import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiToastMessages {
  readonly close: string;
  readonly label: string;
}

export const toastMessages: NuiMessageCatalog<NuiToastMessages> = {
  namespace: 'toast',
  en: { close: 'Close', label: 'Notifications' },
  ru: { close: 'Закрыть', label: 'Уведомления' },
};
