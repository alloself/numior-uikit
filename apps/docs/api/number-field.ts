import type { DocsMap } from '../.vitepress/reference/reference.types';
import { fieldControl, focusExposed } from './shared/field.ts';

const docs: DocsMap = {
  NuiNumberField: {
    props: {
      ...fieldControl,
      min: {
        ru: 'Нижняя граница; значение зажимается при фиксации.',
        en: 'Lower bound; the value is clamped on commit.',
      },
      max: {
        ru: 'Верхняя граница; значение зажимается при фиксации.',
        en: 'Upper bound; the value is clamped on commit.',
      },
      step: {
        ru: 'Шаг стрелок и степперов; значения снапятся к сетке от min.',
        en: 'Step of the arrows and steppers; values snap to the grid from min.',
      },
      formatOptions: {
        ru: 'Опции Intl.NumberFormat: валюта, проценты, число знаков.',
        en: 'Intl.NumberFormat options: currency, percent, digits.',
      },
      locale: {
        ru: 'Локаль формата; по умолчанию из конфигурации.',
        en: 'Locale of the format; the configuration supplies the default.',
      },
      readonly: {
        ru: 'Запрещает ввод, но оставляет текст доступным для выделения.',
        en: 'Blocks typing while keeping the text selectable.',
      },
      steppers: { ru: 'Показывает кнопки плюс и минус.', en: 'Shows the plus and minus buttons.' },
      name: {
        ru: 'Имя скрытого поля формы с числом.',
        en: 'Name of the hidden form field with the number.',
      },
      incrementLabel: {
        ru: 'Доступное имя кнопки плюс; по умолчанию из словаря.',
        en: 'Accessible name of the plus button; the dictionary supplies the default.',
      },
      decrementLabel: {
        ru: 'Доступное имя кнопки минус; по умолчанию из словаря.',
        en: 'Accessible name of the minus button; the dictionary supplies the default.',
      },
    },
    models: {
      'v-model': {
        ru: 'Число или null, если поле пустое.',
        en: 'Number or null while the field is empty.',
      },
    },
    slots: {
      prefix: {
        ru: 'Содержимое перед числом внутри рамки.',
        en: 'Content before the number inside the frame.',
      },
      suffix: {
        ru: 'Содержимое после числа внутри рамки.',
        en: 'Content after the number inside the frame.',
      },
    },
    exposed: focusExposed,
    keyboard: [
      {
        keys: 'ArrowUp',
        description: {
          ru: 'Увеличивает на шаг; с Shift — на десять шагов.',
          en: 'Adds one step; with Shift ten steps.',
        },
      },
      {
        keys: 'ArrowDown',
        description: {
          ru: 'Уменьшает на шаг; с Shift — на десять шагов.',
          en: 'Subtracts one step; with Shift ten steps.',
        },
      },
      {
        keys: 'PageUp',
        description: { ru: 'Увеличивает на десять шагов.', en: 'Adds ten steps.' },
      },
      {
        keys: 'PageDown',
        description: { ru: 'Уменьшает на десять шагов.', en: 'Subtracts ten steps.' },
      },
      { keys: 'Home', description: { ru: 'Переходит к min.', en: 'Moves to min.' } },
      { keys: 'End', description: { ru: 'Переходит к max.', en: 'Moves to max.' } },
      {
        keys: 'Enter',
        description: {
          ru: 'Фиксирует значение и не мешает отправке формы.',
          en: 'Commits the value without blocking the form submit.',
        },
      },
    ],
    configurator: {
      values: { label: { ru: 'Количество', en: 'Quantity' } },
      props: [
        'size',
        'disabled',
        'readonly',
        'steppers',
        'invalid',
        'min',
        'max',
        'step',
        'label',
        'description',
        'error',
      ],
    },
  },
};

export default docs;
