import type { MarkdownRenderer } from 'vitepress';
import type { Highlighter } from 'shiki';
import type { NuiCodeProps } from '@numior/vue';
import { tokenizeCode } from './tokens.ts';

interface FenceInfo {
  readonly lang: string;
  readonly title: string | undefined;
  readonly highlight: number[] | undefined;
  readonly lineNumbers: true | undefined;
}

const HIGHLIGHT_RE = /\{([\d,-]+)\}/;
const TITLE_RE = /title="([^"]*)"/;
const PLAIN_LANGUAGES = new Set(['', 'txt', 'text']);

const highlightedLines = (info: string): number[] => {
  const spec = HIGHLIGHT_RE.exec(info)?.[1];

  if (spec === undefined) {
    return [];
  }
  return spec.split(',').flatMap((part) => {
    const [from, to] = part.split('-').map(Number);

    if (from === undefined || Number.isNaN(from)) {
      return [];
    }
    const end = to === undefined || Number.isNaN(to) ? from : to;

    return Array.from({ length: end - from + 1 }, (_, index) => from + index);
  });
};

const attributeJson = (value: unknown): string =>
  JSON.stringify(value)
    .replaceAll('&', '&amp;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

const parseFenceInfo = (info: string): FenceInfo => {
  const lines = highlightedLines(info);

  return {
    lang: (info.split(/[\s:{]/)[0] ?? '').toLowerCase(),
    title: TITLE_RE.exec(info)?.[1],
    highlight: lines.length > 0 ? lines : undefined,
    lineNumbers: /:line-numbers/.test(info) ? true : undefined,
  };
};

const fenceProps = (highlighter: Highlighter, info: string, content: string): NuiCodeProps => {
  const { lang, title, highlight, lineNumbers } = parseFenceInfo(info.trim());
  const code = content.replace(/\n$/, '');
  const plain = PLAIN_LANGUAGES.has(lang);

  return {
    code,
    tokens: plain ? undefined : tokenizeCode(highlighter, code, lang),
    language: plain ? undefined : lang,
    title,
    highlight,
    lineNumbers,
  };
};

export const codeFence = (md: MarkdownRenderer, highlighter: Highlighter): void => {
  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx];

    return token === undefined
      ? ''
      : `<NuiCode class="mb-5" v-bind='${attributeJson(fenceProps(highlighter, token.info, token.content))}'></NuiCode>\n`;
  };
};
