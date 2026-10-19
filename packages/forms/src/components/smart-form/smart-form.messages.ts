import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiSmartFormMessages {
  readonly next: string;
  readonly back: string;
  readonly stepChanged: (params: {
    readonly current: number;
    readonly total: number;
    readonly label: string;
  }) => string;
}

export const smartFormMessages: NuiMessageCatalog<NuiSmartFormMessages> = {
  namespace: 'smartForm',
  en: {
    next: 'Next',
    back: 'Back',
    stepChanged: ({ current, total, label }) => `Step ${current} of ${total}: ${label}`,
  },
  ru: {
    next: 'Далее',
    back: 'Назад',
    stepChanged: ({ current, total, label }) => `Шаг ${current} из ${total}: ${label}`,
  },
};
