import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiKbd: {
    props: {
      keys: {
        ru: 'Сочетание в записи хоткея (mod+k) или список сочетаний.',
        en: 'A combo in hotkey notation (mod+k) or a list of combos.',
      },
      size: { ru: 'Размер клавиш.', en: 'Key size.' },
      variant: { ru: 'Клавиши в рамках или простым текстом.', en: 'Boxed keys or plain text.' },
      platform: {
        ru: 'Платформа для глифов модификаторов; по умолчанию определяется после монтирования.',
        en: 'Platform for the modifier glyphs; detected after mounting by default.',
      },
    },
    slots: {
      default: {
        ru: 'Произвольный текст клавиши, когда keys не задан.',
        en: 'Arbitrary key text when keys is not set.',
      },
    },
    configurator: {
      props: ['size', 'variant', 'platform'],
      content: { ru: 'Esc', en: 'Esc' },
    },
  },
};

export default docs;
