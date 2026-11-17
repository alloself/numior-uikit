import { inject, provide, type InjectionKey } from 'vue';
import { createShikiHighlighter } from '../shiki/shiki';
import type { NuiCodeLanguage, NuiCodeTokens, NuiHighlighter } from './highlight.types';

export const HIGHLIGHTER_KEY: InjectionKey<NuiHighlighter | false> = Symbol('nui:highlighter');

let builtIn: NuiHighlighter | undefined;

const builtInHighlighter = (): NuiHighlighter => {
  builtIn ??= createShikiHighlighter();
  return builtIn;
};

export const provideHighlighter = (highlighter: NuiHighlighter | false): void => {
  provide(HIGHLIGHTER_KEY, highlighter);
};

export const useHighlighter = (): NuiHighlighter | null => {
  const configured = inject(HIGHLIGHTER_KEY, builtInHighlighter, true);

  return configured === false ? null : configured;
};

export const languageOf = (
  highlighter: NuiHighlighter,
  name: string | null | undefined,
): NuiCodeLanguage | undefined => {
  const wanted = name?.trim().toLowerCase();

  return wanted === undefined || wanted === ''
    ? undefined
    : highlighter.languages.find(
        (language) => language.id === wanted || (language.aliases ?? []).includes(wanted),
      );
};

const CACHE_LIMIT = 200;

const caches = new WeakMap<NuiHighlighter, Map<string, NuiCodeTokens>>();

const cacheOf = (highlighter: NuiHighlighter): Map<string, NuiCodeTokens> => {
  const known = caches.get(highlighter);

  if (known !== undefined) {
    return known;
  }

  const cache = new Map<string, NuiCodeTokens>();

  caches.set(highlighter, cache);
  return cache;
};

const remember = (cache: Map<string, NuiCodeTokens>, key: string, tokens: NuiCodeTokens): void => {
  const oldest = cache.size >= CACHE_LIMIT ? cache.keys().next().value : undefined;

  if (oldest !== undefined) {
    cache.delete(oldest);
  }
  cache.set(key, tokens);
};

export const highlightCode = (
  highlighter: NuiHighlighter,
  code: string,
  language: string | null | undefined,
): NuiCodeTokens | Promise<NuiCodeTokens> => {
  const found = languageOf(highlighter, language);

  if (found === undefined) {
    return undefined;
  }

  const cache = cacheOf(highlighter);
  const key = `${found.id}\n${code}`;

  if (cache.has(key)) {
    return cache.get(key);
  }

  const result = highlighter.tokens(code, found.id);

  if (result instanceof Promise) {
    return result.then((tokens) => {
      remember(cache, key, tokens);
      return tokens;
    });
  }
  remember(cache, key, result);
  return result;
};
