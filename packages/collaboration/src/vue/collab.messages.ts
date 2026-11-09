import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiCollabMessages {
  readonly present: string;
}

export const collabMessages: NuiMessageCatalog<NuiCollabMessages> = {
  namespace: 'collaboration',
  en: {
    present: 'People in this document',
  },
  ru: {
    present: 'Сейчас в документе',
  },
};
