import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiProgress: {
    props: {
      value: {
        ru: 'Текущее значение; без него полоса неопределённая.',
        en: 'Current value; without it the bar is indeterminate.',
      },
      max: { ru: 'Максимум шкалы.', en: 'Maximum of the scale.' },
      size: { ru: 'Толщина полосы.', en: 'Bar thickness.' },
      tone: { ru: 'Цвет заполнения из токенов роли.', en: 'Fill colour from the role tokens.' },
      label: { ru: 'Доступное имя полосы.', en: 'Accessible name of the bar.' },
      valueText: {
        ru: 'Значение словами для экранного диктора.',
        en: 'Value in words for a screen reader.',
      },
      id: { ru: 'Идентификатор элемента.', en: 'Element id.' },
    },
    configurator: {
      props: ['value', 'max', 'size', 'tone'],
      values: { value: 40 },
    },
  },
};

export default docs;
