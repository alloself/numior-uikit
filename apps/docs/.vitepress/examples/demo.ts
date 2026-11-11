import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';
import type { Plugin } from 'vitepress';
import type { ExampleLocale } from './example.types.ts';

const DEMO_PREFIX = '#demo/';
const DEMO_DIR = 'demo';
const SHARED = 'shared';
const LOCAL_PREFIX = './';
const IMPORT_RE = /from\s+'#demo\/([\w-]+)'/g;
const LOCALE_RE = /\/(?:examples|demo)\/(ru|en)\//;

const isLocale = (value: string | undefined): value is ExampleLocale =>
  value === 'ru' || value === 'en';

export const demoRootOf = (examplesRoot: string): string => join(dirname(examplesRoot), DEMO_DIR);

export const demoLocaleOf = (importer: string): ExampleLocale | undefined => {
  const locale = LOCALE_RE.exec(importer.split(sep).join('/'))?.[1];

  return isLocale(locale) ? locale : undefined;
};

export const demoFileOf = (
  demoRoot: string,
  locale: ExampleLocale,
  name: string,
): string | undefined =>
  [join(demoRoot, locale, `${name}.ts`), join(demoRoot, SHARED, `${name}.ts`)].find((file) =>
    existsSync(file),
  );

export const demoNamesOf = (source: string): string[] =>
  [...source.matchAll(IMPORT_RE)].reduce<string[]>((names, [, name = '']) => {
    if (!names.includes(name)) {
      names.push(name);
    }
    return names;
  }, []);

const collect = (
  demoRoot: string,
  locale: ExampleLocale,
  file: string,
  found: string[],
): string[] => {
  for (const name of demoNamesOf(readFileSync(file, 'utf8'))) {
    const target = demoFileOf(demoRoot, locale, name);

    if (target === undefined) {
      throw new Error(`Unknown demo data: #demo/${name} in ${file}`);
    }
    if (!found.includes(target)) {
      found.push(target);
      collect(demoRoot, locale, target, found);
    }
  }
  return found;
};

export const demoFilesOf = (
  demoRoot: string,
  locale: ExampleLocale,
  files: readonly string[],
): string[] => files.reduce<string[]>((found, file) => collect(demoRoot, locale, file, found), []);

export const copyableSource = (source: string): string =>
  source.replaceAll(`'${DEMO_PREFIX}`, `'${LOCAL_PREFIX}`);

export const resolveDemo = (
  demoRoot: string,
  source: string,
  importer: string | undefined,
): string | undefined => {
  if (!source.startsWith(DEMO_PREFIX)) {
    return undefined;
  }

  const locale = demoLocaleOf(importer ?? '');

  if (locale === undefined) {
    throw new Error(`${source} is imported outside a localized example: ${importer}`);
  }

  const file = demoFileOf(demoRoot, locale, source.slice(DEMO_PREFIX.length));

  if (file === undefined) {
    throw new Error(`Unknown demo data: ${source} in ${importer}`);
  }
  return file;
};

export const docsDemo = (demoRoot: string): Plugin => ({
  name: 'nui-docs-demo',
  enforce: 'pre',
  resolveId: (source, importer) => resolveDemo(demoRoot, source, importer),
});
