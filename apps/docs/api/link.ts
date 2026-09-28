import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiLink: {
    props: {
      as: {
        ru: 'Переопределяет тег или компонент ссылки; без него to берёт роутер.',
        en: 'Overrides the link tag or component; without it to takes the router.',
      },
      href: { ru: 'Адрес ссылки.', en: 'Link address.' },
      to: {
        ru: 'Маршрут для RouterLink или NuxtLink приложения либо link из конфигурации; без роутера строка становится href. Тип уточняется через NuiRouteRegister.',
        en: 'Route for the app RouterLink or NuxtLink or the configured link; without a router a string becomes href. NuiRouteRegister narrows the type.',
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
