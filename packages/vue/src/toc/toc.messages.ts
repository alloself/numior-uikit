import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiTocMessages {
  readonly title: string;
}

export const tocMessages: NuiMessageCatalog<NuiTocMessages> = {
  namespace: 'toc',
  en: { title: 'On this page' },
  ru: { title: 'На странице' },
};
