import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiFormMessages {
  readonly submit: string;
  readonly errorTitle: string;
}

export const formMessages: NuiMessageCatalog<NuiFormMessages> = {
  namespace: 'form',
  en: {
    submit: 'Submit',
    errorTitle: 'Could not submit the form',
  },
  ru: {
    submit: 'Отправить',
    errorTitle: 'Не удалось отправить форму',
  },
};
