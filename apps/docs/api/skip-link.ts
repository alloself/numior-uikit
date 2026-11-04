import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiSkipLink: {
    props: {
      target: {
        ru: '`id` элемента, на который перейдёт фокус, например `main`.',
        en: '`id` of the element that receives focus, such as `main`.',
      },
      label: {
        ru: 'Текст ссылки. По умолчанию — «К содержимому» из словаря.',
        en: 'Link text. Defaults to “Skip to content” from the dictionary.',
      },
    },
    slots: { default: { ru: 'Разметка вместо текста.', en: 'Markup in place of the text.' } },
    keyboard: [
      {
        keys: 'Tab',
        description: {
          ru: 'Первое нажатие на странице показывает ссылку.',
          en: 'The first press on the page shows the link.',
        },
      },
      {
        keys: 'Enter',
        description: {
          ru: 'Переносит фокус на элемент `target`.',
          en: 'Moves focus to the `target` element.',
        },
      },
    ],
  },
};

export default docs;
