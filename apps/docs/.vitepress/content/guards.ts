import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ExampleLocale } from '../examples/example.types.ts';
import type { DocsMap } from '../reference/reference.types.ts';
import {
  apiEntriesOf,
  catalogGuards,
  homeGuards,
  keyboardEntriesOf,
  tautologyGuards,
  textEntriesOf,
} from './catalog-guards.ts';
import { exampleGuards, vocabularyOf } from './example-guards.ts';
import type { ExampleContext, GuardProblem } from './guard.types.ts';
import { navigationTexts } from '../navigation.ts';
import { styleGuards } from './style-guards.ts';
import { kitCatalogGuards } from './kit-catalog-guards.ts';
import { catalogPackageGuards, packageGuards } from './package-guards.ts';
import { openingGuards, pageGuards } from './page-guards.ts';

const LOCALES: readonly ExampleLocale[] = ['ru', 'en'];

const PAGE_SKIPPED = new Set([
  'node_modules',
  '.reference',
  '.vitepress',
  'examples',
  'api',
  'demo',
]);

const API_DIR = 'api';
const NAVIGATION_FILE = '.vitepress/navigation.ts';
const TEXTS_FILE = '.vitepress/theme/texts.ts';
const HOME_FILE = '.vitepress/theme/home-content.ts';
const PACKAGES_DIR = 'packages';
const MESSAGES_SUFFIX = '.messages.ts';

const KIT_SKIPPED: ReadonlySet<string> = new Set([
  'node_modules',
  'dist',
  'test',
  'bench',
  'coverage',
]);

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const walk = (dir: string, skipped: ReadonlySet<string>): string[] =>
  existsSync(dir)
    ? readdirSync(dir)
        .toSorted()
        .flatMap((name) => {
          const path = join(dir, name);

          if (statSync(path).isDirectory()) {
            return skipped.has(name) ? [] : walk(path, skipped);
          }
          return [path];
        })
    : [];

const slashed = (path: string): string => path.split(sep).join('/');

const pagesOf = (docsRoot: string): Record<string, string> =>
  walk(docsRoot, PAGE_SKIPPED).reduce<Record<string, string>>((pages, file) => {
    if (file.endsWith('.md')) {
      pages[slashed(relative(docsRoot, file))] = readFileSync(file, 'utf8');
    }
    return pages;
  }, {});

const moduleOf = async (file: string): Promise<Readonly<Record<string, unknown>>> => {
  const loaded: unknown = await import(pathToFileURL(file).href);

  if (!isRecord(loaded)) {
    throw new TypeError(`${file} did not load as a module`);
  }
  return loaded;
};

const isDocsMap = (value: unknown): value is DocsMap => isRecord(value);

const apiGuards = async (docsRoot: string): Promise<GuardProblem[]> => {
  const files = walk(join(docsRoot, API_DIR), new Set()).filter(
    (file) => file.endsWith('.ts') && !file.endsWith('.types.ts'),
  );

  const perFile = await Promise.all(
    files.map(async (file) => {
      const docs = (await moduleOf(file)).default;
      const name = slashed(relative(docsRoot, file));

      if (!isDocsMap(docs)) {
        return [];
      }

      const entries = apiEntriesOf(name, docs);

      return [
        ...catalogGuards([...entries, ...keyboardEntriesOf(name, docs)], false),
        ...tautologyGuards(entries),
      ];
    }),
  );

  return perFile.flat();
};

const themeGuards = async (docsRoot: string): Promise<GuardProblem[]> => {
  const texts = await moduleOf(join(docsRoot, TEXTS_FILE));
  const { homeOf } = await moduleOf(join(docsRoot, HOME_FILE));

  const home =
    typeof homeOf === 'function'
      ? LOCALES.flatMap((locale) => textEntriesOf(HOME_FILE, locale, homeOf(locale)))
      : [];

  return [
    ...catalogGuards(
      LOCALES.flatMap((locale) => [
        ...textEntriesOf(TEXTS_FILE, locale, texts[locale]),
        ...textEntriesOf(NAVIGATION_FILE, locale, navigationTexts(locale)),
      ]),
      true,
    ),
    ...catalogGuards(home, true),
    ...homeGuards(home),
  ];
};

const contextOf = (docsRoot: string, locale: ExampleLocale): ExampleContext => ({
  vocabulary: vocabularyOf(
    walk(join(docsRoot, 'demo', locale), new Set()).map((file) => readFileSync(file, 'utf8')),
    locale,
  ),
});

const examplesGuards = (docsRoot: string): GuardProblem[] =>
  LOCALES.flatMap((locale) => {
    const context = contextOf(docsRoot, locale);

    return walk(join(docsRoot, 'examples', locale), new Set()).flatMap((file) =>
      file.endsWith('.vue')
        ? exampleGuards(
            slashed(relative(docsRoot, file)),
            locale,
            readFileSync(file, 'utf8'),
            context,
          )
        : [],
    );
  });

const SAMPLE_DIRS = ['examples', 'demo'];
const SAMPLE_FILE_RE = /\.(?:vue|ts)$/;

const sampleSources = (docsRoot: string): string[] =>
  SAMPLE_DIRS.flatMap((dir) =>
    walk(join(docsRoot, dir), new Set()).filter((file) => SAMPLE_FILE_RE.test(file)),
  );

const catalogFiles = (docsRoot: string): string[] => [
  ...walk(join(docsRoot, API_DIR), new Set()).filter((file) => file.endsWith('.ts')),
  ...[NAVIGATION_FILE, TEXTS_FILE, HOME_FILE].map((file) => join(docsRoot, file)),
];

const kitGuards = (repoRoot: string): GuardProblem[] =>
  walk(join(repoRoot, PACKAGES_DIR), KIT_SKIPPED).flatMap((file) =>
    file.endsWith(MESSAGES_SUFFIX)
      ? kitCatalogGuards(slashed(relative(repoRoot, file)), readFileSync(file, 'utf8'))
      : [],
  );

export const collectGuardProblems = async (
  docsRoot: string,
  repoRoot: string,
): Promise<GuardProblem[]> => {
  const pages = pagesOf(docsRoot);

  return [
    ...Object.entries(pages).flatMap(([page, source]) => [
      ...pageGuards(page, source),
      ...styleGuards(page, source),
      ...packageGuards(page, source),
    ]),
    ...sampleSources(docsRoot).flatMap((file) =>
      packageGuards(slashed(relative(docsRoot, file)), readFileSync(file, 'utf8')),
    ),
    ...catalogFiles(docsRoot).flatMap((file) =>
      catalogPackageGuards(slashed(relative(docsRoot, file)), readFileSync(file, 'utf8')),
    ),
    ...openingGuards(pages),
    ...(await apiGuards(docsRoot)),
    ...(await themeGuards(docsRoot)),
    ...examplesGuards(docsRoot),
    ...kitGuards(repoRoot),
  ];
};
