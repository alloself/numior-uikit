import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiStepperMessages {
  readonly label: string;
  readonly complete: string;
  readonly error: string;
  readonly summary: (params: { readonly current: string; readonly total: string }) => string;
}

export const stepperMessages: NuiMessageCatalog<NuiStepperMessages> = {
  namespace: 'stepper',
  en: {
    label: 'Steps',
    complete: 'completed',
    error: 'has errors',
    summary: ({ current, total }) => `Step ${current} of ${total}`,
  },
  ru: {
    label: 'Шаги',
    complete: 'выполнено',
    error: 'есть ошибки',
    summary: ({ current, total }) => `Шаг ${current} из ${total}`,
  },
};
