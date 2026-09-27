import type { ExampleLocale } from '../examples/example.types.ts';

export interface ProseProblem {
  readonly line: number;
  readonly rule: 'sentence' | 'paragraph' | 'phrase' | 'internals';
  readonly text: string;
}

const MAX_WORDS = 25;
const MAX_SENTENCES = 3;

const BANNED: Readonly<Record<ExampleLocale, readonly string[]>> = {
  ru: [
    'позволяет',
    'обратите внимание',
    'важно отметить',
    'мощный',
    'гибкий',
    'бесшовно',
    'в будущем',
    'это не заменяет',
    'данный',
    'является',
    'функционал',
  ],
  en: [
    'allows you to',
    'please note',
    'it is important to note',
    'powerful',
    'flexible',
    'seamless',
    'seamlessly',
    'in the future',
    'does not replace',
    'leverage',
    'robust',
    'functionality',
  ],
};

const INTERNALS_RE = /nui-[a-z0-9-]+(?:__|--)[a-z0-9_-]+|--_[a-z0-9-]+/;
const SENTENCE_END_RE = /(?<=[.!?…])\s+(?=[A-ZА-ЯЁ«"`([])/u;
const LIST_ITEM_RE = /^(?:[-*]|\d+\.)\s+/;
const WORD_RE = /[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu;

const isSkipped = (line: string): boolean =>
  line.startsWith('#') ||
  line.startsWith('|') ||
  line.startsWith('<') ||
  line.startsWith(':::') ||
  line.startsWith('---');

interface Paragraph {
  readonly line: number;
  readonly text: string;
  readonly api: boolean;
}

const stripFrontmatter = (lines: readonly string[]): readonly string[] =>
  lines[0] === '---' ? lines.slice(lines.indexOf('---', 1) + 1) : lines;

const paragraphsOf = (markdown: string): Paragraph[] => {
  const paragraphs: Paragraph[] = [];
  let fenced = false;
  let api = false;
  let current: string[] = [];
  let start = 0;

  const flush = (): void => {
    if (current.length > 0) {
      paragraphs.push({ line: start, text: current.join(' '), api });
      current = [];
    }
  };

  stripFrontmatter(markdown.split('\n')).forEach((raw, index) => {
    const line = raw.trim();

    if (line.startsWith('```')) {
      fenced = !fenced;
      flush();
      return;
    }
    if (line.startsWith('## ')) {
      api = /^## API\b/.test(line);
    }
    if (fenced || line === '' || isSkipped(line)) {
      flush();
      return;
    }
    if (LIST_ITEM_RE.test(line)) {
      flush();
    }
    if (current.length === 0) {
      start = index + 1;
    }
    current.push(line.replace(LIST_ITEM_RE, ''));
  });

  flush();
  return paragraphs;
};

const sentencesOf = (text: string): string[] =>
  text
    .split(SENTENCE_END_RE)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence !== '');

const wordCount = (sentence: string): number => sentence.match(WORD_RE)?.length ?? 0;

const paragraphProblems = (paragraph: Paragraph, locale: ExampleLocale): ProseProblem[] => {
  const problems: ProseProblem[] = [];
  const sentences = sentencesOf(paragraph.text);
  const lower = paragraph.text.toLowerCase();

  if (sentences.length > MAX_SENTENCES) {
    problems.push({
      line: paragraph.line,
      rule: 'paragraph',
      text: `${sentences.length} sentences`,
    });
  }
  for (const sentence of sentences.filter((entry) => wordCount(entry) > MAX_WORDS)) {
    problems.push({ line: paragraph.line, rule: 'sentence', text: sentence });
  }
  for (const phrase of BANNED[locale].filter((entry) => lower.includes(entry))) {
    problems.push({ line: paragraph.line, rule: 'phrase', text: phrase });
  }
  const internals = paragraph.api ? null : INTERNALS_RE.exec(paragraph.text);

  if (internals !== null) {
    problems.push({ line: paragraph.line, rule: 'internals', text: internals[0] });
  }
  return problems;
};

export const lintProse = (markdown: string, locale: ExampleLocale): ProseProblem[] =>
  paragraphsOf(markdown).flatMap((paragraph) => paragraphProblems(paragraph, locale));
