import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiEditorMessages {
  readonly toolbar: string;
  readonly undo: string;
  readonly redo: string;
  readonly blockType: string;
  readonly currentBlock: (params: { readonly type: string }) => string;
  readonly text: string;
  readonly heading: (params: { readonly level: number }) => string;
  readonly codeBlock: string;
  readonly bold: string;
  readonly italic: string;
  readonly underline: string;
  readonly strike: string;
  readonly code: string;
  readonly bulletList: string;
  readonly orderedList: string;
  readonly todoList: string;
  readonly quote: string;
  readonly divider: string;
}

export const editorMessages: NuiMessageCatalog<'editor'> = {
  namespace: 'editor',
  en: {
    toolbar: 'Formatting',
    undo: 'Undo',
    redo: 'Redo',
    blockType: 'Block type',
    currentBlock: ({ type }) => `Block type: ${type}`,
    text: 'Text',
    heading: ({ level }) => `Heading ${String(level)}`,
    codeBlock: 'Code block',
    bold: 'Bold',
    italic: 'Italic',
    underline: 'Underline',
    strike: 'Strikethrough',
    code: 'Inline code',
    bulletList: 'Bulleted list',
    orderedList: 'Numbered list',
    todoList: 'To-do list',
    quote: 'Quote',
    divider: 'Divider',
  },
  ru: {
    toolbar: 'Форматирование',
    undo: 'Отменить',
    redo: 'Повторить',
    blockType: 'Тип блока',
    currentBlock: ({ type }) => `Тип блока: ${type}`,
    text: 'Текст',
    heading: ({ level }) => `Заголовок ${String(level)}`,
    codeBlock: 'Блок кода',
    bold: 'Жирный',
    italic: 'Курсив',
    underline: 'Подчёркнутый',
    strike: 'Зачёркнутый',
    code: 'Код в строке',
    bulletList: 'Маркированный список',
    orderedList: 'Нумерованный список',
    todoList: 'Список задач',
    quote: 'Цитата',
    divider: 'Разделитель',
  },
};
