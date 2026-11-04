import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiLayout: {
    props: {
      id: {
        ru: 'Основа `id` боковой панели и области содержимого. Без неё создаётся автоматически.',
        en: 'Base of the sidebar and content area `id`. Generated when omitted.',
      },
      header: {
        ru: 'Где верхняя панель: `inset` — рядом с боковой, `full` — на всю ширину над ней.',
        en: 'Where the top bar goes: `inset` beside the sidebar, `full` across the full width above it.',
      },
      sidebarWidth: {
        ru: 'Ширина раскрытой боковой панели, например `16rem`.',
        en: 'Width of the expanded sidebar, such as `16rem`.',
      },
      railWidth: {
        ru: 'Ширина свёрнутой боковой панели, где видны только иконки.',
        en: 'Width of the collapsed sidebar that shows only icons.',
      },
      endWidth: {
        ru: 'Ширина колонки из слота `end`.',
        en: 'Width of the column from the `end` slot.',
      },
      mobileQuery: {
        ru: 'Медиазапрос, при котором боковая панель открывается поверх страницы, например `(max-width: 48rem)`.',
        en: 'Media query at which the sidebar opens over the page, such as `(max-width: 48rem)`.',
      },
      shortcut: {
        ru: 'Включает сочетание Ctrl+B (⌘B на Mac), которое сворачивает и раскрывает боковую панель.',
        en: 'Turns on Ctrl+B (⌘B on Mac), which collapses and expands the sidebar.',
      },
      sticky: {
        ru: 'Закрепляет колонки на высоту окна. Каждая прокручивается отдельно.',
        en: 'Pins the columns to the window height. Each one scrolls on its own.',
      },
      contentAs: {
        ru: 'Тег области содержимого. По умолчанию — `main`.',
        en: 'Tag of the content area. Defaults to `main`.',
      },
      skipLink: {
        ru: 'Добавляет первой на странице ссылку «К содержимому» для перехода с клавиатуры.',
        en: 'Adds a "Skip to content" link first on the page for keyboard users.',
      },
      skipLabel: {
        ru: 'Текст ссылки для перехода к содержимому. По умолчанию — «К содержимому» из словаря.',
        en: 'Text of the skip link. Defaults to "Skip to content" from the dictionary.',
      },
    },
    models: {
      'v-model:open': {
        ru: 'Раскрыта ли боковая панель на широком экране.',
        en: 'Whether the sidebar is expanded on a wide screen.',
      },
      'v-model:mobileOpen': {
        ru: 'Открыта ли боковая панель на узком экране.',
        en: 'Whether the sidebar is open on a narrow screen.',
      },
    },
    slots: {
      sidebar: { ru: 'Боковая панель `NuiSidebar`.', en: 'The `NuiSidebar` sidebar.' },
      header: { ru: 'Верхняя панель `NuiAppBar`.', en: 'The `NuiAppBar` top bar.' },
      default: { ru: 'Содержимое страницы.', en: 'Page content.' },
      end: {
        ru: 'Колонка после содержимого, например оглавление.',
        en: 'Column after the content, such as a table of contents.',
      },
    },
    keyboard: [
      {
        keys: 'Ctrl+B',
        description: {
          ru: 'Сворачивает и раскрывает боковую панель. На Mac — ⌘B.',
          en: 'Collapses and expands the sidebar. ⌘B on Mac.',
        },
      },
    ],
  },
  NuiAppBar: {
    props: {
      sticky: {
        ru: 'Закрепляет панель у верхнего края окна при прокрутке.',
        en: 'Keeps the bar at the top of the window while scrolling.',
      },
    },
    slots: {
      start: {
        ru: 'Начало панели: кнопка боковой панели и логотип.',
        en: 'Start of the bar: the sidebar button and the logo.',
      },
      default: { ru: 'Середина панели, например поиск.', en: 'Middle of the bar, such as search.' },
      end: {
        ru: 'Конец панели: кнопки действий и профиль.',
        en: 'End of the bar: action buttons and the profile.',
      },
    },
  },
};

export default docs;
