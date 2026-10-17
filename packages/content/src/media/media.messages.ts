import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiContentMessages {
  readonly openImage: string;
  readonly openNamedImage: (params: { readonly alt: string }) => string;
  readonly closeImage: string;
}

export const contentMessages: NuiMessageCatalog<'content'> = {
  namespace: 'content',
  en: {
    openImage: 'Open the image',
    openNamedImage: ({ alt }) => `Open the image: ${alt}`,
    closeImage: 'Close the image',
  },
  ru: {
    openImage: 'Открыть изображение',
    openNamedImage: ({ alt }) => `Открыть изображение: ${alt}`,
    closeImage: 'Закрыть изображение',
  },
};
