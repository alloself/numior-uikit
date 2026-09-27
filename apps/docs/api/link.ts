import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiLink: {
    props: {
      as: { ru: 'Тег или компонент ссылки роутера.', en: 'Tag or router link component.' },
      href: { ru: 'Адрес ссылки.', en: 'Link address.' },
      to: {
        ru: 'Маршрут для компонента роутера: строка или объект; тип уточняется через NuiRouteRegister.',
        en: 'Route for a router component: a string or an object; NuiRouteRegister narrows the type.',
      },
      tone: { ru: 'Цвет из токенов роли.', en: 'Colour from the role tokens.' },
      underline: {
        ru: 'Когда показывать подчёркивание: всегда, при наведении или никогда.',
        en: 'When to underline: always, on hover or never.',
      },
      external: {
        ru: 'Открывает адрес в новой вкладке с rel и иконкой.',
        en: 'Opens the address in a new tab with rel and an icon.',
      },
      disabled: {
        ru: 'Убирает адрес и помечает ссылку aria-disabled.',
        en: 'Removes the address and marks the link aria-disabled.',
      },
    },
    slots: { default: { ru: 'Текст ссылки.', en: 'Link text.' } },
    keyboard: [
      { keys: 'Enter', description: { ru: 'Переходит по ссылке.', en: 'Follows the link.' } },
    ],
    configurator: {
      props: ['tone', 'underline', 'external', 'disabled'],
      content: { ru: 'Документация', en: 'Documentation' },
    },
  },
};

export default docs;
