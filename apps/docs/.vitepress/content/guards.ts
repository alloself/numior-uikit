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
import { exampleGuards, misplacedExports, vocabularyOf } from './example-guards.ts';
import {
  GuardRule,
  type ExampleContext,
  type GuardBaseline,
  type GuardProblem,
  type GuardVerdict,
} from './guard.types.ts';
import { navigationTexts } from '../navigation.ts';
import { installGuards } from './install-guards.ts';
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

const RULES: ReadonlySet<string> = new Set(Object.values(GuardRule));
const API_DIR = 'api';
const NAVIGATION_FILE = '.vitepress/navigation.ts';
const TEXTS_FILE = '.vitepress/theme/texts.ts';
const HOME_FILE = '.vitepress/theme/home-content.ts';
const VUE_INDEX = 'packages/vue/src/index.ts';

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isRule = (value: string): value is GuardRule => RULES.has(value);

const isFileList = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

export const parseBaseline = (json: string): GuardBaseline => {
  const parsed: unknown = JSON.parse(json);

  if (!isRecord(parsed)) {
    throw new TypeError('The guard baseline must be an object of rule → files');
  }
  return Object.entries(parsed).reduce<Partial<Record<GuardRule, readonly string[]>>>(
    (baseline, [rule, files]) => {
      if (!isRule(rule) || !isFileList(files)) {
        throw new TypeError(`Unknown guard rule or malformed file list: ${rule}`);
      }
      baseline[rule] = files;
      return baseline;
    },
    {},
  );
};

const keyOf = (rule: string, file: string): string => `${rule}: ${file}`;

export const settle = (
  problems: readonly GuardProblem[],
  baseline: GuardBaseline,
): GuardVerdict => {
  const excused = new Set(
    Object.entries(baseline).flatMap(([rule, files]) => files.map((file) => keyOf(rule, file))),
  );

  const found = new Set(problems.map((problem) => keyOf(problem.rule, problem.file)));

  return {
    fresh: problems.filter((problem) => !excused.has(keyOf(problem.rule, problem.file))),
    stale: [...excused].filter((key) => !found.has(key)).toSorted(),
  };
};

export const baselineOf = (problems: readonly GuardProblem[]): GuardBaseline =>
  Object.values(GuardRule).reduce<Partial<Record<GuardRule, readonly string[]>>>(
    (baseline, rule) => {
      const files = problems.reduce<Set<string>>(
        (found, problem) => (problem.rule === rule ? found.add(problem.file) : found),
        new Set(),
      );

      if (files.size > 0) {
        baseline[rule] = [...files].toSorted();
      }
      return baseline;
    },
    {},
  );

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

const contextOf = (docsRoot: string, repoRoot: string, locale: ExampleLocale): ExampleContext => ({
  vocabulary: vocabularyOf(
    walk(join(docsRoot, 'demo', locale), new Set()).map((file) => readFileSync(file, 'utf8')),
    locale,
  ),
  misplaced: misplacedExports(readFileSync(join(repoRoot, VUE_INDEX), 'utf8')),
});

const examplesGuards = (docsRoot: string, repoRoot: string): GuardProblem[] =>
  LOCALES.flatMap((locale) => {
    const context = contextOf(docsRoot, repoRoot, locale);

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

export const collectGuardProblems = async (
  docsRoot: string,
  repoRoot: string,
): Promise<GuardProblem[]> => {
  const pages = pagesOf(docsRoot);

  return [
    ...Object.entries(pages).flatMap(([page, source]) => [
      ...pageGuards(page, source),
      ...installGuards(page, source),
    ]),
    ...openingGuards(pages),
    ...(await apiGuards(docsRoot)),
    ...(await themeGuards(docsRoot)),
    ...examplesGuards(docsRoot, repoRoot),
  ];
};
