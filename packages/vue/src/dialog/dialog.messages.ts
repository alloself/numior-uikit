import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiDialogMessages {
  readonly close: string;
}

export const dialogMessages: NuiMessageCatalog<NuiDialogMessages> = {
  namespace: 'dialog',
  en: { close: 'Close' },
  ru: { close: 'Закрыть' },
};
