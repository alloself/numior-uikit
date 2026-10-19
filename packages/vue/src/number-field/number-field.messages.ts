import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiNumberFieldMessages {
  readonly increment: string;
  readonly decrement: string;
}

export const numberFieldMessages: NuiMessageCatalog<NuiNumberFieldMessages> = {
  namespace: 'numberField',
  en: { increment: 'Increment', decrement: 'Decrement' },
  ru: { increment: 'Увеличить', decrement: 'Уменьшить' },
};
