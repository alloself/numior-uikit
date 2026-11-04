import type { DocsMap } from '../.vitepress/reference/reference.types';
import { fieldControl, focusExposed } from './shared/field.ts';

const docs: DocsMap = {
  NuiTextarea: {
    props: {
      ...fieldControl,
      rows: { ru: 'Число видимых строк.', en: 'Number of visible rows.' },
      resize: {
        ru: 'Можно ли растягивать поле мышью: по вертикали, в обе стороны или нельзя.',
        en: 'Whether the user can resize the field: vertically, both ways or not at all.',
      },
      readonly: {
        ru: 'Запрещает ввод. Текст можно выделить и скопировать.',
        en: 'Blocks typing. The text can still be selected and copied.',
      },
      modelModifiers: {
        ru: 'Модификаторы `v-model`: `lazy` и `trim`.',
        en: '`v-model` modifiers: `lazy` and `trim`.',
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
