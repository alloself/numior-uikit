import type { Highlighter } from 'shiki';
import type { NuiCodeLine, NuiCodeToken } from '@numior/vue';
import { isCodeLanguage } from './languages.ts';
import { scopeOf } from './scopes.ts';

const TOKEN_THEME = 'github-light';

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

export const tokenizeCode = (
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
