import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiBadge: {
    props: {
      tone: {
        ru: 'Цвет по смыслу: `primary`, `success`, `warning`, `error` и другие.',
        en: 'Color by meaning: `primary`, `success`, `warning`, `error` and others.',
      },
      variant: {
        ru: 'Оформление: мягкая заливка (`soft`), контур (`outline`) или сплошная заливка (`solid`).',
        en: 'Style: `soft` fill, `outline` or `solid` fill.',
      },
      size: {
        ru: 'Размер: `md` — обычный, `sm` — компактный.',
        en: 'Size: `md` for regular, `sm` for compact.',
      },
      icon: { ru: 'Иконка перед текстом.', en: 'Icon before the text.' },
      dot: { ru: 'Показывает только точку, без текста.', en: 'Shows only a dot, without text.' },
      count: { ru: 'Показывает число вместо текста.', en: 'Shows a number instead of the text.' },
      max: {
        ru: 'Наибольшее число на счётчике. Большее число показывается с плюсом, например «99+».',
        en: 'Largest number the counter shows. A larger count shows with a plus, like "99+".',
      },
      label: {
        ru: 'Подпись точки для экранных дикторов. Без неё дикторы точку пропускают.',
        en: 'Dot label for screen readers. Without it they skip the dot.',
      },
      floating: {
        ru: 'Ставит бейдж в верхний угол родителя. Родителю нужен `position: relative`.',
        en: 'Places the badge in the top corner of the parent. The parent needs `position: relative`.',
      },
    },
    slots: { default: { ru: 'Текст бейджа.', en: 'Badge text.' } },
    configurator: {
      props: ['tone', 'variant', 'size', 'dot'],
      content: { ru: 'Черновик', en: 'Draft' },
    },
  },
};

export default docs;
