import type { DocsMap } from '../.vitepress/reference/reference.types';
import { fieldControl, focusExposed } from './shared/field.ts';

const docs: DocsMap = {
  NuiOtpField: {
    props: {
      ...fieldControl,
      length: {
        ru: 'Сколько символов в коде, по умолчанию 6.',
        en: 'Number of characters in the code, 6 by default.',
      },
      groupSize: {
        ru: 'Сколько ячеек в группе между разделителями. Последняя группа может быть короче.',
        en: 'Number of cells in a group between separators. The last group may be shorter.',
      },
      charset: {
        ru: 'Какие символы принимает поле: `digits` — только цифры, `alphanumeric` — заглавные латинские буквы и цифры.',
        en: 'Characters the field accepts: `digits` for digits only, `alphanumeric` for upper-case Latin letters and digits.',
      },
      secret: {
        ru: 'Скрывает код за точками. Только что введённый символ виден секунду.',
        en: 'Hides the code behind dots. The character just typed stays visible for a second.',
      },
      placeholder: {
        ru: 'Символ в пустых ячейках, например `·`. Экранные дикторы его не читают.',
        en: 'Character shown in empty cells, such as `·`. Screen readers skip it.',
      },
      webOtp: {
        ru: 'Подставляет код из SMS через WebOTP, пока поле не заполнено.',
        en: 'Fills in the code from an SMS through WebOTP until the field is complete.',
      },
    },
    models: {
      'v-model': {
        ru: 'Введённый код без разделителей, от пустой строки до `length` символов.',
        en: 'Typed code without separators, from an empty string up to `length` characters.',
      },
    },
    events: {
      complete: {
        ru: 'Срабатывает, когда код набран целиком: вручную, вставкой, автозаполнением или через WebOTP.',
        en: 'Fires when the whole code is in: typed, pasted, autofilled or received through WebOTP.',
      },
    },
    slots: {
      separator: {
        ru: 'Разделитель между группами ячеек. По умолчанию — иконка минуса.',
        en: 'Separator between cell groups. A minus icon by default.',
      },
    },
    exposed: focusExposed,
    keyboard: [
      {
        keys: 'ArrowLeft',
        description: { ru: 'Переходит к предыдущей ячейке.', en: 'Moves to the previous cell.' },
      },
      {
        keys: 'ArrowRight',
        description: {
          ru: 'Переходит к следующей ячейке, но не дальше первой пустой.',
          en: 'Moves to the next cell, but not past the first empty one.',
        },
      },
      {
        keys: 'Home',
        description: { ru: 'Переходит к первой ячейке.', en: 'Moves to the first cell.' },
      },
      {
        keys: 'End',
        description: {
          ru: 'Переходит к первой пустой ячейке или к последней, если код набран.',
          en: 'Moves to the first empty cell, or to the last one when the code is complete.',
        },
      },
      {
        keys: 'Backspace',
        description: {
          ru: 'Удаляет символ и переходит к ячейке слева. Остальные символы сдвигаются влево.',
          en: 'Deletes the character and moves to the cell on the left. The rest shift left.',
        },
      },
      {
        keys: 'Delete',
        description: {
          ru: 'Удаляет символ в текущей ячейке. Остальные символы сдвигаются влево.',
          en: 'Deletes the character in the current cell. The rest shift left.',
        },
      },
    ],
    configurator: {
      values: { label: { ru: 'Код из SMS', en: 'SMS code' }, groupSize: 3 },
      props: [
        'length',
        'groupSize',
        'charset',
        'secret',
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
