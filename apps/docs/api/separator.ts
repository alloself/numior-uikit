import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiSeparator: {
    props: {
      orientation: {
        ru: 'Горизонтальная линия или вертикальная между элементами ряда.',
        en: 'A horizontal line, or a vertical one between items in a row.',
      },
      decorative: {
        ru: 'Скрывает линию от экранных дикторов, когда она только украшает.',
        en: 'Hides the line from screen readers when it is purely decorative.',
      },
      label: {
        ru: 'Текст посередине горизонтальной линии.',
        en: 'Text in the middle of a horizontal line.',
      },
    },
    slots: {
      default: {
        ru: 'Разметка вместо текста `label`.',
        en: 'Markup in place of the `label` text.',
      },
    },
    configurator: {
      props: ['orientation', 'label', 'decorative'],
      values: { label: { ru: 'или', en: 'or' } },
    },
  },
};

export default docs;
