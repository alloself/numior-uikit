import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Numior UI',
  description: 'Independent Vue 3.5+ UI kit — foundation in development.',
  cleanUrls: true,
  locales: {
    root: {
      label: 'Русский',
      lang: 'ru',
      themeConfig: {
        nav: [{ text: 'Начало', link: '/guide' }],
        sidebar: [
          {
            text: 'Основание',
            items: [
              { text: 'Начало работы', link: '/guide' },
              { text: 'Темизация', link: '/theming' },
            ],
          },
          {
            text: 'Компоненты',
            items: [
              { text: 'Кнопка', link: '/components/button' },
              { text: 'Иконки и конфигурация', link: '/components/icon' },
              { text: 'Поле формы', link: '/components/field' },
              { text: 'Текстовое поле', link: '/components/input' },
              { text: 'Многострочное поле', link: '/components/textarea' },
            ],
          },
        ],
      },
    },
    en: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        nav: [{ text: 'Get started', link: '/en/guide' }],
        sidebar: [
          {
            text: 'Foundation',
            items: [
              { text: 'Getting started', link: '/en/guide' },
              { text: 'Theming', link: '/en/theming' },
            ],
          },
          {
            text: 'Components',
            items: [
              { text: 'Button', link: '/en/components/button' },
              { text: 'Icons and configuration', link: '/en/components/icon' },
              { text: 'Field', link: '/en/components/field' },
              { text: 'Input', link: '/en/components/input' },
              { text: 'Textarea', link: '/en/components/textarea' },
            ],
          },
        ],
      },
    },
  },
  themeConfig: { search: { provider: 'local' } },
});
