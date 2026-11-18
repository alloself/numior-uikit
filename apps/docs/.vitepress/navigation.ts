import type { ExampleLocale } from './examples/example.types.ts';
import type {
  DocsNavItem,
  DocsSidebarGroup,
  DocsSidebarSections,
  NavEntry,
  NavGroup,
  NavSection,
  NavTitle,
} from './theme/theme.types.ts';

const GUIDE: readonly NavGroup[] = [
  {
    title: { ru: 'Руководство', en: 'Guide' },
    pages: [
      { link: '/guide/getting-started', title: { ru: 'Начало работы', en: 'Getting started' } },
      { link: '/guide/configuration', title: { ru: 'Конфигурация', en: 'Configuration' } },
      { link: '/guide/theming', title: { ru: 'Темы оформления', en: 'Theming' } },
      { link: '/guide/custom-theme', title: { ru: 'Своя тема', en: 'Custom theme' } },
      { link: '/guide/localization', title: { ru: 'Локализация', en: 'Localization' } },
      { link: '/guide/direction', title: 'RTL' },
      { link: '/guide/ssr', title: { ru: 'SSR и Nuxt', en: 'SSR and Nuxt' } },
      { link: '/guide/tailwind', title: 'Tailwind' },
      { link: '/guide/forms-validation', title: { ru: 'Валидация форм', en: 'Forms validation' } },
      { link: '/guide/accessibility', title: { ru: 'Доступность', en: 'Accessibility' } },
      { link: '/guide/typescript', title: 'TypeScript' },
      { link: '/guide/ai', title: { ru: 'ИИ-ассистенты', en: 'AI assistants' } },
    ],
  },
  {
    title: { ru: 'О проекте', en: 'About' },
    pages: [
      { link: '/guide/why', title: { ru: 'Почему Numior', en: 'Why Numior' } },
      { link: '/guide/faq', title: { ru: 'Вопросы и ответы', en: 'FAQ' } },
      { link: '/guide/browsers', title: { ru: 'Браузеры', en: 'Browser support' } },
    ],
  },
];

const COMPOSABLES: readonly NavGroup[] = [
  {
    title: { ru: 'Тема и окружение', en: 'Theme and environment' },
    pages: [
      { link: '/composables/color-scheme', title: 'useColorScheme' },
      { link: '/composables/direction', title: 'useDirection' },
      { link: '/composables/locale', title: 'useLocale' },
      { link: '/composables/messages', title: 'useMessages' },
      { link: '/composables/media-query', title: 'useMediaQuery' },
    ],
  },
  {
    title: { ru: 'Взаимодействие', en: 'Interaction' },
    pages: [
      { link: '/composables/hotkey', title: 'useHotkey' },
      { link: '/composables/clipboard', title: 'useClipboard' },
      { link: '/composables/pointer-session', title: 'usePointerSession' },
      { link: '/composables/scroll-spy', title: 'useScrollSpy' },
      { link: '/composables/toast', title: 'useToast' },
    ],
  },
  {
    title: { ru: 'Списки', en: 'Lists' },
    pages: [
      { link: '/composables/list-navigation', title: 'useListNavigation' },
      { link: '/composables/virtual-list', title: 'useVirtualList' },
      { link: '/composables/reorder', title: 'useReorder' },
    ],
  },
  {
    title: { ru: 'Всплывающие окна', en: 'Overlays' },
    pages: [
      { link: '/composables/floating', title: 'useFloating' },
      { link: '/composables/popover', title: 'usePopover' },
      { link: '/composables/dialog', title: 'useDialog' },
    ],
  },
  {
    title: { ru: 'Поля и формы', en: 'Fields and forms' },
    pages: [
      { link: '/composables/field-control', title: 'useFieldControl' },
      { link: '/composables/form', title: 'useForm' },
      { link: '/composables/controls', title: 'useControls' },
      { link: '/composables/web-otp', title: 'useWebOtp' },
    ],
  },
  {
    title: { ru: 'Файлы', en: 'Files' },
    pages: [
      { link: '/composables/file-drop', title: 'useFileDrop' },
      { link: '/composables/upload-queue', title: 'useUploadQueue' },
    ],
  },
  {
    title: { ru: 'Разное', en: 'Miscellaneous' },
    pages: [
      { link: '/composables/layout', title: 'useLayout' },
      { link: '/composables/icon', title: 'useIcon' },
      { link: '/composables/block-size-tween', title: 'useBlockSizeTween' },
    ],
  },
];

const COMPONENTS: readonly NavGroup[] = [
  {
    title: { ru: 'Базовые', en: 'General' },
    pages: [
      { link: '/components/button', title: 'Button' },
      { link: '/components/icon', title: 'Icon' },
      { link: '/components/kbd', title: 'Kbd' },
      { link: '/components/separator', title: 'Separator' },
      { link: '/components/code', title: 'Code' },
    ],
  },
  {
    title: { ru: 'Поля ввода', en: 'Inputs' },
    pages: [
      { link: '/components/field', title: 'Field' },
      { link: '/components/input', title: 'Input' },
      { link: '/components/textarea', title: 'Textarea' },
      { link: '/components/number-field', title: 'Number field' },
      { link: '/components/otp-field', title: 'OTP field' },
      { link: '/components/checkbox', title: 'Checkbox' },
      { link: '/components/radio-group', title: 'Radio group' },
      { link: '/components/switch', title: 'Switch' },
      { link: '/components/toggle-group', title: 'Toggle group' },
      { link: '/components/select', title: 'Select' },
      { link: '/components/combobox', title: 'Combobox' },
      { link: '/components/upload', title: 'Upload' },
      { link: '/components/chip', title: 'Chip' },
    ],
  },
  {
    title: { ru: 'Формы', en: 'Forms' },
    pages: [
      { link: '/components/form', title: 'Form' },
      { link: '/components/smart-form', title: 'Smart form' },
    ],
  },
  {
    title: { ru: 'Всплывающие окна', en: 'Overlays' },
    pages: [
      { link: '/components/dialog', title: 'Dialog' },
      { link: '/components/drawer', title: 'Drawer' },
      { link: '/components/popover', title: 'Popover' },
      { link: '/components/tooltip', title: 'Tooltip' },
    ],
  },
  {
    title: { ru: 'Обратная связь', en: 'Feedback' },
    pages: [
      { link: '/components/toast', title: 'Toast' },
      { link: '/components/alert', title: 'Alert' },
      { link: '/components/progress', title: 'Progress' },
      { link: '/components/skeleton', title: 'Skeleton' },
    ],
  },
  {
    title: { ru: 'Навигация', en: 'Navigation' },
    pages: [
      { link: '/components/link', title: 'Link' },
      { link: '/components/menu', title: 'Menu' },
      { link: '/components/tabs', title: 'Tabs' },
      { link: '/components/breadcrumbs', title: 'Breadcrumbs' },
      { link: '/components/stepper', title: 'Stepper' },
      { link: '/components/layout', title: 'Layout' },
      { link: '/components/sidebar', title: 'Sidebar' },
      { link: '/components/splitter', title: 'Splitter' },
      { link: '/components/pagination', title: 'Pagination' },
      { link: '/components/command', title: 'Command' },
      { link: '/components/toc', title: 'Toc' },
    ],
  },
  {
    title: { ru: 'Содержимое', en: 'Content' },
    pages: [
      { link: '/components/badge', title: 'Badge' },
      { link: '/components/avatar', title: 'Avatar' },
      { link: '/components/card', title: 'Card' },
      { link: '/components/collapsible', title: 'Collapsible' },
      { link: '/components/accordion', title: 'Accordion' },
      { link: '/components/list', title: 'List' },
      { link: '/components/empty', title: 'Empty' },
      { link: '/components/tree', title: 'Tree' },
    ],
  },
  {
    title: { ru: 'Даты и время', en: 'Dates and time' },
    pages: [
      { link: '/components/time-field', title: 'Time field' },
      { link: '/components/calendar', title: 'Calendar' },
      { link: '/components/date-picker', title: 'Date picker' },
      { link: '/components/date-range-picker', title: 'Date range picker' },
    ],
  },
  {
    title: { ru: 'Таблицы и графики', en: 'Tables and charts' },
    pages: [
      { link: '/components/table/', title: { ru: 'Таблица', en: 'Table' } },
      { link: '/components/table/data', title: { ru: 'Данные', en: 'Data' } },
      { link: '/components/table/cells', title: { ru: 'Ячейки', en: 'Cells' } },
      { link: '/components/table/editing', title: { ru: 'Правка', en: 'Editing' } },
      {
        link: '/components/table/columns',
        title: { ru: 'Колонки и строки', en: 'Columns and rows' },
      },
      { link: '/components/spreadsheet', title: { ru: 'Книга', en: 'Spreadsheet' } },
      { link: '/components/charts', title: { ru: 'Графики', en: 'Charts' } },
    ],
  },
];

const EDITOR: readonly NavGroup[] = [
  {
    title: { ru: 'Редактор', en: 'Editor' },
    pages: [
      { link: '/editor/', title: { ru: 'Редактор', en: 'Editor' } },
      { link: '/editor/blocks', title: { ru: 'Блоки', en: 'Blocks' } },
      { link: '/editor/media', title: { ru: 'Файлы и ссылки', en: 'Files and links' } },
      { link: '/editor/content', title: { ru: 'Вывод документа', en: 'Rendering a document' } },
    ],
  },
  {
    title: { ru: 'Совместная работа', en: 'Collaboration' },
    pages: [
      { link: '/editor/collaboration', title: { ru: 'Совместная работа', en: 'Collaboration' } },
      { link: '/editor/server', title: { ru: 'Сервер', en: 'Server' } },
      { link: '/editor/comments', title: { ru: 'Комментарии', en: 'Comments' } },
      { link: '/editor/history', title: { ru: 'Версии', en: 'Versions' } },
      { link: '/editor/offline', title: { ru: 'Офлайн', en: 'Offline' } },
    ],
  },
];

const THEME: readonly NavGroup[] = [
  {
    title: { ru: 'Темы', en: 'Themes' },
    pages: [
      { link: '/theme/', title: { ru: 'Конструктор', en: 'Builder' } },
      { link: '/theme/tokens', title: { ru: 'Токены', en: 'Tokens' } },
    ],
  },
];

export const NAVIGATION: readonly NavSection[] = [
  {
    title: { ru: 'Документация', en: 'Docs' },
    prefixes: ['/guide/', '/composables/'],
    groups: [...GUIDE, ...COMPOSABLES],
  },
  {
    title: { ru: 'Компоненты', en: 'Components' },
    prefixes: ['/components/'],
    groups: COMPONENTS,
  },
  {
    title: { ru: 'Редактор', en: 'Editor' },
    prefixes: ['/editor/'],
    groups: EDITOR,
  },
  {
    title: { ru: 'Блоки', en: 'Blocks' },
    link: '/blocks/',
    prefixes: ['/blocks/'],
    groups: [],
  },
  {
    title: { ru: 'Темы', en: 'Themes' },
    prefixes: ['/theme/'],
    groups: THEME,
  },
];

const textOf = (title: NavTitle, locale: ExampleLocale): string =>
  typeof title === 'string' ? title : title[locale];

export const localized = (link: string, locale: ExampleLocale): string =>
  locale === 'ru' ? link : `/${locale}${link}`;

const groupsOf = (section: NavSection, locale: ExampleLocale): DocsSidebarGroup[] =>
  section.groups.map((group) => ({
    text: textOf(group.title, locale),
    items: group.pages.map((page) => ({
      text: textOf(page.title, locale),
      link: localized(page.link, locale),
    })),
  }));

export const navOf = (
  locale: ExampleLocale,
  sections: readonly NavSection[] = NAVIGATION,
): DocsNavItem[] =>
  sections.reduce<DocsNavItem[]>((items, section) => {
    const link = section.link ?? section.groups[0]?.pages[0]?.link;

    if (link !== undefined) {
      items.push({
        text: textOf(section.title, locale),
        link: localized(link, locale),
        sections: section.prefixes.map((prefix) => localized(prefix, locale)),
      });
    }
    return items;
  }, []);

export const sidebarOf = (
  locale: ExampleLocale,
  sections: readonly NavSection[] = NAVIGATION,
): DocsSidebarSections =>
  Object.fromEntries(
    sections.flatMap((section) =>
      section.prefixes.map((prefix) => [localized(prefix, locale), groupsOf(section, locale)]),
    ),
  );

export const navigationTexts = (
  locale: ExampleLocale,
  sections: readonly NavSection[] = NAVIGATION,
): string[] =>
  sections.flatMap((section) => [
    textOf(section.title, locale),
    ...section.groups.flatMap((group) => [
      textOf(group.title, locale),
      ...group.pages.map((page) => textOf(page.title, locale)),
    ]),
  ]);

const sectionPage = (section: NavSection, locale: ExampleLocale): NavEntry[] => {
  if (section.link === undefined) {
    return [];
  }

  const title = textOf(section.title, locale);

  return [{ link: localized(section.link, locale), title, group: title, section: title }];
};

export const navigationPages = (
  locale: ExampleLocale,
  sections: readonly NavSection[] = NAVIGATION,
): NavEntry[] =>
  sections.flatMap((section) => [
    ...sectionPage(section, locale),
    ...section.groups.flatMap((group) =>
      group.pages.map((page) => ({
        link: localized(page.link, locale),
        title: textOf(page.title, locale),
        group: textOf(group.title, locale),
        section: textOf(section.title, locale),
      })),
    ),
  ]);

export const navigationLinks = (sections: readonly NavSection[] = NAVIGATION): string[] =>
  sections.flatMap((section) =>
    section.groups.flatMap((group) => group.pages.map((page) => page.link)),
  );
