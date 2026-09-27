import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiSeparator: {
    props: {
      orientation: {
        ru: 'Горизонтальная линия или вертикальная в ряду.',
        en: 'A horizontal line or a vertical one inside a row.',
      },
      decorative: {
        ru: 'Убирает роль separator: линия только визуальная.',
        en: 'Drops the separator role: the line is visual only.',
      },
      label: {
        ru: 'Текст посередине горизонтальной линии.',
        en: 'Text in the middle of a horizontal line.',
      },
    },
    slots: {
      default: { ru: 'Разметка вместо текста label.', en: 'Markup in place of the label text.' },
    },
    configurator: {
      props: ['orientation', 'label', 'decorative'],
      values: { label: { ru: 'или', en: 'or' } },
    },
  },
};

export default docs;
