import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiSkipLinkMessages {
  readonly skip: string;
}

export const skipLinkMessages: NuiMessageCatalog<NuiSkipLinkMessages> = {
  namespace: 'skipLink',
  en: { skip: 'Skip to content' },
  ru: { skip: 'К содержимому' },
};
