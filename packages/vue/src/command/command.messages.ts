import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiCommandMessages {
  readonly label: string;
  readonly placeholder: string;
  readonly empty: string;
  readonly title: string;
}

export const commandMessages: NuiMessageCatalog<NuiCommandMessages> = {
  namespace: 'command',
  en: {
    label: 'Commands',
    placeholder: 'Type a command or search…',
    empty: 'No results',
    title: 'Command palette',
  },
  ru: {
    label: 'Команды',
    placeholder: 'Команда или поиск…',
    empty: 'Ничего не найдено',
    title: 'Палитра команд',
  },
};
