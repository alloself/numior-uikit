import { readFileSync } from 'node:fs';
import type { MarkdownRenderer } from 'vitepress';
import type { Highlighter } from 'shiki';
import type { NuiCodeProps } from '@numior/vue';
import { cssDeclarationsOf } from '../theme/theme-css.ts';
import { tokenizeCode } from './tokens.ts';

interface FenceToken {
  readonly info: string;
  readonly content: string;
  readonly meta: unknown;
}

interface FenceInfo {
  readonly lang: string;
  readonly title: string | undefined;
  readonly highlight: number[] | undefined;
  readonly lineNumbers: true | undefined;
}

const HIGHLIGHT_RE = /\{([\d,-]+)\}/;
const TITLE_RE = /title="([^"]*)"/;
const LABEL_RE = /\[([^\]]+)\]/;
const PLAIN_LANGUAGES = new Set(['', 'txt', 'text']);
const PREVIEW_RE = /^css\s(?:.*\s)?preview(?:\s|$)/u;

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

const parseFenceInfo = (info: string): FenceInfo => {
  const lines = highlightedLines(info);

  return {
    lang: (info.split(/[\s:{]/)[0] ?? '').toLowerCase(),
    title: TITLE_RE.exec(info)?.[1],
    highlight: lines.length > 0 ? lines : undefined,
    lineNumbers: /:line-numbers/.test(info) ? true : undefined,
  };
};

export const attributeJson = (value: unknown): string =>
  JSON.stringify(value)
    .replaceAll('&', '&amp;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

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

const snippetPath = (token: { readonly meta: unknown }): string | undefined => {
  const { meta } = token;
  const source: unknown = typeof meta === 'object' && meta !== null ? Reflect.get(meta, 'src') : '';

  return typeof source === 'string' && source !== '' ? source : undefined;
};

const trackSnippet = (env: unknown, path: string): void => {
  const includes: unknown =
    typeof env === 'object' && env !== null ? Reflect.get(env, 'includes') : undefined;

  if (!Array.isArray(includes)) {
    return;
  }

  includes.push(path);
};

const fenceContent = (token: FenceToken, env: unknown): string => {
  const path = snippetPath(token);

  if (path === undefined) {
    return token.content;
  }
  trackSnippet(env, path);
  return readFileSync(path, 'utf8');
};

export const fenceLabel = (token: FenceToken): string => {
  const info = token.info.trim();

  return LABEL_RE.exec(info)?.[1] ?? parseFenceInfo(info).lang;
};

export const fenceCode = (
  highlighter: Highlighter,
  token: FenceToken,
  env: unknown,
): NuiCodeProps => fenceProps(highlighter, token.info, fenceContent(token, env));

const pageThemes = new WeakMap<object, ReadonlyMap<string, string>>();

const themePreview = (token: FenceToken, env: unknown): string => {
  if (!PREVIEW_RE.test(token.info.trim()) || typeof env !== 'object' || env === null) {
    return '';
  }

  const theme = new Map([...(pageThemes.get(env) ?? []), ...cssDeclarationsOf(token.content)]);

  pageThemes.set(env, theme);

  return `<ThemeStep :theme='${attributeJson(Object.fromEntries(theme))}' />\n`;
};

export const codeFence = (md: MarkdownRenderer, highlighter: Highlighter): void => {
  md.renderer.rules.fence = (tokens, idx, _options, env) => {
    const token = tokens[idx];

    return token === undefined
      ? ''
      : `<div class="mb-5"><NuiCode v-bind='${attributeJson(fenceCode(highlighter, token, env))}'></NuiCode></div>\n${themePreview(token, env)}`;
  };
};
