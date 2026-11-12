import { FormatChar, LanguageCode, type NumberLocale } from './format.types';

interface Step {
  readonly text: string;
  readonly next: number;
}

const LETTERS: Readonly<Record<string, string>> = {
  д: 'd',
  м: 'm',
  г: 'y',
  ч: 'h',
  с: 's',
};

const LATIN_CODES = new Set(['d', 'm', 'y', 'h', 's']);

const COLORS: Readonly<Record<string, string>> = {
  черный: 'Black',
  белый: 'White',
  красный: 'Red',
  зеленый: 'Green',
  синий: 'Blue',
  желтый: 'Yellow',
  фиолетовый: 'Magenta',
  голубой: 'Cyan',
};

const PLACEHOLDER = /[0#?]/u;

const SPACES = new Set([' ', ' ', ' ']);

const MERIDIEM = /^(?:am\/pm|a\/p)/iu;

const EXPONENT = /^E[+-]/u;

const LOCAL_GENERAL = /^основной/iu;

const GENERAL = /^general/iu;

const LOCAL_ELAPSED = /^[чмс]+$/iu;

const LOCAL_LETTER = /[дмгчс]/giu;

const LOCAL_PALETTE = /^цвет\s*(\d{1,2})$/iu;

const ENGLISH_BRACKET =
  /^(?:[hms]+|black|white|red|green|blue|yellow|magenta|cyan|color\s*\d{1,2})$/iu;

const WORD = /^\p{L}+$/u;

const FRACTION_AHEAD = /^[0#?]+\//u;

const ERA = 'e';

const lettersOf = (text: string): string =>
  text.replace(LOCAL_LETTER, (char) => LETTERS[char.toLowerCase()] ?? char);

const bracketOf = (content: string): string | undefined => {
  if (content.startsWith('$')) {
    return content;
  }
  if (ENGLISH_BRACKET.test(content)) {
    return undefined;
  }
  if (LOCAL_ELAPSED.test(content)) {
    return lettersOf(content);
  }

  const palette = LOCAL_PALETTE.exec(content)?.[1];

  if (palette !== undefined) {
    return `Color${palette}`;
  }

  const color = COLORS[content.toLowerCase()];

  if (color !== undefined || WORD.test(content)) {
    return color;
  }
  return content.replaceAll(FormatChar.Comma, FormatChar.Point);
};

const closedAt = (code: string, at: number, char: string): number => {
  const end = code.indexOf(char, at + 1);

  return end < 0 ? code.length : end + 1;
};

const quotedStep = (code: string, at: number): Step => {
  const next = closedAt(code, at, FormatChar.Quote);

  return { text: code.slice(at, next), next };
};

const bracketStep = (code: string, at: number): Step | undefined => {
  const next = closedAt(code, at, FormatChar.CloseBracket);
  const content = bracketOf(code.slice(at + 1, next - 1));

  return content === undefined ? undefined : { text: `[${content}]`, next };
};

const spaceStep = (code: string, at: number, currency: string): Step | undefined => {
  let next = at;

  while (SPACES.has(code.charAt(next))) {
    next += 1;
  }

  const run = next - at;
  const rest = code.slice(next);

  if (!PLACEHOLDER.test(code.charAt(at - 1))) {
    return { text: code.slice(at, next), next };
  }

  if (FRACTION_AHEAD.test(rest)) {
    return undefined;
  }

  const beforeCurrency =
    currency !== '' && (rest.startsWith(currency) || rest.startsWith(`"${currency}`));

  return {
    text: beforeCurrency ? `${FormatChar.Backslash} `.repeat(run) : FormatChar.Comma.repeat(run),
    next,
  };
};

const letterStep = (char: string, at: number): Step | undefined => {
  const lower = char.toLowerCase();
  const local = LETTERS[lower];

  if (local !== undefined) {
    return { text: local, next: at + 1 };
  }
  if (char === ERA) {
    return undefined;
  }
  return {
    text: LATIN_CODES.has(lower) ? `${FormatChar.Backslash}${char}` : char,
    next: at + 1,
  };
};

const wordStep = (code: string, at: number): Step | undefined => {
  const rest = code.slice(at);
  const kept = MERIDIEM.exec(rest)?.[0] ?? EXPONENT.exec(rest)?.[0];

  if (kept !== undefined) {
    return { text: kept, next: at + kept.length };
  }

  const general = LOCAL_GENERAL.exec(rest)?.[0];

  if (general !== undefined) {
    return { text: 'General', next: at + general.length };
  }
  return GENERAL.test(rest) ? undefined : letterStep(code.charAt(at), at);
};

const stepAt = (code: string, at: number, currency: string): Step | undefined => {
  const char = code.charAt(at);

  switch (char) {
    case FormatChar.Quote:
      return quotedStep(code, at);
    case FormatChar.Backslash:
    case FormatChar.Underscore:
    case FormatChar.Asterisk:
      return { text: code.slice(at, at + 2), next: at + 2 };
    case FormatChar.OpenBracket:
      return bracketStep(code, at);
    case FormatChar.Comma:
      return { text: FormatChar.Point, next: at + 1 };
    case FormatChar.Point:
      return PLACEHOLDER.test(code.charAt(at + 1))
        ? undefined
        : { text: `${FormatChar.Backslash}${char}`, next: at + 1 };
    default:
      return SPACES.has(char) ? spaceStep(code, at, currency) : wordStep(code, at);
  }
};

const invariantOf = (code: string, currency: string): string | undefined => {
  let result = '';
  let at = 0;

  while (at < code.length) {
    const step = stepAt(code, at, currency);

    if (step === undefined) {
      return undefined;
    }

    result += step.text;
    at = step.next;
  }
  return result;
};

export const invariantCode = (code: string, locale: NumberLocale): string | undefined =>
  locale.name === LanguageCode.Ru ? invariantOf(code, locale.currencySymbols[0] ?? '') : code;
