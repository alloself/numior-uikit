export interface HomeAction {
  readonly text: string;
  readonly link: string;
  readonly primary: boolean;
}

export interface HomeFact {
  readonly title: string;
  readonly details: string;
}

export interface HomeContent {
  readonly title: string;
  readonly tagline: string;
  readonly actions: readonly HomeAction[];
  readonly install: string;
  readonly componentsSection: string;
  readonly componentsFact: string;
  readonly facts: readonly HomeFact[];
}

const ru: HomeContent = {
  title: 'UI-кит для Vue 3',
  tagline:
    'Формы, таблицы, календари и каркас приложения на одних дизайн-токенах. SSR, клавиатура, RTL и тёмная тема — в каждом компоненте.',
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
        'Направление текста и схема — светлая, тёмная, системная — приходят из конфигурации.',
    },
    {
      title: 'Tailwind по желанию',
      details: 'Стили подключаются файлами компонентов; пресет Tailwind читает те же токены.',
    },
  ],
};

const en: HomeContent = {
  title: 'A UI kit for Vue 3',
  tagline:
    'Forms, tables, calendars and an app shell on one set of design tokens. SSR, keyboard, RTL and a dark theme in every component.',
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
};

export const homeOf = (localeIndex: string): HomeContent => (localeIndex === 'en' ? en : ru);
