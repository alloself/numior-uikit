export interface HomeAction {
  readonly text: string;
  readonly link: string;
  readonly primary: boolean;
}

export interface HomeFeature {
  readonly title: string;
  readonly details: string;
}

export interface HomeContent {
  readonly eyebrow: string;
  readonly title: string;
  readonly tagline: string;
  readonly actions: readonly HomeAction[];
  readonly features: readonly HomeFeature[];
}

const ru: HomeContent = {
  eyebrow: 'Numior UI',
  title: 'Основание собственного UI kit',
  tagline: 'Vue 3.5+, семантические темы и модульные пакеты. Закрытая разработка.',
  actions: [
    { text: 'Начать разработку', link: '/guide/getting-started', primary: true },
    { text: 'Темизация', link: '/guide/theming', primary: false },
  ],
  features: [
    {
      title: 'Общие токены',
      details: 'Light, dark, system и семантические акценты для компонентов и утилит.',
    },
    { title: 'Опциональный Tailwind', details: 'Базовые компоненты работают на автономном CSS.' },
    {
      title: 'Проверяемое основание',
      details: 'Типы, линтеры, анализ зависимостей и браузерные сценарии.',
    },
  ],
};

const en: HomeContent = {
  eyebrow: 'Numior UI',
  title: 'The foundation of an independent UI kit',
  tagline: 'Vue 3.5+, semantic themes and modular packages. Closed development.',
  actions: [
    { text: 'Start developing', link: '/en/guide/getting-started', primary: true },
    { text: 'Theming', link: '/en/guide/theming', primary: false },
  ],
  features: [
    {
      title: 'Shared tokens',
      details: 'Light, dark, system and semantic accents for components and utilities.',
    },
    { title: 'Optional Tailwind', details: 'Base components run on standalone CSS.' },
    {
      title: 'A verifiable foundation',
      details: 'Types, linters, dependency analysis and browser scenarios.',
    },
  ],
};

export const homeOf = (localeIndex: string): HomeContent => (localeIndex === 'en' ? en : ru);
