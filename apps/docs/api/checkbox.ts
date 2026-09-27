import type { DocsMap } from '../.vitepress/reference/reference.types';
import { fieldControl } from './shared/field.ts';

const space = {
  keys: 'Space',
  description: { ru: 'Переключает чекбокс.', en: 'Toggles the checkbox.' },
};

const docs: DocsMap = {
  NuiCheckbox: {
    props: {
      ...fieldControl,
      indeterminate: {
        ru: 'Визуальное состояние «частично выбрано»; клик снимает его.',
        en: 'Visual "partly selected" state; a click clears it.',
      },
      value: { ru: 'Значение нативного поля формы.', en: 'Value of the native form field.' },
    },
    models: { 'v-model': { ru: 'Отмечен ли чекбокс.', en: 'Whether the checkbox is checked.' } },
    slots: { default: { ru: 'Подпись рядом с индикатором.', en: 'Label next to the indicator.' } },
    keyboard: [space],
    configurator: {
      props: ['size', 'disabled', 'required', 'invalid', 'indeterminate', 'description', 'error'],
      content: { ru: 'Принимаю условия', en: 'I accept the terms' },
    },
  },
  NuiCheckboxGroup: {
    props: {
      ...fieldControl,
      options: { ru: 'Опции набора.', en: 'Options of the set.' },
      name: { ru: 'Общее имя нативных полей формы.', en: 'Shared name of the native form fields.' },
      orientation: { ru: 'Раскладка: столбцом или строкой.', en: 'Layout: a column or a row.' },
      getKey: {
        ru: 'Ключ для значений-объектов; без него ключом становится JSON.',
        en: 'Key for object values; without it the key is the JSON.',
      },
    },
    models: {
      'v-model': {
        ru: 'Выбранные значения в порядке выбора.',
        en: 'Selected values in selection order.',
      },
    },
    slots: {
      option: { ru: 'Подпись опции; получает опцию.', en: 'Option label; receives the option.' },
    },
    keyboard: [space],
  },
};

export default docs;
