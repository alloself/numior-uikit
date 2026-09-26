import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiTimeFieldMessages {
  readonly clock: string;
  readonly empty: string;
}

export const timeFieldMessages: NuiMessageCatalog<'timeField'> = {
  namespace: 'timeField',
  en: { clock: 'Choose time', empty: 'No times' },
  ru: { clock: 'Выбрать время', empty: 'Нет доступного времени' },
};
