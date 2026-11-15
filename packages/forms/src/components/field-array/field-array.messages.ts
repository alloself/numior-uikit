import type { NuiMessageCatalog } from '@numior/primitives';

interface RowPosition {
  readonly index: number;
  readonly position: number;
  readonly count: number;
}

export interface NuiFieldArrayMessages {
  readonly add: string;
  readonly remove: (params: { readonly index: number }) => string;
  readonly move: (params: { readonly index: number }) => string;
  readonly row: (params: { readonly index: number }) => string;
  readonly empty: string;
  readonly limit: (params: { readonly max: number }) => string;
  readonly added: (params: { readonly index: number }) => string;
  readonly removed: (params: { readonly index: number }) => string;
  readonly grabbed: (params: RowPosition) => string;
  readonly moved: (params: RowPosition) => string;
  readonly dropped: (params: RowPosition) => string;
  readonly cancelled: (params: { readonly index: number }) => string;
}

export const fieldArrayMessages: NuiMessageCatalog<NuiFieldArrayMessages> = {
  namespace: 'fieldArray',
  en: {
    add: 'Add row',
    remove: ({ index }) => `Remove row ${index}`,
    move: ({ index }) => `Move row ${index}`,
    row: ({ index }) => `Row ${index}`,
    empty: 'No rows yet',
    limit: ({ max }) => `Row limit reached: ${max}`,
    added: ({ index }) => `Row ${index} added.`,
    removed: ({ index }) => `Row ${index} removed.`,
    grabbed: ({ index, position, count }) =>
      `Row ${index} grabbed, position ${position} of ${count}. Use the arrow keys to move, Space or Enter to drop, Escape to cancel.`,
    moved: ({ index, position, count }) => `Row ${index}, position ${position} of ${count}.`,
    dropped: ({ index, position, count }) =>
      `Row ${index} dropped at position ${position} of ${count}.`,
    cancelled: ({ index }) => `Row ${index}, move canceled.`,
  },
  ru: {
    add: 'Добавить строку',
    remove: ({ index }) => `Удалить строку ${index}`,
    move: ({ index }) => `Переместить строку ${index}`,
    row: ({ index }) => `Строка ${index}`,
    empty: 'Строк пока нет',
    limit: ({ max }) => `Достигнут предел строк: ${max}`,
    added: ({ index }) => `Строка ${index} добавлена.`,
    removed: ({ index }) => `Строка ${index} удалена.`,
    grabbed: ({ index, position, count }) =>
      `Строка ${index} захвачена, позиция ${position} из ${count}. Стрелки перемещают, пробел или Enter отпускают, Escape отменяет.`,
    moved: ({ index, position, count }) => `Строка ${index}, позиция ${position} из ${count}.`,
    dropped: ({ index, position, count }) =>
      `Строка ${index} перемещена на позицию ${position} из ${count}.`,
    cancelled: ({ index }) => `Строка ${index}: перемещение отменено.`,
  },
};
