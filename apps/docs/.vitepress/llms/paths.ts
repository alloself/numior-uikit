import type { ExampleLocale } from '../examples/example.types.ts';
import { EXAMPLE_LOCALES } from '../examples/modules.ts';
import { navigationPages } from '../navigation.ts';

const INDEX_PATHS = { ru: 'llms-ru.txt', en: 'llms.txt' } as const;
const FULL_PATHS = { ru: 'llms-full-ru.txt', en: 'llms-full.txt' } as const;
const TWIN_EXTENSION = '.md';

export const indexPathOf = (locale: ExampleLocale): string => INDEX_PATHS[locale];

export const fullPathOf = (locale: ExampleLocale): string => FULL_PATHS[locale];

export const twinPathOf = (link: string): string => `${link.replace(/^\/+/u, '')}${TWIN_EXTENSION}`;

export const twinPaths = (): Set<string> =>
  new Set(
    EXAMPLE_LOCALES.flatMap((locale) =>
      navigationPages(locale).map((page) => twinPathOf(page.link)),
    ),
  );

export const llmsPaths = (): string[] => [
  ...EXAMPLE_LOCALES.flatMap((locale) => [indexPathOf(locale), fullPathOf(locale)]),
  ...twinPaths(),
];
