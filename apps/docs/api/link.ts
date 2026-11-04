import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiLink: {
    props: {
      as: {
        ru: 'Тег или компонент, которым рисуется ссылка. Без него ссылку с `to` рисует роутер.',
        en: 'Tag or component to render the link with. Without it, a link with `to` uses the router.',
      },
      href: { ru: 'Адрес ссылки.', en: 'Link address.' },
      to: {
        ru: 'Маршрут для `RouterLink`, `NuxtLink` или ссылки из конфигурации. Без роутера строка становится `href`. Тип маршрута задаёт `NuiRouteRegister`.',
        en: 'Route for `RouterLink`, `NuxtLink` or the configured link. Without a router, a string becomes `href`. `NuiRouteRegister` sets the route type.',
      },
      tone: {
        ru: 'Цвет ссылки по смыслу: `primary`, `success`, `error` и другие.',
        en: 'Colour of the link by meaning: `primary`, `success`, `error` and others.',
      },
      underline: {
        ru: 'Когда показывать подчёркивание: всегда, при наведении или никогда.',
        en: 'When to underline: always, on hover or never.',
      },
      external: {
        ru: 'Открывает адрес в новой вкладке и показывает иконку внешней ссылки.',
        en: 'Opens the address in a new tab and shows an external link icon.',
      },
      disabled: {
        ru: 'Отключает ссылку: адрес убирается, Tab её пропускает.',
        en: 'Disables the link: the address is removed and Tab skips it.',
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
