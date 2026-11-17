import type { Highlighter } from 'shiki';
import type { NuiCodeLine } from '@numior/vue';
import { shikiTokens } from '@numior/primitives/shiki';
import { isCodeLanguage, type CodeLanguage } from './languages.ts';

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

export const tokenizeCode = (
  highlighter: Highlighter,
  code: string,
  lang: string,
): NuiCodeLine[] | undefined => {
  const language = codeLanguageOf(lang, code);

  return language === undefined ? undefined : shikiTokens(highlighter, code, language);
};
