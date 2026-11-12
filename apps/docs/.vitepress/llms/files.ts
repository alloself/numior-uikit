import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { copyableSource } from '../examples/demo.ts';
import type { ExampleLocale } from '../examples/example.types.ts';
import { EXAMPLE_LOCALES, exampleSources } from '../examples/modules.ts';
import { descriptionOf } from '../meta.ts';
import { navigationPages } from '../navigation.ts';
import { en, ru } from '../theme/texts.ts';
import type { NavEntry } from '../theme/theme.types.ts';
import { llmsFull, llmsIndex } from './catalog.ts';
import type { LlmsCatalog, LlmsEntry, LlmsFile, LlmsSource, TwinFile } from './llms.types.ts';
import { fullPathOf, indexPathOf, twinPathOf } from './paths.ts';
import { pageTwin } from './twin.ts';

const TITLE = 'Numior UI';
const TEXTS = { ru, en } as const;

const exampleFilesOf = (
  examplesRoot: string,
  locale: ExampleLocale,
  name: string,
): TwinFile[] | undefined => {
  const sources = exampleSources(examplesRoot, `${locale}/${name}`);

  return sources === undefined
    ? undefined
    : [...sources.files, ...sources.data].map((file) => ({
        name: basename(file),
        source: copyableSource(readFileSync(file, 'utf8')),
      }));
};

const entryOf = (source: LlmsSource, locale: ExampleLocale, page: NavEntry): LlmsEntry[] => {
  const path = twinPathOf(page.link);
  const file = join(source.srcDir, path);

  if (!existsSync(file)) {
    return [];
  }
  const markdown = readFileSync(file, 'utf8');

  return [
    {
      ...page,
      path,
      description: descriptionOf(markdown, ''),
      twin: pageTwin(markdown, {
        locale,
        texts: TEXTS[locale],
        bundle: source.bundle,
        exampleOf: (name) => exampleFilesOf(source.examplesRoot, locale, name),
      }),
    },
  ];
};

export const llmsEntries = (source: LlmsSource, locale: ExampleLocale): LlmsEntry[] =>
  navigationPages(locale).flatMap((page) => entryOf(source, locale, page));

export const llmsTwin = (source: LlmsSource, path: string): string | undefined =>
  EXAMPLE_LOCALES.reduce<string | undefined>((found, locale) => {
    if (found !== undefined) {
      return found;
    }
    const page = navigationPages(locale).find((candidate) => twinPathOf(candidate.link) === path);

    return page === undefined ? undefined : entryOf(source, locale, page)[0]?.twin;
  }, undefined);

const catalogOf = (source: LlmsSource, locale: ExampleLocale): LlmsCatalog => ({
  locale,
  title: TITLE,
  description: TEXTS[locale].description,
  site: source.site,
  entries: llmsEntries(source, locale),
});

export const llmsCatalogFile = (source: LlmsSource, path: string): string | undefined =>
  EXAMPLE_LOCALES.reduce<string | undefined>((found, locale) => {
    if (found !== undefined) {
      return found;
    }
    if (path === indexPathOf(locale)) {
      return llmsIndex(catalogOf(source, locale));
    }
    return path === fullPathOf(locale) ? llmsFull(catalogOf(source, locale)) : undefined;
  }, undefined);

export const llmsFiles = (source: LlmsSource): LlmsFile[] =>
  EXAMPLE_LOCALES.flatMap((locale) => {
    const catalog = catalogOf(source, locale);

    return [
      { path: indexPathOf(locale), content: llmsIndex(catalog) },
      { path: fullPathOf(locale), content: llmsFull(catalog) },
      ...catalog.entries.map((entry) => ({ path: entry.path, content: entry.twin })),
    ];
  });

export const writeLlms = (outDir: string, source: LlmsSource): void => {
  for (const file of llmsFiles(source)) {
    const target = join(outDir, file.path);

    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.content);
  }
};
