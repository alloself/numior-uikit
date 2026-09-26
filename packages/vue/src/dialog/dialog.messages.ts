import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiDialogMessages {
  readonly close: string;
}

export const dialogMessages: NuiMessageCatalog<'dialog'> = {
  namespace: 'dialog',
  en: { close: 'Close' },
  ru: { close: 'Закрыть' },
};
