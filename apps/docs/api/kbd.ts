import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiKbd: {
    props: {
      keys: {
        ru: 'Сочетание клавиш, например `mod+k`, или список сочетаний. `mod` — ⌘ на Mac и Ctrl на других системах.',
        en: 'Key combo, such as `mod+k`, or a list of combos. `mod` is ⌘ on Mac and Ctrl elsewhere.',
      },
      size: { ru: 'Размер клавиш: `sm` или `md`.', en: 'Key size: `sm` or `md`.' },
      variant: {
        ru: 'Оформление: клавиши в рамках (`boxed`), простым текстом (`plain`) или на полупрозрачной подложке цвета текста (`soft`).',
        en: 'Style: keys in boxes (`boxed`), plain text (`plain`) or on a translucent tint of the text colour (`soft`).',
      },
      platform: {
        ru: 'Как показывать модификаторы: `mac` — значками ⌘ и ⌥, `other` — словами. Без него система определяется после монтирования.',
        en: 'How modifiers show: `mac` as ⌘ and ⌥ glyphs, `other` as words. Detected after mounting by default.',
      },
    },
    slots: {
      default: {
        ru: 'Текст клавиши, когда `keys` не задан.',
        en: 'Key text when `keys` is not set.',
      },
    },
    configurator: {
      props: ['size', 'variant', 'platform'],
      content: { ru: 'Esc', en: 'Esc' },
    },
  },
};

export default docs;
