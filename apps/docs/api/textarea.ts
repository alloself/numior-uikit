import type { DocsMap } from '../.vitepress/reference/reference.types';
import { fieldControl, focusExposed } from './shared/field.ts';

const docs: DocsMap = {
  NuiTextarea: {
    props: {
      ...fieldControl,
      rows: { ru: 'Число видимых строк.', en: 'Number of visible rows.' },
      resize: {
        ru: 'Разрешённое изменение размера: по вертикали, в обе стороны или никакое.',
        en: 'Allowed resizing: vertical, both directions or none.',
      },
      readonly: {
        ru: 'Запрещает ввод, но оставляет текст доступным для выделения.',
        en: 'Blocks typing while keeping the text selectable.',
      },
      modelModifiers: {
        ru: 'Модификаторы v-model: lazy и trim.',
        en: 'v-model modifiers: lazy and trim.',
      },
    },
    models: { 'v-model': { ru: 'Текст поля.', en: 'Field text.' } },
    exposed: focusExposed,
    configurator: {
      values: { label: { ru: 'О себе', en: 'About you' } },
      props: [
        'rows',
        'resize',
        'size',
        'disabled',
        'readonly',
        'invalid',
        'label',
        'description',
        'error',
      ],
    },
  },
};

export default docs;
