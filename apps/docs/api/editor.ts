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
