import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiToggleGroup: {
    props: {
      items: {
        ru: 'Кнопки группы: значение, подпись, иконка, disabled.',
        en: 'Buttons of the group: value, label, icon, disabled.',
      },
      multiple: {
        ru: 'Несколько нажатых кнопок; модель values.',
        en: 'Several pressed buttons; the values model.',
      },
      required: { ru: 'Нажатую кнопку нельзя отжать.', en: 'A pressed button cannot be released.' },
      variant: {
        ru: 'Отдельные кнопки с рамкой или сегментированная полоса.',
        en: 'Separate outlined buttons or a segmented bar.',
      },
      size: { ru: 'Размер кнопок.', en: 'Button size.' },
      orientation: {
        ru: 'Ряд или колонка; меняет клавиши стрелок.',
        en: 'A row or a column; changes the arrow keys.',
      },
      disabled: { ru: 'Выключает всю группу.', en: 'Disables the whole group.' },
      iconOnly: {
        ru: 'Только иконки; подписи уходят в доступное имя.',
        en: 'Icons only; the labels become the accessible names.',
      },
      label: { ru: 'Доступное имя группы.', en: 'Accessible name of the group.' },
      getKey: { ru: 'Ключ значения для объектов.', en: 'Value key for objects.' },
    },
    models: {
      'v-model': {
        ru: 'Нажатое значение в одиночном режиме или null.',
        en: 'The pressed value in single mode, or null.',
      },
      'v-model:values': {
        ru: 'Нажатые значения при multiple.',
        en: 'The pressed values with multiple.',
      },
    },
    slots: {
      item: {
        ru: 'Содержимое кнопки: { item, selected }.',
        en: 'Button content: { item, selected }.',
      },
    },
    keyboard: [
      {
        keys: 'ArrowRight',
        description: {
          ru: 'Следующая кнопка; в колонке — ArrowDown.',
          en: 'Next button; ArrowDown in a column.',
        },
      },
      {
        keys: 'ArrowLeft',
        description: {
          ru: 'Предыдущая кнопка; в колонке — ArrowUp.',
          en: 'Previous button; ArrowUp in a column.',
        },
      },
      { keys: 'Home', description: { ru: 'Первая кнопка.', en: 'First button.' } },
      { keys: 'End', description: { ru: 'Последняя кнопка.', en: 'Last button.' } },
      {
        keys: 'Space',
        description: { ru: 'Нажимает или отжимает кнопку.', en: 'Presses or releases the button.' },
      },
    ],
  },
};

export default docs;
