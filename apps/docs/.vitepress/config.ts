import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHighlighter } from 'shiki';
import tailwindcss from '@tailwindcss/vite';
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
      { text: 'Конфигурация', link: '/guide/configuration' },
      { text: 'Темизация', link: '/guide/theming' },
      { text: 'Локализация', link: '/guide/localization' },
      { text: 'Направление письма', link: '/guide/direction' },
      { text: 'SSR и Nuxt', link: '/guide/ssr' },
      { text: 'Tailwind', link: '/guide/tailwind' },
      { text: 'Валидация форм', link: '/guide/forms-validation' },
      { text: 'Доступность', link: '/guide/accessibility' },
    ],
  },
];

const ruComponents: DocsSidebarGroup[] = [
  {
    text: 'Общие',
    items: [
      { text: 'Button', link: '/components/button' },
      { text: 'Icon', link: '/components/icon' },
      { text: 'Kbd', link: '/components/kbd' },
      { text: 'Separator', link: '/components/separator' },
      { text: 'Code', link: '/components/code' },
    ],
  },
  {
    text: 'Поля ввода',
    items: [
      { text: 'Field', link: '/components/field' },
      { text: 'Input', link: '/components/input' },
      { text: 'Textarea', link: '/components/textarea' },
      { text: 'Number field', link: '/components/number-field' },
      { text: 'OTP field', link: '/components/otp-field' },
      { text: 'Checkbox', link: '/components/checkbox' },
      { text: 'Radio group', link: '/components/radio-group' },
      { text: 'Switch', link: '/components/switch' },
      { text: 'Toggle group', link: '/components/toggle-group' },
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
      { text: 'Splitter', link: '/components/splitter' },
      { text: 'Pagination', link: '/components/pagination' },
      { text: 'Command', link: '/components/command' },
      { text: 'Toc', link: '/components/toc' },
    ],
  },
  {
    text: 'Данные',
    items: [
      { text: 'Badge', link: '/components/badge' },
      { text: 'Avatar', link: '/components/avatar' },
      { text: 'Card', link: '/components/card' },
      { text: 'Collapsible', link: '/components/collapsible' },
      { text: 'Accordion', link: '/components/accordion' },
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

const ruComposables: DocsSidebarGroup[] = [
  {
    text: 'Тема и среда',
    items: [
      { text: 'useColorScheme', link: '/composables/color-scheme' },
      { text: 'useDirection', link: '/composables/direction' },
      { text: 'useLocale', link: '/composables/locale' },
      { text: 'useMessages', link: '/composables/messages' },
      { text: 'useMediaQuery', link: '/composables/media-query' },
    ],
  },
  {
    text: 'Взаимодействие',
    items: [
      { text: 'useHotkey', link: '/composables/hotkey' },
      { text: 'useClipboard', link: '/composables/clipboard' },
      { text: 'useScrollSpy', link: '/composables/scroll-spy' },
      { text: 'useToast', link: '/composables/toast' },
    ],
  },
  {
    text: 'Списки',
    items: [
      { text: 'useListNavigation', link: '/composables/list-navigation' },
      { text: 'useVirtualList', link: '/composables/virtual-list' },
      { text: 'useReorder', link: '/composables/reorder' },
    ],
  },
  {
    text: 'Слои',
    items: [
      { text: 'useFloating', link: '/composables/floating' },
      { text: 'usePopover', link: '/composables/popover' },
      { text: 'useDialog', link: '/composables/dialog' },
    ],
  },
  {
    text: 'Поля и формы',
    items: [
      { text: 'useFieldControl', link: '/composables/field-control' },
      { text: 'useForm', link: '/composables/form' },
      { text: 'useControls', link: '/composables/controls' },
      { text: 'useWebOtp', link: '/composables/web-otp' },
    ],
  },
  {
    text: 'Файлы',
    items: [
      { text: 'useFileDrop', link: '/composables/file-drop' },
      { text: 'useUploadQueue', link: '/composables/upload-queue' },
    ],
  },
  {
    text: 'Разное',
    items: [
      { text: 'useLayout', link: '/composables/layout' },
      { text: 'useIcons', link: '/composables/icon' },
      { text: 'useBlockSizeTween', link: '/composables/block-size-tween' },
    ],
  },
];

const ruSidebar: DocsSidebarSections = {
  '/guide/': ruGuide,
  '/composables/': ruComposables,
  '/components/': ruComponents,
};

const enGuide: DocsSidebarGroup[] = [
  {
    text: 'Guide',
    items: [
      { text: 'Getting started', link: '/en/guide/getting-started' },
      { text: 'Configuration', link: '/en/guide/configuration' },
      { text: 'Theming', link: '/en/guide/theming' },
      { text: 'Localization', link: '/en/guide/localization' },
      { text: 'Direction', link: '/en/guide/direction' },
      { text: 'SSR and Nuxt', link: '/en/guide/ssr' },
      { text: 'Tailwind', link: '/en/guide/tailwind' },
      { text: 'Forms validation', link: '/en/guide/forms-validation' },
      { text: 'Accessibility', link: '/en/guide/accessibility' },
    ],
  },
];

const enComponents: DocsSidebarGroup[] = [
  {
    text: 'General',
    items: [
      { text: 'Button', link: '/en/components/button' },
      { text: 'Icon', link: '/en/components/icon' },
      { text: 'Kbd', link: '/en/components/kbd' },
      { text: 'Separator', link: '/en/components/separator' },
      { text: 'Code', link: '/en/components/code' },
    ],
  },
  {
    text: 'Inputs',
    items: [
      { text: 'Field', link: '/en/components/field' },
      { text: 'Input', link: '/en/components/input' },
      { text: 'Textarea', link: '/en/components/textarea' },
      { text: 'Number field', link: '/en/components/number-field' },
      { text: 'OTP field', link: '/en/components/otp-field' },
      { text: 'Checkbox', link: '/en/components/checkbox' },
      { text: 'Radio group', link: '/en/components/radio-group' },
      { text: 'Switch', link: '/en/components/switch' },
      { text: 'Toggle group', link: '/en/components/toggle-group' },
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
      { text: 'Splitter', link: '/en/components/splitter' },
      { text: 'Pagination', link: '/en/components/pagination' },
      { text: 'Command', link: '/en/components/command' },
      { text: 'Toc', link: '/en/components/toc' },
    ],
  },
  {
    text: 'Data',
    items: [
      { text: 'Badge', link: '/en/components/badge' },
      { text: 'Avatar', link: '/en/components/avatar' },
      { text: 'Card', link: '/en/components/card' },
      { text: 'Collapsible', link: '/en/components/collapsible' },
      { text: 'Accordion', link: '/en/components/accordion' },
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

const enComposables: DocsSidebarGroup[] = [
  {
    text: 'Theme and environment',
    items: [
      { text: 'useColorScheme', link: '/en/composables/color-scheme' },
      { text: 'useDirection', link: '/en/composables/direction' },
      { text: 'useLocale', link: '/en/composables/locale' },
      { text: 'useMessages', link: '/en/composables/messages' },
      { text: 'useMediaQuery', link: '/en/composables/media-query' },
    ],
  },
  {
    text: 'Interaction',
    items: [
      { text: 'useHotkey', link: '/en/composables/hotkey' },
      { text: 'useClipboard', link: '/en/composables/clipboard' },
      { text: 'useScrollSpy', link: '/en/composables/scroll-spy' },
      { text: 'useToast', link: '/en/composables/toast' },
    ],
  },
  {
    text: 'Lists',
    items: [
      { text: 'useListNavigation', link: '/en/composables/list-navigation' },
      { text: 'useVirtualList', link: '/en/composables/virtual-list' },
      { text: 'useReorder', link: '/en/composables/reorder' },
    ],
  },
  {
    text: 'Layers',
    items: [
      { text: 'useFloating', link: '/en/composables/floating' },
      { text: 'usePopover', link: '/en/composables/popover' },
      { text: 'useDialog', link: '/en/composables/dialog' },
    ],
  },
  {
    text: 'Fields and forms',
    items: [
      { text: 'useFieldControl', link: '/en/composables/field-control' },
      { text: 'useForm', link: '/en/composables/form' },
      { text: 'useControls', link: '/en/composables/controls' },
      { text: 'useWebOtp', link: '/en/composables/web-otp' },
    ],
  },
  {
    text: 'Files',
    items: [
      { text: 'useFileDrop', link: '/en/composables/file-drop' },
      { text: 'useUploadQueue', link: '/en/composables/upload-queue' },
    ],
  },
  {
    text: 'Miscellaneous',
    items: [
      { text: 'useLayout', link: '/en/composables/layout' },
      { text: 'useIcons', link: '/en/composables/icon' },
      { text: 'useBlockSizeTween', link: '/en/composables/block-size-tween' },
    ],
  },
];

const enSidebar: DocsSidebarSections = {
  '/en/guide/': enGuide,
  '/en/composables/': enComposables,
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
      tailwindcss(),
      docsExamples(fileURLToPath(new URL('../examples', import.meta.url)), highlighter),
      docsReference(bundleFile, highlighter),
    ],
  },
  themeConfig: {
    nav: [],
    sidebar: {},
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
          { text: 'Композаблы', link: '/composables/color-scheme', section: '/composables/' },
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
          {
            text: 'Composables',
            link: '/en/composables/color-scheme',
            section: '/en/composables/',
          },
        ],
        sidebar: enSidebar,
        texts: en,
      },
    },
  },
});
