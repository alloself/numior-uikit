import { FormatChar, LanguageCode, type NumberLocale } from './format.types';

const LETTERS: Readonly<Record<string, string>> = {
  д: 'd',
  м: 'm',
  г: 'y',
  ч: 'h',
  с: 's',
};

const PLACEHOLDER = /[0#?]/u;

const SPACES = new Set([' ', ' ', ' ']);

const LOCALIZED = /[Ѐ-ӿ]|[0#?][   ][0#?]/u;

const COMMA = /[0#?],[0#?]/u;

const POINT = /[0#?]\.[0#?]/u;

const GENERAL = /основной/giu;

const closingOf = (code: string, at: number, char: string): number => {
  const end = code.indexOf(char, at + 1);

  return end < 0 ? code.length - 1 : end;
};

const translated = (code: string, at: number): string => {
  const char = code.charAt(at);
  const letter = LETTERS[char.toLowerCase()];

  if (letter !== undefined) {
    return letter;
  }
  if (char === FormatChar.Comma) {
    return '.';
  }
  if (char === FormatChar.Point) {
    return '\\.';
  }
  return SPACES.has(char) &&
    PLACEHOLDER.test(code.charAt(at - 1)) &&
    PLACEHOLDER.test(code.charAt(at + 1))
    ? ','
    : char;
};

const invariantOf = (code: string): string => {
  let result = '';

  for (let at = 0; at < code.length; at += 1) {
    const char = code.charAt(at);

    if (char === FormatChar.Quote || char === FormatChar.OpenBracket) {
      const end = closingOf(code, at, char === FormatChar.Quote ? '"' : ']');

      result += code.slice(at, end + 1);
      at = end;
    } else if (char === FormatChar.Backslash) {
      result += code.slice(at, at + 2);
      at += 1;
    } else {
      result += translated(code, at);
    }
  }
  return result;
};

const localized = (code: string): boolean =>
  LOCALIZED.test(code) || (COMMA.test(code) && !POINT.test(code));

export const invariantCode = (code: string, locale: NumberLocale): string =>
  locale.name === LanguageCode.Ru && localized(code)
    ? invariantOf(code.replaceAll(GENERAL, 'General'))
    : code;
