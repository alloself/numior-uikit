import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiBadge: {
    props: {
      tone: { ru: 'Цвет из токенов роли.', en: 'Colour from the role tokens.' },
      variant: {
        ru: 'Вид: мягкая заливка, контур или сплошной.',
        en: 'Look: soft fill, outline or solid.',
      },
      size: {
        ru: 'Высота бейджа: обычная или компактная.',
        en: 'Badge height: regular or compact.',
      },
      icon: { ru: 'Иконка перед текстом.', en: 'Icon before the text.' },
      dot: { ru: 'Только точка без текста.', en: 'A dot without text.' },
      count: { ru: 'Число вместо текста.', en: 'A number instead of the text.' },
      max: {
        ru: 'Предел счётчика; выше него показывается «99+».',
        en: 'Counter limit; above it "99+" is shown.',
      },
      label: {
        ru: 'Доступное имя точки или счётчика.',
        en: 'Accessible name of a dot or a counter.',
      },
      floating: {
        ru: 'Сажает бейдж в угол родителя с position: relative.',
        en: 'Places the badge in the corner of a relatively positioned parent.',
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
