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
              { text: 'Чекбокс', link: '/components/checkbox' },
              { text: 'Радиогруппа', link: '/components/radio-group' },
              { text: 'Переключатель', link: '/components/switch' },
              { text: 'Выбор из списка', link: '/components/select' },
              { text: 'Комбобокс', link: '/components/combobox' },
            ],
          },
          {
            text: 'Слои',
            items: [
              { text: 'Диалог', link: '/components/dialog' },
              { text: 'Выдвижная панель', link: '/components/drawer' },
              { text: 'Поповер', link: '/components/popover' },
              { text: 'Подсказка', link: '/components/tooltip' },
            ],
          },
          {
            text: 'Обратная связь',
            items: [
              { text: 'Уведомления', link: '/components/toast' },
              { text: 'Алерт', link: '/components/alert' },
              { text: 'Прогресс', link: '/components/progress' },
              { text: 'Скелетон', link: '/components/skeleton' },
            ],
          },
          {
            text: 'Навигация',
            items: [
              { text: 'Ссылка', link: '/components/link' },
              { text: 'Меню', link: '/components/menu' },
              { text: 'Вкладки', link: '/components/tabs' },
              { text: 'Хлебные крошки', link: '/components/breadcrumbs' },
              { text: 'Пагинация', link: '/components/pagination' },
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
              { text: 'Checkbox', link: '/en/components/checkbox' },
              { text: 'Radio group', link: '/en/components/radio-group' },
              { text: 'Switch', link: '/en/components/switch' },
              { text: 'Select', link: '/en/components/select' },
              { text: 'Combobox', link: '/en/components/combobox' },
            ],
          },
          {
            text: 'Layers',
            items: [
              { text: 'Dialog', link: '/en/components/dialog' },
              { text: 'Drawer', link: '/en/components/drawer' },
              { text: 'Popover', link: '/en/components/popover' },
              { text: 'Tooltip', link: '/en/components/tooltip' },
            ],
          },
          {
            text: 'Feedback',
            items: [
              { text: 'Toast', link: '/en/components/toast' },
              { text: 'Alert', link: '/en/components/alert' },
              { text: 'Progress', link: '/en/components/progress' },
              { text: 'Skeleton', link: '/en/components/skeleton' },
            ],
          },
          {
            text: 'Navigation',
            items: [
              { text: 'Link', link: '/en/components/link' },
              { text: 'Menu', link: '/en/components/menu' },
              { text: 'Tabs', link: '/en/components/tabs' },
              { text: 'Breadcrumbs', link: '/en/components/breadcrumbs' },
              { text: 'Pagination', link: '/en/components/pagination' },
            ],
          },
        ],
      },
    },
  },
  themeConfig: { search: { provider: 'local' } },
});
