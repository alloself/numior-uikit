import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiContentMessages {
  readonly openImage: string;
  readonly openNamedImage: (params: { readonly alt: string }) => string;
  readonly closeImage: string;
  readonly embedTitle: (params: { readonly provider: string }) => string;
}

export const contentMessages: NuiMessageCatalog<NuiContentMessages> = {
  namespace: 'content',
  en: {
    openImage: 'Open the image',
    openNamedImage: ({ alt }) => `Open the image: ${alt}`,
    closeImage: 'Close the image',
    embedTitle: ({ provider }) => `${provider} embed`,
  },
  ru: {
    openImage: 'Открыть изображение',
    openNamedImage: ({ alt }) => `Открыть изображение: ${alt}`,
    closeImage: 'Закрыть изображение',
    embedTitle: ({ provider }) => `Встраивание ${provider}`,
  },
};
