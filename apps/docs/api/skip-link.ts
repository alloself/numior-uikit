import type { DocsMap } from '../.vitepress/reference/reference.types';

const dictionary = (ru: string, en: string) => ({
  ru: `${ru}; по умолчанию из словаря.`,
  en: `${en}; the dictionary supplies the default.`,
});

const docs: DocsMap = {
  NuiSkipLink: {
    props: {
      target: {
        ru: 'id элемента, куда переходит фокус.',
        en: 'Id of the element that receives the focus.',
      },
      label: dictionary('Текст ссылки', 'Link text'),
    },
    slots: { default: { ru: 'Разметка вместо текста.', en: 'Markup in place of the text.' } },
    keyboard: [
      {
        keys: 'Tab',
        description: {
          ru: 'Первое нажатие на странице показывает ссылку.',
          en: 'The first press on the page reveals the link.',
        },
      },
      {
        keys: 'Enter',
        description: { ru: 'Переносит фокус на цель.', en: 'Moves the focus to the target.' },
      },
    ],
  },
};

export default docs;
