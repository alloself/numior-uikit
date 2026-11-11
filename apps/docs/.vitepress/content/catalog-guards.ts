import type { ExampleLocale } from '../examples/example.types.ts';
import type { ComponentDocs, DocsMap, LocalizedText } from '../reference/reference.types.ts';
import { GuardRule, type ApiEntry, type CatalogEntry, type GuardProblem } from './guard.types.ts';
import { patternProblems, termProblems } from './page-guards.ts';
import { lintProse } from './prose-lint.ts';
import { EVALUATIVE, GLOSSARY, INSTEAD, INVENTORY, META } from './terms.ts';

const LOCALES: readonly ExampleLocale[] = ['ru', 'en'];
const SECTIONS = ['props', 'models', 'events', 'slots', 'exposed'] as const;
const NOT_PROSE_RE = /^(?:\/|#|https?:|pnpm |npm |yarn |bun )/;
const LETTER_RE = /\p{L}/u;
const CODE_RE = /`[^`]*`/g;
const WORD_RE = /[\p{L}\p{N}]+/gu;
const NAME_PART_RE = /[A-Z]?[a-z]+|[A-Z]+(?![a-z])|\d+/g;
const ENDING_RE = /(?:ing|ed|es|s|e)$/;
const MIN_WORDS = 2;
const VERB_TAIL = 3;

const STOP_WORDS: ReadonlySet<string> = new Set([
  'a',
  'an',
  'the',
  'of',
  'to',
  'is',
  'are',
  'for',
  'in',
  'on',
  'it',
  'its',
  'this',
  'that',
  'when',
  'and',
  'or',
  'be',
]);

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null;

const isProse = (text: string): boolean => LETTER_RE.test(text) && !NOT_PROSE_RE.test(text);

export const textEntriesOf = (
  file: string,
  locale: ExampleLocale,
  value: unknown,
  path = '',
): CatalogEntry[] => {
  if (typeof value === 'string') {
    return isProse(value) ? [{ file, path, locale, text: value }] : [];
  }
  if (!isRecord(value)) {
    return [];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    textEntriesOf(file, locale, child, path === '' ? key : `${path}.${key}`),
  );
};

const localized = (
  file: string,
  component: string,
  member: string,
  path: string,
  text: LocalizedText,
): ApiEntry[] =>
  LOCALES.map((locale) => ({ file, component, member, path, locale, text: text[locale] }));

const memberEntries = (file: string, component: string, docs: ComponentDocs): ApiEntry[] =>
  SECTIONS.flatMap((section) =>
    Object.entries(docs[section] ?? {}).flatMap(([member, text]) =>
      localized(file, component, member, `${component}.${section}.${member}`, text),
    ),
  );

export const apiEntriesOf = (file: string, docs: DocsMap): ApiEntry[] =>
  Object.entries(docs).flatMap(([component, entry]) => memberEntries(file, component, entry));

export const keyboardEntriesOf = (file: string, docs: DocsMap): CatalogEntry[] =>
  Object.entries(docs).flatMap(([component, entry]) =>
    (entry.keyboard ?? []).flatMap((key) =>
      localized(file, component, key.keys, `${component}.keyboard.${key.keys}`, key.description),
    ),
  );

export const catalogGuards = (
  entries: readonly CatalogEntry[],
  internals: boolean,
): GuardProblem[] =>
  entries.flatMap(({ file, path, locale, text }) => [
    ...lintProse(text, locale).reduce<GuardProblem[]>((found, problem) => {
      if (internals || problem.rule !== 'internals') {
        found.push({
          rule: GuardRule.Catalog,
          file,
          text: `${path} (${locale}): ${problem.rule} — ${problem.text}`,
        });
      }
      return found;
    }, []),
    ...termProblems(text, locale, GLOSSARY).map((found) => ({
      rule: GuardRule.Glossary,
      file,
      text: `${path} (${locale}): ${found}`,
    })),
    ...patternProblems(text, locale, META).map((found) => ({
      rule: GuardRule.Meta,
      file,
      text: `${path} (${locale}): ${found}`,
    })),
  ]);

const wordsOf = (text: string): string[] =>
  text.replace(CODE_RE, ' code ').toLowerCase().match(WORD_RE) ?? [];

const stemOf = (word: string): string => word.toLowerCase().replace(ENDING_RE, '');

const nameStems = (entry: ApiEntry): ReadonlySet<string> =>
  new Set(
    [...entry.member.matchAll(NAME_PART_RE), ...entry.component.matchAll(NAME_PART_RE)].map(
      ([part]) => stemOf(part),
    ),
  );

const repeatsName = (entry: ApiEntry): boolean => {
  const known = nameStems(entry);
  const [first = '', ...rest] = wordsOf(entry.text).filter((word) => !STOP_WORDS.has(word));

  return (
    known.has(stemOf(first)) &&
    ((first.endsWith('s') && rest.length < VERB_TAIL) ||
      rest.every((word) => known.has(stemOf(word))))
  );
};

export const tautologyGuards = (entries: readonly ApiEntry[]): GuardProblem[] => {
  const repeated = entries.reduce<Set<string>>(
    (paths, entry) => (entry.locale === 'en' && repeatsName(entry) ? paths.add(entry.path) : paths),
    new Set(),
  );

  return entries.reduce<GuardProblem[]>((found, entry) => {
    if (repeated.has(entry.path) || wordsOf(entry.text).length < MIN_WORDS) {
      found.push({
        rule: GuardRule.Tautology,
        file: entry.file,
        text: `${entry.path} (${entry.locale}): ${entry.text}`,
      });
    }
    return found;
  }, []);
};

export const homeGuards = (entries: readonly CatalogEntry[]): GuardProblem[] =>
  entries.flatMap(({ file, path, locale, text }) =>
    [
      ...patternProblems(text, locale, INSTEAD),
      ...patternProblems(text, locale, EVALUATIVE),
      ...(INVENTORY.exec(text) ?? []).slice(0, 1),
    ].map((found) => ({ rule: GuardRule.Home, file, text: `${path} (${locale}): ${found}` })),
  );
