import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiSkeleton: {
    props: {
      shape: {
        ru: 'Строка текста, круг или прямоугольник.',
        en: 'A text line, a circle or a rectangle.',
      },
      width: { ru: 'Ширина в любых единицах CSS.', en: 'Width in any CSS unit.' },
      height: { ru: 'Высота в любых единицах CSS.', en: 'Height in any CSS unit.' },
      lines: { ru: 'Число строк для формы text.', en: 'Number of lines for the text shape.' },
      animated: {
        ru: 'Мерцание; под reduced motion выключено всегда.',
        en: 'Shimmer; always off under reduced motion.',
      },
    },
    configurator: {
      props: ['shape', 'lines', 'animated'],
    },
  },
};

export default docs;
