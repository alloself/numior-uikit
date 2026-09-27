import type { DocsMap } from '../.vitepress/reference/reference.types';
import { fieldControl, focusExposed } from './shared/field.ts';

const docs: DocsMap = {
  NuiInput: {
    props: {
      ...fieldControl,
      type: { ru: 'Нативный тип текстового поля.', en: 'Native type of the text field.' },
      readonly: {
        ru: 'Запрещает ввод, но оставляет текст доступным для выделения.',
        en: 'Blocks typing while keeping the text selectable.',
      },
      mask: {
        ru: 'Шаблон ввода: # — цифра, A — буква, * — буква или цифра, остальное — литералы.',
        en: 'Input pattern: # is a digit, A a letter, * a letter or digit, the rest are literals.',
      },
      modelModifiers: {
        ru: 'Модификаторы v-model: lazy, trim и unmasked.',
        en: 'v-model modifiers: lazy, trim and unmasked.',
      },
    },
    models: {
      'v-model': {
        ru: 'Текст поля; с маской — отформатированная строка или, с .unmasked, значимые символы.',
        en: 'Field text; with a mask the formatted string or, with .unmasked, the meaningful characters.',
      },
    },
    slots: {
      prefix: {
        ru: 'Содержимое перед текстом внутри рамки.',
        en: 'Content before the text inside the frame.',
      },
      suffix: {
        ru: 'Содержимое после текста внутри рамки.',
        en: 'Content after the text inside the frame.',
      },
    },
    exposed: focusExposed,
    configurator: {
      values: { label: { ru: 'Имя', en: 'Name' } },
      props: [
        'type',
        'size',
        'disabled',
        'readonly',
        'invalid',
        'label',
        'description',
        'error',
        'reserveError',
      ],
    },
  },
};

export default docs;
