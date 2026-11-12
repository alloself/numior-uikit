import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiProgress: {
    props: {
      value: {
        ru: 'Текущее значение. Без него полоса показывает бегущую анимацию ожидания.',
        en: 'Current value. Without it, the bar shows an indeterminate animation.',
      },
      max: {
        ru: 'Значение, при котором полоса заполнена целиком.',
        en: 'Value at which the bar is full.',
      },
      size: { ru: 'Задаёт толщину полосы.', en: 'Changes the thickness of the bar.' },
      tone: {
        ru: 'Цвет заполнения по смыслу: `primary`, `success`, `warning`, `error` и другие.',
        en: 'Fill color by meaning: `primary`, `success`, `warning`, `error` and others.',
      },
      label: {
        ru: 'Название полосы для экранных дикторов, например «Загрузка файла».',
        en: 'Name of the bar for screen readers, such as “Uploading file”.',
      },
      valueText: {
        ru: 'Значение словами для экранных дикторов, например «3 из 10 файлов».',
        en: 'Value in words for screen readers, such as “3 of 10 files”.',
      },
      id: {
        ru: 'Идентификатор элемента.',
        en: 'The `id` of the native `<progress>`, such as for a `<label for>`.',
      },
    },
    configurator: {
      props: ['value', 'max', 'size', 'tone'],
      values: { value: 40 },
    },
  },
};

export default docs;
