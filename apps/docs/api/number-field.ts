import type { DocsMap } from '../.vitepress/reference/reference.types';
import { fieldControl, focusExposed } from './shared/field.ts';

const docs: DocsMap = {
  NuiNumberField: {
    props: {
      ...fieldControl,
      min: {
        ru: 'Наименьшее значение. Число меньше него заменяется на `min`, когда поле теряет фокус.',
        en: 'Smallest value. A lower number becomes `min` when the field loses focus.',
      },
      max: {
        ru: 'Наибольшее значение. Число больше него заменяется на `max`, когда поле теряет фокус.',
        en: 'Largest value. A higher number becomes `max` when the field loses focus.',
      },
      step: {
        ru: 'На сколько меняют число стрелки и кнопки плюс и минус. Значение округляется до шага от `min`.',
        en: 'Amount the arrow keys and plus and minus buttons change the number by. The value rounds to steps from `min`.',
      },
      formatOptions: {
        ru: 'Формат числа в опциях `Intl.NumberFormat`: валюта, проценты, число знаков после запятой.',
        en: 'Number format as `Intl.NumberFormat` options: currency, percent, fraction digits.',
      },
      locale: {
        ru: 'Язык формата числа, например `ru-RU`. По умолчанию — язык из `createNuiConfig`.',
        en: 'Locale of the number format, such as `en-US`. Defaults to the locale from `createNuiConfig`.',
      },
      readonly: {
        ru: 'Запрещает ввод. Число можно выделить и скопировать.',
        en: 'Blocks typing. The number can still be selected and copied.',
      },
      steppers: { ru: 'Показывает кнопки плюс и минус.', en: 'Shows the plus and minus buttons.' },
      name: {
        ru: 'Имя, с которым число уходит в форму.',
        en: 'Name the number is submitted with in a form.',
      },
      incrementLabel: {
        ru: 'Подпись кнопки плюс для экранных дикторов. По умолчанию — «Увеличить» из словаря.',
        en: 'Plus button label for screen readers. Defaults to "Increment" from the dictionary.',
      },
      decrementLabel: {
        ru: 'Подпись кнопки минус для экранных дикторов. По умолчанию — «Уменьшить» из словаря.',
        en: 'Minus button label for screen readers. Defaults to "Decrement" from the dictionary.',
      },
    },
    models: {
      'v-model': {
        ru: 'Число в поле или `null`, если поле пустое.',
        en: 'Number in the field, or `null` when the field is empty.',
      },
    },
    slots: {
      prefix: {
        ru: 'Содержимое перед числом внутри поля, например знак валюты.',
        en: 'Content before the number inside the field, such as a currency sign.',
      },
      suffix: {
        ru: 'Содержимое после числа внутри поля, например единица измерения.',
        en: 'Content after the number inside the field, such as a unit.',
      },
    },
    exposed: focusExposed,
    keyboard: [
      {
        keys: 'ArrowUp',
        description: {
          ru: 'Увеличивает число на шаг, с Shift — на десять шагов.',
          en: 'Increases the number by one step, or ten steps with Shift.',
        },
      },
      {
        keys: 'ArrowDown',
        description: {
          ru: 'Уменьшает число на шаг, с Shift — на десять шагов.',
          en: 'Decreases the number by one step, or ten steps with Shift.',
        },
      },
      {
        keys: 'PageUp',
        description: {
          ru: 'Увеличивает число на десять шагов.',
          en: 'Increases the number by ten steps.',
        },
      },
      {
        keys: 'PageDown',
        description: {
          ru: 'Уменьшает число на десять шагов.',
          en: 'Decreases the number by ten steps.',
        },
      },
      {
        keys: 'Home',
        description: { ru: 'Ставит значение `min`.', en: 'Sets the value to `min`.' },
      },
      {
        keys: 'End',
        description: { ru: 'Ставит значение `max`.', en: 'Sets the value to `max`.' },
      },
      {
        keys: 'Enter',
        description: {
          ru: 'Применяет введённое число. Форма при этом отправляется как обычно.',
          en: 'Applies the typed number. The form still submits as usual.',
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
