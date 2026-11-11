import { absoluteUrl } from '../theme/site.ts';
import type { ExampleLocale } from '../examples/example.types.ts';
import type { DocsSite } from '../theme/theme.types.ts';
import type { LlmsCatalog, LlmsEntry } from './llms.types.ts';
import { fullPathOf, indexPathOf } from './paths.ts';

const NOTES = {
  ru: 'Каждая страница доступна в Markdown по своему адресу с окончанием `.md`.',
  en: 'Every page is available as Markdown at its address followed by `.md`.',
} as const;

const FULL_NOTES = {
  ru: 'Вся документация одним файлом',
  en: 'The whole documentation in one file',
} as const;

const OTHER_LOCALE_NOTES = {
  ru: 'English documentation',
  en: 'Документация на русском',
} as const;

const OPTIONAL = 'Optional';

const otherLocale = (locale: ExampleLocale): ExampleLocale => (locale === 'ru' ? 'en' : 'ru');

const addressOf = (site: DocsSite, path: string): string =>
  absoluteUrl(site, path) ?? `/${path.replace(/^\/+/u, '')}`;

const lineOf = (site: DocsSite, entry: LlmsEntry): string => {
  const link = `- [${entry.title}](${addressOf(site, entry.path)})`;

  return entry.description === '' ? link : `${link}: ${entry.description}`;
};

const sectionsOf = (site: DocsSite, entries: readonly LlmsEntry[]): string[] => {
  const sections = entries.reduce<Map<string, string[]>>((found, entry) => {
    const lines = found.get(entry.section) ?? [];

    lines.push(lineOf(site, entry));

    return found.set(entry.section, lines);
  }, new Map());

  return [...sections].flatMap(([title, lines]) => [`## ${title}`, '', ...lines, '']);
};

export const llmsIndex = (catalog: LlmsCatalog): string => {
  const { locale, site } = catalog;

  return [
    `# ${catalog.title}`,
    '',
    `> ${catalog.description}`,
    '',
    NOTES[locale],
    '',
    ...sectionsOf(site, catalog.entries),
    `## ${OPTIONAL}`,
    '',
    `- [${FULL_NOTES[locale]}](${addressOf(site, fullPathOf(locale))})`,
    `- [${OTHER_LOCALE_NOTES[locale]}](${addressOf(site, indexPathOf(otherLocale(locale)))})`,
    '',
  ].join('\n');
};

export const llmsFull = (catalog: LlmsCatalog): string =>
  [
    `# ${catalog.title}`,
    '',
    `> ${catalog.description}`,
    '',
    ...catalog.entries.flatMap((entry) => ['---', '', entry.twin]),
  ].join('\n');
