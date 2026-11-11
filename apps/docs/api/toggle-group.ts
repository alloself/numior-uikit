import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiToggleGroup: {
    configurator: {
      scene: 'toggle-group/Example',
      props: ['variant', 'size', 'orientation', 'required', 'disabled', 'iconOnly', 'label'],
      values: { label: { ru: 'Какие заказы показать', en: 'Orders to show' } },
    },
    props: {
      items: {
        ru: 'Кнопки группы с полями `value`, `label`, а также `icon` и `disabled`.',
        en: 'Buttons of the group with `value` and `label`, plus optional `icon` and `disabled`.',
      },
      multiple: {
        ru: 'Разрешает нажать несколько кнопок. Значения приходят в `v-model:values`.',
        en: 'Lets several buttons be pressed. The values come in `v-model:values`.',
      },
      required: {
        ru: 'Без `multiple` не даёт отжать нажатую кнопку, чтобы значение не стало пустым.',
        en: 'Without `multiple`, keeps the pressed button from being released so the value never empties.',
      },
      variant: {
        ru: 'Оформление: `outline` — отдельные кнопки в рамке, `segmented` — кнопки одной полосой.',
        en: 'Style: `outline` for separate outlined buttons, `segmented` for buttons in one bar.',
      },
      size: {
        ru: 'Размер кнопок: `sm`, `md` или `lg`.',
        en: 'Size of the buttons: `sm`, `md` or `lg`.',
      },
      orientation: {
        ru: 'Располагает кнопки в ряд или столбцом. В столбце работают стрелки вверх и вниз.',
        en: 'Lays out the buttons in a row or a column. A column uses the up and down arrows.',
      },
      disabled: { ru: 'Отключает всю группу.', en: 'Disables the whole group.' },
      iconOnly: {
        ru: 'Показывает только иконки. Подпись видна в подсказке при наведении и читается экранными дикторами.',
        en: 'Shows icons only. The label appears in a tooltip on hover and is read by screen readers.',
      },
      label: {
        ru: 'Подпись группы для экранных дикторов.',
        en: 'Label of the group for screen readers.',
      },
      getKey: {
        ru: 'Функция, которая даёт ключ значению-объекту. Без неё ключом служит JSON значения.',
        en: 'Function that returns a key for an object value. Without it, the JSON of the value is used.',
      },
    },
    models: {
      'v-model': {
        ru: 'Значение нажатой кнопки без `multiple` или `null`.',
        en: 'Value of the pressed button without `multiple`, or `null`.',
      },
      'v-model:values': {
        ru: 'Значения нажатых кнопок с `multiple`.',
        en: 'Values of the pressed buttons with `multiple`.',
      },
    },
    slots: {
      item: {
        ru: 'Своё содержимое кнопки. Получает `item` и `selected`.',
        en: 'Custom button content. Receives `item` and `selected`.',
      },
    },
    keyboard: [
      {
        keys: 'ArrowRight',
        description: {
          ru: 'Переходит к следующей кнопке. В столбце — стрелка вниз.',
          en: 'Moves to the next button. In a column, use ArrowDown.',
        },
      },
      {
        keys: 'ArrowLeft',
        description: {
          ru: 'Переходит к предыдущей кнопке. В столбце — стрелка вверх.',
          en: 'Moves to the previous button. In a column, use ArrowUp.',
        },
      },
      {
        keys: 'Home',
        description: { ru: 'Переходит к первой кнопке.', en: 'Moves to the first button.' },
      },
      {
        keys: 'End',
        description: { ru: 'Переходит к последней кнопке.', en: 'Moves to the last button.' },
      },
      {
        keys: 'Space',
        description: { ru: 'Нажимает или отжимает кнопку.', en: 'Presses or releases the button.' },
      },
    ],
  },
};

export default docs;
