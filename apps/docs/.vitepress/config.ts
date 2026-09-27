import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHighlighter } from 'shiki';
import { defineConfigWithTheme } from 'vitepress';
import { colorSchemeScript } from '@numior/primitives';
import { CODE_LANGUAGES, docsMarkdown } from './markdown';
import { headingPermalink } from './markdown/anchors';
import { docsExamples } from './examples/plugin';
import { isEnglishPage } from './markdown/env';
import { parseBundle } from './reference/bundle';
import { docsReference } from './reference/plugin';
import { apiSearchText } from './reference/search-text';
import type { DocsSearchOptions } from './theme/theme.types';
import { en, ru } from './theme/texts';
import type { DocsSidebarGroup, DocsSidebarSections, DocsThemeConfig } from './theme/theme.types';

const bundleFile = fileURLToPath(new URL('../.reference/bundle.json', import.meta.url));
const bundle = existsSync(bundleFile) ? parseBundle(readFileSync(bundleFile, 'utf8')) : undefined;

const searchOptions: DocsSearchOptions = {
  _render: (source, env, md) =>
    md.render(
      bundle === undefined
        ? source
        : source + apiSearchText(bundle, source, isEnglishPage(env) ? 'en' : 'ru'),
      env,
    ),
};

const highlighter = await createHighlighter({
  themes: ['github-light'],
  langs: [...CODE_LANGUAGES],
});

const ruGuide: DocsSidebarGroup[] = [
  {
    text: 'Руководство',
    items: [
      { text: 'Начало работы', link: '/guide/getting-started' },
      { text: 'Темизация', link: '/guide/theming' },
      { text: 'Локализация', link: '/guide/localization' },
    ],
  },
];

const ruComponents: DocsSidebarGroup[] = [
  {
    text: 'Компоненты',
    items: [
      { text: 'Button', link: '/components/button' },
      { text: 'Icon', link: '/components/icon' },
      { text: 'Field', link: '/components/field' },
      { text: 'Input', link: '/components/input' },
      { text: 'Textarea', link: '/components/textarea' },
      { text: 'Number field', link: '/components/number-field' },
      { text: 'Checkbox', link: '/components/checkbox' },
      { text: 'Radio group', link: '/components/radio-group' },
      { text: 'Switch', link: '/components/switch' },
      { text: 'Select', link: '/components/select' },
      { text: 'Combobox', link: '/components/combobox' },
      { text: 'Upload', link: '/components/upload' },
      { text: 'Chip', link: '/components/chip' },
    ],
  },
  {
    text: 'Формы',
    items: [
      { text: 'Form', link: '/components/form' },
      { text: 'Smart form', link: '/components/smart-form' },
    ],
  },
  {
    text: 'Слои',
    items: [
      { text: 'Dialog', link: '/components/dialog' },
      { text: 'Drawer', link: '/components/drawer' },
      { text: 'Popover', link: '/components/popover' },
      { text: 'Tooltip', link: '/components/tooltip' },
    ],
  },
  {
    text: 'Обратная связь',
    items: [
      { text: 'Toast', link: '/components/toast' },
      { text: 'Alert', link: '/components/alert' },
      { text: 'Progress', link: '/components/progress' },
      { text: 'Skeleton', link: '/components/skeleton' },
    ],
  },
  {
    text: 'Навигация',
    items: [
      { text: 'Link', link: '/components/link' },
      { text: 'Menu', link: '/components/menu' },
      { text: 'Tabs', link: '/components/tabs' },
      { text: 'Breadcrumbs', link: '/components/breadcrumbs' },
      { text: 'Stepper', link: '/components/stepper' },
      { text: 'Layout', link: '/components/layout' },
      { text: 'Sidebar', link: '/components/sidebar' },
      { text: 'Pagination', link: '/components/pagination' },
    ],
  },
  {
    text: 'Данные',
    items: [
      { text: 'Badge', link: '/components/badge' },
      { text: 'Avatar', link: '/components/avatar' },
      { text: 'Card', link: '/components/card' },
      { text: 'List', link: '/components/list' },
      { text: 'Empty', link: '/components/empty' },
      { text: 'Tree', link: '/components/tree' },
      { text: 'Table', link: '/components/table' },
    ],
  },
  {
    text: 'Даты и время',
    items: [
      { text: 'Time field', link: '/components/time-field' },
      { text: 'Calendar', link: '/components/calendar' },
      { text: 'Date picker', link: '/components/date-picker' },
      { text: 'Date range picker', link: '/components/date-range-picker' },
    ],
  },
];

const ruSidebar: DocsSidebarSections = {
  '/guide/': ruGuide,
  '/components/': ruComponents,
};

const enGuide: DocsSidebarGroup[] = [
  {
    text: 'Guide',
    items: [
      { text: 'Getting started', link: '/en/guide/getting-started' },
      { text: 'Theming', link: '/en/guide/theming' },
      { text: 'Localization', link: '/en/guide/localization' },
    ],
  },
];

const enComponents: DocsSidebarGroup[] = [
  {
    text: 'Components',
    items: [
      { text: 'Button', link: '/en/components/button' },
      { text: 'Icon', link: '/en/components/icon' },
      { text: 'Field', link: '/en/components/field' },
      { text: 'Input', link: '/en/components/input' },
      { text: 'Textarea', link: '/en/components/textarea' },
      { text: 'Number field', link: '/en/components/number-field' },
      { text: 'Checkbox', link: '/en/components/checkbox' },
      { text: 'Radio group', link: '/en/components/radio-group' },
      { text: 'Switch', link: '/en/components/switch' },
      { text: 'Select', link: '/en/components/select' },
      { text: 'Combobox', link: '/en/components/combobox' },
      { text: 'Upload', link: '/en/components/upload' },
      { text: 'Chip', link: '/en/components/chip' },
    ],
  },
  {
    text: 'Forms',
    items: [
      { text: 'Form', link: '/en/components/form' },
      { text: 'Smart form', link: '/en/components/smart-form' },
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
      { text: 'Stepper', link: '/en/components/stepper' },
      { text: 'Layout', link: '/en/components/layout' },
      { text: 'Sidebar', link: '/en/components/sidebar' },
      { text: 'Pagination', link: '/en/components/pagination' },
    ],
  },
  {
    text: 'Data',
    items: [
      { text: 'Badge', link: '/en/components/badge' },
      { text: 'Avatar', link: '/en/components/avatar' },
      { text: 'Card', link: '/en/components/card' },
      { text: 'List', link: '/en/components/list' },
      { text: 'Empty', link: '/en/components/empty' },
      { text: 'Tree', link: '/en/components/tree' },
      { text: 'Table', link: '/en/components/table' },
    ],
  },
  {
    text: 'Dates and time',
    items: [
      { text: 'Time field', link: '/en/components/time-field' },
      { text: 'Calendar', link: '/en/components/calendar' },
      { text: 'Date picker', link: '/en/components/date-picker' },
      { text: 'Date range picker', link: '/en/components/date-range-picker' },
    ],
  },
];

const enSidebar: DocsSidebarSections = {
  '/en/guide/': enGuide,
  '/en/components/': enComponents,
};

export default defineConfigWithTheme<DocsThemeConfig>({
  title: 'Numior UI',
  description: 'Independent Vue 3.5+ UI kit — foundation in development.',
  cleanUrls: true,
  appearance: false,
  head: [['script', {}, colorSchemeScript('nui-theme')]],
  markdown: {
    headers: { level: [2, 3] },
    anchor: { permalink: headingPermalink },
    config: (md) => docsMarkdown(md, highlighter),
  },
  vite: {
    resolve: process.env.NODE_ENV === 'production' ? {} : { conditions: ['@numior/source'] },
    plugins: [
      docsExamples(fileURLToPath(new URL('../examples', import.meta.url)), highlighter),
      docsReference(bundleFile),
    ],
  },
  themeConfig: {
    nav: [],
    sidebar: [],
    texts: ru,
    search: { provider: 'local', options: searchOptions },
  },
  locales: {
    root: {
      label: 'Русский',
      lang: 'ru',
      description: 'Независимый UI kit для Vue 3.5+ — основание в разработке.',
      themeConfig: {
        nav: [
          { text: 'Руководство', link: '/guide/getting-started', section: '/guide/' },
          { text: 'Компоненты', link: '/components/button', section: '/components/' },
        ],
        sidebar: ruSidebar,
        texts: ru,
      },
    },
    en: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/en/guide/getting-started', section: '/en/guide/' },
          { text: 'Components', link: '/en/components/button', section: '/en/components/' },
        ],
        sidebar: enSidebar,
        texts: en,
      },
    },
  },
});
