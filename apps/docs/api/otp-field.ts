import type { DocsMap } from '../.vitepress/reference/reference.types';
import { fieldControl, focusExposed } from './shared/field.ts';

const docs: DocsMap = {
  NuiOtpField: {
    props: {
      ...fieldControl,
      length: { ru: 'Число символов кода.', en: 'Number of characters in the code.' },
      groupSize: {
        ru: 'Размер группы ячеек; последняя группа может быть короче.',
        en: 'Size of a slot group; the last group may be shorter.',
      },
      charset: {
        ru: 'Допустимые символы: только цифры или латиница с цифрами в верхнем регистре.',
        en: 'Accepted characters: digits only, or Latin letters and digits in upper case.',
      },
      secret: {
        ru: 'Точки вместо символов; только что введённый символ виден секунду.',
        en: 'Dots instead of characters; the character just typed stays visible for a second.',
      },
      placeholder: {
        ru: 'Символ в пустых ячейках; экранные чтецы его не озвучивают.',
        en: 'Character in empty slots; screen readers do not announce it.',
      },
      webOtp: {
        ru: 'Принимает код из SMS через WebOTP, пока поле не заполнено.',
        en: 'Takes the code from an SMS through WebOTP until the field is complete.',
      },
    },
    models: {
      'v-model': {
        ru: 'Введённые символы без разделителей: от пустой строки до length символов.',
        en: 'Typed characters without separators: from an empty string up to length characters.',
      },
    },
    events: {
      complete: {
        ru: 'Код набран целиком: вводом, вставкой, автозаполнением или через WebOTP.',
        en: 'The whole code is in: typed, pasted, autofilled or received through WebOTP.',
      },
    },
    slots: {
      separator: {
        ru: 'Разделитель между группами; по умолчанию минус.',
        en: 'Separator between groups; a minus by default.',
      },
    },
    exposed: focusExposed,
    keyboard: [
      {
        keys: 'ArrowLeft',
        description: { ru: 'Предыдущая ячейка.', en: 'Previous slot.' },
      },
      {
        keys: 'ArrowRight',
        description: {
          ru: 'Следующая ячейка, но не дальше первой пустой.',
          en: 'Next slot, but not past the first empty one.',
        },
      },
      { keys: 'Home', description: { ru: 'Первая ячейка.', en: 'First slot.' } },
      {
        keys: 'End',
        description: {
          ru: 'Первая пустая ячейка или последняя заполненная.',
          en: 'First empty slot, or the last filled one.',
        },
      },
      {
        keys: 'Backspace',
        description: {
          ru: 'Удаляет символ и сдвигает остальные влево, активной становится ячейка слева.',
          en: 'Deletes the character, shifts the rest left and activates the slot on the left.',
        },
      },
      {
        keys: 'Delete',
        description: {
          ru: 'Удаляет символ и сдвигает остальные влево, активная ячейка остаётся.',
          en: 'Deletes the character, shifts the rest left and keeps the active slot.',
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
