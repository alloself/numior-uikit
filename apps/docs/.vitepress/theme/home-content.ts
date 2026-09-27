import type { NuiOption, NuiToggleItem, NuiTone } from '@numior/vue';

export interface HomeAction {
  readonly text: string;
  readonly link: string;
  readonly primary: boolean;
}

export interface HomeFact {
  readonly title: string;
  readonly details: string;
}

export interface HomeTag {
  readonly text: string;
  readonly tone: NuiTone;
}

export interface HomeMosaic {
  readonly title: string;
  readonly description: string;
  readonly name: string;
  readonly namePlaceholder: string;
  readonly team: string;
  readonly teams: readonly NuiOption<string>[];
  readonly shared: string;
  readonly create: string;
  readonly cancel: string;
  readonly period: string;
  readonly periods: readonly NuiToggleItem[];
  readonly members: string;
  readonly people: readonly string[];
  readonly release: string;
  readonly releaseValue: number;
  readonly tags: readonly HomeTag[];
}

export interface HomeContent {
  readonly title: string;
  readonly tagline: string;
  readonly actions: readonly HomeAction[];
  readonly install: string;
  readonly componentsSection: string;
  readonly componentsFact: string;
  readonly facts: readonly HomeFact[];
  readonly mosaic: HomeMosaic;
}

const ru: HomeContent = {
  title: 'Компоненты Vue, которые уже собраны',
  tagline:
    'Формы, таблицы, календари и каркас приложения на одних токенах: SSR, клавиатура и тёмная тема без доработок.',
  actions: [
    { text: 'Начать', link: '/guide/getting-started', primary: true },
    { text: 'Компоненты', link: '/components/button', primary: false },
  ],
  install: 'pnpm add @numior/vue @numior/tokens',
  componentsSection: '/components/',
  componentsFact: 'компонентов с клавиатурой, SSR и браузерными тестами',
  facts: [
    {
      title: 'SSR',
      details: 'Одна разметка на сервере и в браузере, без расхождений при гидрации.',
    },
    {
      title: 'RTL и три схемы',
      details:
        'Направление письма и схема — светлая, тёмная, системная — приходят из конфигурации.',
    },
    {
      title: 'Tailwind по желанию',
      details: 'Стили подключаются файлами компонентов; пресет Tailwind читает те же токены.',
    },
  ],
  mosaic: {
    title: 'Новый проект',
    description: 'Название, команда и доступ.',
    name: 'Название',
    namePlaceholder: 'Каталог 2026',
    team: 'Команда',
    teams: [
      { value: 'design', label: 'Дизайн' },
      { value: 'web', label: 'Веб' },
      { value: 'mobile', label: 'Мобильные' },
    ],
    shared: 'Виден всей компании',
    create: 'Создать',
    cancel: 'Отмена',
    period: 'Период',
    periods: [
      { value: 'week', label: 'Неделя' },
      { value: 'month', label: 'Месяц' },
      { value: 'year', label: 'Год' },
    ],
    members: 'Участники',
    people: ['Анна Титова', 'Игорь Белов', 'Мария Ким', 'Олег Смирнов'],
    release: 'Готовность релиза',
    releaseValue: 72,
    tags: [
      { text: 'Vue 3.5', tone: 'primary' },
      { text: 'SSR', tone: 'success' },
      { text: 'RTL', tone: 'info' },
      { text: 'Тёмная тема', tone: 'neutral' },
    ],
  },
};

const en: HomeContent = {
  title: 'Vue components that are already assembled',
  tagline:
    'Forms, tables, calendars and an app shell on shared tokens: SSR, keyboard and dark theme with nothing to patch.',
  actions: [
    { text: 'Get started', link: '/en/guide/getting-started', primary: true },
    { text: 'Components', link: '/en/components/button', primary: false },
  ],
  install: 'pnpm add @numior/vue @numior/tokens',
  componentsSection: '/en/components/',
  componentsFact: 'components with keyboard support, SSR and browser tests',
  facts: [
    {
      title: 'SSR',
      details: 'The same markup on the server and in the browser, no hydration mismatches.',
    },
    {
      title: 'RTL and three schemes',
      details:
        'The reading direction and the scheme — light, dark, system — come from the configuration.',
    },
    {
      title: 'Tailwind if you want it',
      details: 'Styles ship as component files; the Tailwind preset reads the same tokens.',
    },
  ],
  mosaic: {
    title: 'New project',
    description: 'Name, team and access.',
    name: 'Name',
    namePlaceholder: 'Catalogue 2026',
    team: 'Team',
    teams: [
      { value: 'design', label: 'Design' },
      { value: 'web', label: 'Web' },
      { value: 'mobile', label: 'Mobile' },
    ],
    shared: 'Visible to the whole company',
    create: 'Create',
    cancel: 'Cancel',
    period: 'Period',
    periods: [
      { value: 'week', label: 'Week' },
      { value: 'month', label: 'Month' },
      { value: 'year', label: 'Year' },
    ],
    members: 'Members',
    people: ['Anna Titova', 'Igor Belov', 'Maria Kim', 'Oleg Smirnov'],
    release: 'Release readiness',
    releaseValue: 72,
    tags: [
      { text: 'Vue 3.5', tone: 'primary' },
      { text: 'SSR', tone: 'success' },
      { text: 'RTL', tone: 'info' },
      { text: 'Dark theme', tone: 'neutral' },
    ],
  },
};

export const homeOf = (localeIndex: string): HomeContent => (localeIndex === 'en' ? en : ru);
