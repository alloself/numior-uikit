import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiBreadcrumbs: {
    props: {
      items: {
        ru: 'Элементы пути: подпись, адрес или маршрут, иконка.',
        en: 'Path items: label, address or route, icon.',
      },
      maxItems: {
        ru: 'Сколько элементов показывать; середина сворачивается в меню.',
        en: 'How many items to show; the middle collapses into a menu.',
      },
      separator: {
        ru: 'Иконка-разделитель; зеркалится в RTL.',
        en: 'Separator icon; mirrored in RTL.',
      },
      label: {
        ru: 'Доступное имя навигации; по умолчанию из словаря.',
        en: 'Accessible name of the navigation; the dictionary supplies the default.',
      },
      moreLabel: {
        ru: 'Доступное имя кнопки «…»; по умолчанию из словаря.',
        en: 'Accessible name of the “…” button; the dictionary supplies the default.',
      },
      as: {
        ru: 'Переопределяет компонент ссылки для элементов с to.',
        en: 'Overrides the link component for items with to.',
      },
    },
    slots: {
      item: {
        ru: 'Своя крошка; получает item, index и current.',
        en: 'Custom crumb; receives item, index and current.',
      },
    },
    keyboard: [
      {
        keys: 'Tab',
        description: { ru: 'Переходит по ссылкам пути.', en: 'Moves through the path links.' },
      },
      {
        keys: 'Enter',
        description: {
          ru: 'Переходит по ссылке; на кнопке «…» открывает меню.',
          en: 'Follows the link; on the “…” button opens the menu.',
        },
      },
    ],
  },
};

export default docs;
