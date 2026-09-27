import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiCodeMessages {
  readonly copy: string;
  readonly copied: string;
  readonly expand: string;
  readonly collapse: string;
}

export const codeMessages: NuiMessageCatalog<'code'> = {
  namespace: 'code',
  en: { copy: 'Copy code', copied: 'Copied', expand: 'Show more', collapse: 'Show less' },
  ru: {
    copy: 'Скопировать код',
    copied: 'Скопировано',
    expand: 'Показать всё',
    collapse: 'Свернуть',
  },
};
