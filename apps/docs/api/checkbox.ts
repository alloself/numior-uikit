import type { DocsMap } from '../.vitepress/reference/reference.types';
import { fieldControl } from './shared/field.ts';

const space = {
  keys: 'Space',
  description: { ru: 'Ставит или снимает отметку.', en: 'Checks or unchecks the box.' },
};

const docs: DocsMap = {
  NuiCheckbox: {
    props: {
      ...fieldControl,
      indeterminate: {
        ru: 'Показывает черту вместо галочки: выбрана часть вложенных пунктов. Нажатие снимает это состояние.',
        en: 'Shows a dash instead of a check: some nested items are selected. A click clears it.',
      },
      value: {
        ru: 'Значение, которое уходит с формой, когда флажок отмечен.',
        en: 'Value sent with the form when the box is checked.',
      },
    },
    models: { 'v-model': { ru: 'Отмечен ли флажок.', en: 'Whether the checkbox is checked.' } },
    slots: { default: { ru: 'Подпись рядом с флажком.', en: 'Label next to the checkbox.' } },
    keyboard: [space],
    configurator: {
      props: ['size', 'disabled', 'required', 'invalid', 'indeterminate', 'description', 'error'],
      content: { ru: 'Принимаю условия', en: 'I accept the terms' },
    },
  },
  NuiCheckboxGroup: {
    props: {
      ...fieldControl,
      options: {
        ru: 'Варианты списком объектов с полями `value`, `label` и `disabled`.',
        en: 'Choices as objects with `value`, `label` and `disabled`.',
      },
      name: {
        ru: 'Атрибут `name` всех флажков группы для отправки формы.',
        en: 'The `name` attribute of every checkbox in the group, for form submission.',
      },
      orientation: {
        ru: 'Расположение: столбцом (`vertical`) или в строку (`horizontal`).',
        en: 'Layout: a column (`vertical`) or a row (`horizontal`).',
      },
      getKey: {
        ru: 'Функция, которая возвращает ключ значения-объекта. Без неё ключом служит JSON значения.',
        en: 'Function that returns the key of an object value. Without it the JSON of the value is the key.',
      },
    },
    models: {
      'v-model:values': {
        ru: 'Массив выбранных значений в том порядке, в каком их отметили.',
        en: 'Array of selected values in the order they were checked.',
      },
    },
    slots: {
      option: {
        ru: 'Своя подпись варианта. Получает `option`.',
        en: 'Custom choice label. Receives `option`.',
      },
    },
    keyboard: [space],
  },
};

export default docs;
