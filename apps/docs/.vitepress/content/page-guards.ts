import type { ExampleLocale } from '../examples/example.types.ts';
import { GuardRule, type GuardProblem, type PatternList, type TermList } from './guard.types.ts';
import { sentencesOf } from './prose-lint.ts';
import { GLOSSARY, META, SPEED, SPEED_CONTEXT } from './terms.ts';

type BlockKind = 'title' | 'heading' | 'caption-heading' | 'paragraph' | 'example' | 'other';

interface Block {
  readonly kind: BlockKind;
  readonly text: string;
}

interface Scan {
  readonly blocks: Block[];
  readonly lines: string[];
  readonly fenced: boolean;
}

const COMPONENT_PAGE_RE = /^(?:en\/)?components\/[^/]+\.md$/;
const CODE_RE = /`[^`]*`/g;
const LINK_RE = /\]\([^)]*\)/g;
const DEFINITION_RE = /^`[^`]+`\s+(?:—|–|-|is|are|это)\s/u;
const TRIAD_RE = /:\s+[^.:;,]+,\s+[^.:;,]+(?:,\s+|\s+(?:и|или|and|or)\s+)[^.:;]+\.$/u;
const IMPERATIVE_RE = /[а-яё]+(?:йте|ите|ьте)(?![а-яё])/iu;
const WORD_RE = /[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu;
const OPENING_WORDS = 3;
const OPENING_PAGES = 3;

const CAPTION_STARTS: PatternList = {
  ru: [/^`/, /^(?:Свойство|Проп|Пропс|Атрибут)(?![\p{L}])/u],
  en: [/^`/, /^(?:The|A|An|This|It|With|When|If|You|Prop|Property)(?![\p{L}])/u],
};

const KINDS: readonly (readonly [RegExp, BlockKind])[] = [
  [/^# /, 'title'],
  [/^### /, 'caption-heading'],
  [/^#{2,6} /, 'heading'],
  [/^<Example\s/, 'example'],
  [/^(?:<|\||:::|---)/, 'other'],
];

const localeOfPage = (page: string): ExampleLocale => (page.startsWith('en/') ? 'en' : 'ru');

const plain = (text: string): string => text.replace(CODE_RE, ' ').replace(LINK_RE, ']');

const kindOf = (line: string): BlockKind | undefined =>
  KINDS.find(([test]) => test.test(line))?.[1];

const closed = (scan: Scan): Scan =>
  scan.lines.length === 0
    ? scan
    : {
        ...scan,
        blocks: [...scan.blocks, { kind: 'paragraph', text: scan.lines.join(' ') }],
        lines: [],
      };

const scanLine = (scan: Scan, raw: string): Scan => {
  const line = raw.trim();

  if (line.startsWith('```')) {
    return { ...closed(scan), fenced: !scan.fenced };
  }
  if (scan.fenced || line === '') {
    return closed(scan);
  }

  const kind = kindOf(line);

  if (kind === undefined) {
    return { ...scan, lines: [...scan.lines, line] };
  }

  const done = closed(scan);

  return { ...done, blocks: [...done.blocks, { kind, text: line }] };
};

const withoutFrontmatter = (lines: readonly string[]): readonly string[] =>
  lines[0] === '---' ? lines.slice(lines.indexOf('---', 1) + 1) : lines;

const blocksOf = (markdown: string): Block[] =>
  closed(
    withoutFrontmatter(markdown.split('\n')).reduce<Scan>(scanLine, {
      blocks: [],
      lines: [],
      fenced: false,
    }),
  ).blocks;

const leadOf = (blocks: readonly Block[]): string | undefined => {
  const next = blocks[blocks.findIndex((block) => block.kind === 'title') + 1];

  return blocks.some((block) => block.kind === 'title') && next?.kind === 'paragraph'
    ? next.text
    : undefined;
};

export const leadTextOf = (markdown: string): string | undefined => leadOf(blocksOf(markdown));

const paragraphsUntilExample = (blocks: readonly Block[]): string[] | undefined => {
  const end = blocks.findIndex((block) => block.kind !== 'paragraph');

  return blocks[end]?.kind === 'example'
    ? blocks.slice(0, end).map((block) => block.text)
    : undefined;
};

const captionsOf = (blocks: readonly Block[]): string[] =>
  blocks.reduce<string[]>((captions, block, index) => {
    const paragraphs =
      block.kind === 'caption-heading'
        ? paragraphsUntilExample(blocks.slice(index + 1))
        : undefined;

    if (paragraphs !== undefined && paragraphs.length > 0) {
      captions.push(paragraphs.join(' '));
    }
    return captions;
  }, []);

const leadProblems = (lead: string): string[] => {
  const sentences = sentencesOf(lead);

  return [
    ...(DEFINITION_RE.test(lead) ? ['starts with the component name and a dash'] : []),
    ...(TRIAD_RE.test(sentences[0] ?? '') ? ['lists examples after a colon'] : []),
    ...(sentences.length > 1 ? [`${sentences.length} sentences`] : []),
  ];
};

const captionProblems = (caption: string, locale: ExampleLocale): string[] => {
  const sentences = sentencesOf(caption);

  return [
    ...(sentences.length > 1 ? [`${sentences.length} sentences: ${caption}`] : []),
    ...(CAPTION_STARTS[locale].some((start) => start.test(caption))
      ? [`starts with a prop or an article: ${caption}`]
      : []),
    ...(locale === 'ru' && !IMPERATIVE_RE.test(plain(caption))
      ? [`has no imperative verb: ${caption}`]
      : []),
  ];
};

export const termProblems = (text: string, locale: ExampleLocale, terms: TermList): string[] =>
  terms[locale].reduce<string[]>((found, [pattern, term]) => {
    const match = pattern.exec(plain(text));

    if (match !== null) {
      found.push(`«${match[0]}» → ${term}`);
    }
    return found;
  }, []);

export const patternProblems = (
  text: string,
  locale: ExampleLocale,
  patterns: PatternList,
): string[] =>
  patterns[locale].reduce<string[]>((found, pattern) => {
    const match = new RegExp(pattern.source, pattern.flags.replace('g', '')).exec(plain(text));

    if (match !== null) {
      found.push(match[0]);
    }
    return found;
  }, []);

const speedProblems = (text: string, locale: ExampleLocale): string[] =>
  sentencesOf(plain(text)).flatMap((sentence) =>
    SPEED_CONTEXT[locale].some((context) => context.test(sentence))
      ? patternProblems(sentence, locale, SPEED)
      : [],
  );

const proseProblems = (file: string, text: string, locale: ExampleLocale): GuardProblem[] => [
  ...termProblems(text, locale, GLOSSARY).map((found) => ({
    rule: GuardRule.Glossary,
    file,
    text: found,
  })),
  ...patternProblems(text, locale, META).map((found) => ({
    rule: GuardRule.Meta,
    file,
    text: found,
  })),
  ...speedProblems(text, locale).map((found) => ({ rule: GuardRule.Speed, file, text: found })),
];

export const pageGuards = (page: string, source: string): GuardProblem[] => {
  const locale = localeOfPage(page);
  const blocks = blocksOf(source);
  const isComponent = COMPONENT_PAGE_RE.test(page);
  const lead = isComponent ? leadOf(blocks) : undefined;

  return [
    ...(lead === undefined ? [] : leadProblems(lead)).map((text) => ({
      rule: GuardRule.Lead,
      file: page,
      text,
    })),
    ...(isComponent ? captionsOf(blocks) : [])
      .flatMap((caption) => captionProblems(caption, locale))
      .map((text) => ({ rule: GuardRule.Caption, file: page, text })),
    ...blocks.flatMap((block) =>
      block.kind === 'paragraph' ? proseProblems(page, block.text, locale) : [],
    ),
  ];
};

const openingOf = (lead: string): string =>
  (plain(lead).toLowerCase().match(WORD_RE) ?? []).slice(0, OPENING_WORDS).join(' ');

export const openingGuards = (pages: Readonly<Record<string, string>>): GuardProblem[] => {
  const openings = Object.entries(pages).reduce<Map<string, string[]>>((groups, [page, source]) => {
    const lead = COMPONENT_PAGE_RE.test(page) ? leadOf(blocksOf(source)) : undefined;

    if (lead !== undefined) {
      const key = `${localeOfPage(page)}:${openingOf(lead)}`;

      groups.set(key, [...(groups.get(key) ?? []), page]);
    }
    return groups;
  }, new Map());

  return [...openings].flatMap(([key, group]) =>
    group.length > OPENING_PAGES
      ? group.map((file) => ({
          rule: GuardRule.Opening,
          file,
          text: `«${key.slice(key.indexOf(':') + 1)}» opens ${group.length} pages`,
        }))
      : [],
  );
};
