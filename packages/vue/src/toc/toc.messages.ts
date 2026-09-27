import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiTocMessages {
  readonly title: string;
}

export const tocMessages: NuiMessageCatalog<'toc'> = {
  namespace: 'toc',
  en: { title: 'On this page' },
  ru: { title: 'На странице' },
};
