import type { FormulaLocale } from './formula.types';
import { BooleanText } from '../cell.types';

const readers = new WeakMap<FormulaLocale, ReadonlyMap<string, string>>();

const keyOf = (name: string): string => name.toUpperCase().replaceAll('Ё', 'Е');

const readerOf = (locale: FormulaLocale): ReadonlyMap<string, string> => {
  const known = readers.get(locale);

  if (known !== undefined) {
    return known;
  }

  const reader = new Map<string, string>();

  Object.entries(locale.functions).forEach(([canonical, local]) => {
    reader.set(keyOf(canonical), canonical);
    reader.set(keyOf(local), canonical);
  });

  readers.set(locale, reader);
  return reader;
};

export const canonicalFunction = (name: string, locale: FormulaLocale): string =>
  readerOf(locale).get(keyOf(name)) ?? name.toUpperCase();

export const localFunction = (name: string, locale: FormulaLocale): string =>
  locale.functions[name] ?? name;

export const booleanFromWord = (word: string, locale: FormulaLocale): boolean | undefined => {
  const upper = word.toUpperCase();

  if (upper === BooleanText.True || upper === locale.trueText.toUpperCase()) {
    return true;
  }
  return upper === BooleanText.False || upper === locale.falseText.toUpperCase()
    ? false
    : undefined;
};
