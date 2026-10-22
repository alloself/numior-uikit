import type { CellError } from './cell.types';
import { CELL_ERRORS } from './values';

export type ErrorTexts = Readonly<Record<CellError, string>>;

export const EN_ERRORS: ErrorTexts = {
  '#NULL!': '#NULL!',
  '#DIV/0!': '#DIV/0!',
  '#VALUE!': '#VALUE!',
  '#REF!': '#REF!',
  '#NAME?': '#NAME?',
  '#NUM!': '#NUM!',
  '#N/A': '#N/A',
  '#SPILL!': '#SPILL!',
  '#CALC!': '#CALC!',
};

export const RU_ERRORS: ErrorTexts = {
  '#NULL!': '#ПУСТО!',
  '#DIV/0!': '#ДЕЛ/0!',
  '#VALUE!': '#ЗНАЧ!',
  '#REF!': '#ССЫЛКА!',
  '#NAME?': '#ИМЯ?',
  '#NUM!': '#ЧИСЛО!',
  '#N/A': '#Н/Д',
  '#SPILL!': '#ПЕРЕНОС!',
  '#CALC!': '#ВЫЧИСЛ!',
};

export interface ErrorSpelling {
  readonly text: string;
  readonly code: CellError;
}

const spellings = new WeakMap<ErrorTexts, readonly ErrorSpelling[]>();

export const errorSpellings = (texts: ErrorTexts): readonly ErrorSpelling[] => {
  const known = spellings.get(texts);

  if (known !== undefined) {
    return known;
  }

  const found = CELL_ERRORS.flatMap((code) => [
    { text: texts[code].toUpperCase(), code },
    { text: code, code },
  ]).toSorted((left, right) => right.text.length - left.text.length);

  spellings.set(texts, found);
  return found;
};

export const errorFromText = (text: string, texts: ErrorTexts): CellError | undefined => {
  const wanted = text.toUpperCase();

  return errorSpellings(texts).find((spelling) => spelling.text === wanted)?.code;
};
