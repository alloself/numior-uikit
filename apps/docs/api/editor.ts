import type { DocsMap } from '../.vitepress/reference/reference.types';
import { fieldControl } from './shared/field.ts';

const docs: DocsMap = {
  NuiEditor: {
    props: {
      ...fieldControl,
      readonly: {
        ru: 'Запрещает правку, но оставляет текст доступным для выделения.',
        en: 'Blocks editing while keeping the text selectable.',
      },
      schema: {
        ru: 'Схема документа; по умолчанию contentSchema из @numior/content.',
        en: 'Document schema; contentSchema from @numior/content by default.',
      },
      placeholder: {
        ru: 'Подсказка в пустом документе.',
        en: 'Hint shown in an empty document.',
      },
      autofocus: {
        ru: 'Ставит фокус в редактор после монтирования.',
        en: 'Focuses the editor once it is mounted.',
      },
      toolbar: {
        ru: 'Панели форматирования: fixed — липкая панель над текстом, bubble — меню над выделенным текстом, both — обе, none — без них; в режиме чтения панелей нет. Alt+F10 переводит фокус в панель, Escape возвращает в текст, Ctrl+K открывает правку ссылки.',
        en: 'Formatting bars: fixed is a sticky bar above the text, bubble a menu over selected text, both shows both, none hides them; read-only editors have none. Alt+F10 moves focus into the bar, Escape returns to the text, Ctrl+K opens link editing.',
      },
      colours: {
        ru: 'Пресеты цвета текста, которые предлагает меню и принимает вставка; по умолчанию все девять. Цвета, которые уже есть в документе, сохраняются.',
        en: 'Text colour presets the menu offers and pastes keep; all nine by default. Colours already in the document stay.',
      },
      blockHandles: {
        ru: 'Ручка у блока под указателем (на сенсорных экранах — у блока с курсором): меню «Превратить в», «Дублировать», «Переместить», «Удалить» и перетаскивание блока. Ctrl+Shift+↑/↓ переносит блок с курсором.',
        en: 'A handle on the block under the pointer (on touch screens, the block with the caret): a menu to turn, duplicate, move or delete the block and dragging. Ctrl+Shift+Up/Down moves the block with the caret.',
      },
      highlights: {
        ru: 'Пресеты фонового выделения, которые предлагает меню и принимает вставка; по умолчанию все девять.',
        en: 'Highlight presets the menu offers and pastes keep; all nine by default.',
      },
    },
    models: {
      'v-model:document': {
        ru: 'Документ в JSON формата 1; новый объект снаружи начинает историю заново.',
        en: 'The document as format 1 JSON; a new object from outside restarts the history.',
      },
    },
    events: {
      change: { ru: 'Документ изменился.', en: 'The document changed.' },
      focus: { ru: 'Редактор получил фокус.', en: 'The editor received focus.' },
      blur: { ru: 'Редактор потерял фокус.', en: 'The editor lost focus.' },
      paste: {
        ru: 'Пользователь вставил содержимое; source — откуда оно: own, word, google-docs, excel, sheets, html или text.',
        en: 'The user pasted content; source tells where it came from: own, word, google-docs, excel, sheets, html or text.',
      },
    },
    exposed: {
      editor: {
        ru: 'Доступ к состоянию, запуск команд ядра и фокус.',
        en: 'Access to the state, core commands and focus.',
      },
    },
  },
};

export default docs;
