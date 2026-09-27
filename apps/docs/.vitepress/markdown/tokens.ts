import type { Highlighter, ThemedToken } from 'shiki';
import type { NuiCodeLine, NuiCodeToken } from '@numior/vue';
import { isCodeLanguage, type CodeLanguage } from './languages.ts';
import { scopeOf } from './scopes.ts';

const TOKEN_THEME = 'github-light';
const SFC_BLOCK_RE = /^\s*<(?:template|script|style)\b/m;
const SHELL_LANGUAGES = new Set(['sh', 'shell', 'zsh']);

export const codeLanguageOf = (lang: string, code: string): CodeLanguage | undefined => {
  if (SHELL_LANGUAGES.has(lang)) {
    return 'bash';
  }
  if (lang === 'vue' && !SFC_BLOCK_RE.test(code)) {
    return 'vue-html';
  }
  return isCodeLanguage(lang) ? lang : undefined;
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

const tokenOf = (text: string, scopes: readonly string[]): NuiCodeToken => {
  const scope = scopeOf(scopes);

  return scope === undefined ? { text } : { text, scope };
};

const piecesOf = (token: ThemedToken): NuiCodeToken[] => {
  const explanation = token.explanation ?? [];

  if (explanation.length === 0) {
    return [{ text: token.content }];
  }
  return explanation.map((entry) =>
    tokenOf(
      entry.content,
      entry.scopes.map((scope) => scope.scopeName),
    ),
  );
};

export const tokenizeCode = (
  highlighter: Highlighter,
  code: string,
  lang: string,
): NuiCodeLine[] | undefined => {
  const language = codeLanguageOf(lang, code);

  if (language === undefined || !highlighter.getLoadedLanguages().includes(language)) {
    return undefined;
  }

  const lines = highlighter.codeToTokensBase(code, {
    lang: language,
    theme: TOKEN_THEME,
    includeExplanation: 'scopeName',
  });

  return lines.map((line) => mergeTokens(line.flatMap(piecesOf)));
};
