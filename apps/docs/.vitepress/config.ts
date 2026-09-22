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
        ],
      },
    },
  },
  themeConfig: { search: { provider: 'local' } },
});
