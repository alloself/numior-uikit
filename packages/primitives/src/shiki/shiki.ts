import type { NuiCodeLine, NuiCodeToken, NuiHighlighter } from '../highlight/highlight.types';
import type { BundledLanguage, BundledTheme, Highlighter, ThemedToken } from 'shiki';
import { SHIKI_LANGUAGES } from './languages';
import { scopeOf } from './scopes';
import type { ShikiHighlighterOptions } from './shiki.types';

interface Loaded {
  readonly instance: Highlighter;
  readonly language: BundledLanguage;
}

const TOKEN_THEME: BundledTheme = 'github-light';

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

export const shikiTokens = (
  highlighter: Highlighter,
  code: string,
  language: BundledLanguage,
  theme: BundledTheme = TOKEN_THEME,
): NuiCodeLine[] | undefined =>
  highlighter.getLoadedLanguages().includes(language)
    ? highlighter
        .codeToTokensBase(code, {
          lang: language,
          theme,
          includeExplanation: 'scopeName',
          tokenizeTimeLimit: 0,
        })
        .map((line) => mergeTokens(line.flatMap(piecesOf)))
    : undefined;

export const createShikiHighlighter = (options: ShikiHighlighterOptions = {}): NuiHighlighter => {
  const languages = options.languages ?? SHIKI_LANGUAGES;
  const theme = options.theme ?? TOKEN_THEME;
  let loading: Promise<typeof import('shiki')> | undefined;
  let created: Promise<Highlighter> | undefined;

  const shiki = (): Promise<typeof import('shiki')> => {
    loading ??= import('shiki').catch((error: unknown) => {
      loading = undefined;
      throw error;
    });

    return loading;
  };

  const highlighter = (): Promise<Highlighter> => {
    created ??= shiki()
      .then((module) => module.createHighlighter({ themes: [theme], langs: [] }))
      .catch((error: unknown) => {
        created = undefined;
        throw error;
      });

    return created;
  };

  const ready = async (name: string): Promise<Loaded | undefined> => {
    const module = await shiki();

    const isBundled = (candidate: string): candidate is BundledLanguage =>
      Object.hasOwn(module.bundledLanguages, candidate);

    if (!isBundled(name)) {
      return undefined;
    }

    const instance = await highlighter();

    if (!instance.getLoadedLanguages().includes(name)) {
      await instance.loadLanguage(name);
    }
    return { instance, language: name };
  };

  return {
    languages,
    tokens: async (code, language) => {
      const loaded = await ready(language);

      return loaded === undefined
        ? undefined
        : shikiTokens(loaded.instance, code, loaded.language, theme);
    },
  };
};
