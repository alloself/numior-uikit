import type { DocsMap } from '../.vitepress/reference/reference.types';
import { fieldControl, focusExposed } from './shared/field.ts';

const docs: DocsMap = {
  NuiInput: {
    props: {
      ...fieldControl,
      type: {
        ru: 'Тип поля: `text`, `email`, `password`, `search`, `tel` или `url`.',
        en: 'Input type: `text`, `email`, `password`, `search`, `tel` or `url`.',
      },
      readonly: {
        ru: 'Запрещает ввод. Текст можно выделить и скопировать.',
        en: 'Blocks typing. The text can still be selected and copied.',
      },
      mask: {
        ru: 'Маска ввода, например `+7 (###) ###-##-##`. `#` — цифра, `A` — буква, `*` — буква или цифра.',
        en: 'Input mask, such as `+1 (###) ###-####`. `#` is a digit, `A` a letter, `*` a letter or digit.',
      },
      modelModifiers: {
        ru: 'Модификаторы `v-model`: `lazy`, `trim` и `unmasked`.',
        en: 'The `v-model` modifiers: `lazy`, `trim` and `unmasked`.',
      },
    },
    models: {
      'v-model': {
        ru: 'Текст поля. С маской — строка с разделителями, а с `.unmasked` — только введённые символы.',
        en: 'Field text. With a mask, the string with separators. With `.unmasked`, only the typed characters.',
      },
    },
    slots: {
      prefix: {
        ru: 'Содержимое внутри поля перед текстом, например иконка.',
        en: 'Content inside the field before the text, such as an icon.',
      },
      suffix: {
        ru: 'Содержимое внутри поля после текста, например кнопка.',
        en: 'Content inside the field after the text, such as a button.',
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
