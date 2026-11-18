export interface HomeAction {
  readonly text: string;
  readonly link: string;
  readonly primary: boolean;
}

export interface HomeContent {
  readonly title: string;
  readonly tagline: string;
  readonly actions: readonly HomeAction[];
  readonly install: string;
  readonly screen: string;
}

const SCREEN_EXAMPLE = 'home/Cards';

const ru: HomeContent = {
  title: 'UI-кит для Vue 3',
  tagline:
    'Мы собираем на нём свои продукты: админку CMS, кабинеты, редакторы. Когда чего-то не хватало, мы это дописывали. Теперь он открыт.',
  actions: [
    { text: 'Начать', link: '/guide/getting-started', primary: true },
    { text: 'Компоненты', link: '/components/button', primary: false },
  ],
  install: 'pnpm add @numior/kit',
  screen: SCREEN_EXAMPLE,
};

const en: HomeContent = {
  title: 'A UI kit for Vue 3',
  tagline:
    'We build our own products on it: the CMS admin, back offices, editors. When something was missing, we added it. Now it is open.',
  actions: [
    { text: 'Get started', link: '/en/guide/getting-started', primary: true },
    { text: 'Components', link: '/en/components/button', primary: false },
  ],
  install: 'pnpm add @numior/kit',
  screen: SCREEN_EXAMPLE,
};

export const homeOf = (localeIndex: string): HomeContent => (localeIndex === 'en' ? en : ru);
