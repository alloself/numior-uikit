import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiSplitterMessages {
  readonly resize: string;
}

export const splitterMessages: NuiMessageCatalog<'splitter'> = {
  namespace: 'splitter',
  en: { resize: 'Resize panes' },
  ru: { resize: 'Изменить размер панелей' },
};
