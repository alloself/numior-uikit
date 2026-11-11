import type { DocsMap } from '../.vitepress/reference/reference.types';
import { fieldControl } from './shared/field.ts';

const docs: DocsMap = {
  NuiRadioGroup: {
    configurator: {
      scene: 'radio-group/Example',
      props: [
        'orientation',
        'size',
        'disabled',
        'readonly',
        'invalid',
        'label',
        'description',
        'error',
      ],
      values: { label: { ru: 'Способ доставки', en: 'Delivery method' } },
    },
    props: {
      ...fieldControl,
      name: {
        ru: 'Имя, с которым выбранное значение уходит в форму.',
        en: 'Name the selected value is submitted with in a form.',
      },
      orientation: {
        ru: 'Располагает радиокнопки столбцом или в строку.',
        en: 'Lays out the radios in a column or a row.',
      },
      options: {
        ru: 'Варианты выбора. Радиокнопки строятся из них вместо слота.',
        en: 'Options to choose from. The radios are built from them instead of the slot.',
      },
    },
    models: {
      'v-model': { ru: 'Значение выбранной радиокнопки.', en: 'Value of the selected radio.' },
    },
    slots: {
      default: { ru: 'Радиокнопки `NuiRadio`.', en: '`NuiRadio` buttons.' },
      option: {
        ru: 'Подпись радиокнопки, построенной из `options`.',
        en: 'Label of a radio built from `options`.',
      },
    },
    keyboard: [
      {
        keys: 'ArrowDown',
        description: { ru: 'Выбирает следующую радиокнопку.', en: 'Selects the next radio.' },
      },
      {
        keys: 'ArrowUp',
        description: { ru: 'Выбирает предыдущую радиокнопку.', en: 'Selects the previous radio.' },
      },
      {
        keys: 'Space',
        description: { ru: 'Выбирает радиокнопку в фокусе.', en: 'Selects the focused radio.' },
      },
    ],
  },
  NuiRadio: {
    props: {
      value: {
        ru: 'Значение, которое получит `v-model` группы.',
        en: 'Value the group `v-model` receives.',
      },
      id: {
        ru: 'Идентификатор радиокнопки. По умолчанию создаётся автоматически.',
        en: 'Id of the radio. Generated automatically by default.',
      },
      disabled: { ru: 'Выключает только эту радиокнопку.', en: 'Disables this radio only.' },
    },
    slots: { default: { ru: 'Подпись радиокнопки.', en: 'Label of the radio.' } },
  },
};

export default docs;
