import type { MarkdownRenderer } from 'vitepress';
import type { Highlighter } from 'shiki';
import type { NuiCodeLine, NuiCodeProps, NuiCodeToken } from '@numior/vue';
import { isCodeLanguage } from './languages';
import { scopeOf } from './scopes';

const TOKEN_THEME = 'github-light';
const HIGHLIGHT_RE = /\{([\d,-]+)\}/;
const TITLE_RE = /title="([^"]*)"/;

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

const mergeTokens = (tokens: readonly NuiCodeToken[]): NuiCodeToken[] =>
  tokens.reduce<NuiCodeToken[]>((merged, token) => {
    const last = merged.at(-1);

    if (last !== undefined && last.scope === token.scope) {
      merged[merged.length - 1] = { text: last.text + token.text, scope: last.scope };
    } else {
      merged.push(token);
    }
    return merged;
  }, []);

const tokenize = (
  highlighter: Highlighter,
  code: string,
  lang: string,
): NuiCodeLine[] | undefined => {
  if (!isCodeLanguage(lang) || !highlighter.getLoadedLanguages().includes(lang)) {
    return undefined;
  }

  const lines = highlighter.codeToTokensBase(code, {
    lang,
    theme: TOKEN_THEME,
    includeExplanation: 'scopeName',
  });

  return lines.map((line) =>
    mergeTokens(
      line.map((token) => {
        const scopes = (token.explanation ?? []).flatMap((entry) =>
          entry.scopes.map((scope) => scope.scopeName),
        );

        const scope = scopeOf(scopes);

        return scope === undefined ? { text: token.content } : { text: token.content, scope };
      }),
    ),
  );
};

const attributeJson = (value: unknown): string =>
  JSON.stringify(value)
    .replaceAll('&', '&amp;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

const PLAIN_LANGUAGES = new Set(['', 'txt', 'text']);

interface FenceInfo {
  readonly lang: string;
  readonly title: string | undefined;
  readonly highlight: number[] | undefined;
  readonly lineNumbers: true | undefined;
}

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
    tokens: plain ? undefined : tokenize(highlighter, code, lang),
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
      : `<NuiCode v-bind='${attributeJson(fenceProps(highlighter, token.info, token.content))}'></NuiCode>\n`;
  };
};
