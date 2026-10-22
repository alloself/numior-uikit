import { errorSpellings } from '../error-texts';
import type { FormulaLocale } from './formula.types';

export type TokenKind =
  | 'number'
  | 'string'
  | 'error'
  | 'word'
  | 'sheet'
  | 'structured'
  | 'op'
  | 'punct'
  | 'hash'
  | 'end';

export interface Token {
  readonly kind: TokenKind;
  readonly text: string;
  readonly start: number;
  readonly value: number;
}

export interface LexFailure {
  readonly position: number;
}

const LONGEST_ERROR = 12;

const LONGEST_BOOK = 12;

const WORD_START = /[\p{L}_$]/u;

const WORD_PART = /[\p{L}\p{N}_.$]/u;

const DIGIT = /\d/u;

const SPACE = /\s/u;

const BOOK = /^\[(\d+)\]/u;

const OPERATORS = ['<>', '<=', '>=', '+', '-', '*', '/', '^', '&', '=', '<', '>', '%', ':'];

const PUNCTUATION = new Set(['(', ')', '{', '}', ',', ';', '\\']);

const token = (kind: TokenKind, text: string, start: number, value = 0): Token => ({
  kind,
  text,
  start,
  value,
});

const digitsFrom = (source: string, at: number): number => {
  let end = at;

  while (end < source.length && DIGIT.test(source[end] ?? '')) {
    end += 1;
  }
  return end;
};

const exponentEnd = (source: string, at: number): number => {
  if (!/[eE]/u.test(source[at] ?? '')) {
    return at;
  }
  const sign = /[+-]/u.test(source[at + 1] ?? '') ? at + 2 : at + 1;
  const end = digitsFrom(source, sign);

  return end > sign ? end : at;
};

const numberAt = (source: string, at: number, locale: FormulaLocale): Token | undefined => {
  const whole = digitsFrom(source, at);
  const point = source.startsWith(locale.decimal, whole) ? whole + locale.decimal.length : whole;
  const fraction = point > whole ? digitsFrom(source, point) : whole;

  if (whole === at && fraction === point) {
    return undefined;
  }
  const end = exponentEnd(source, fraction);
  const text = source.slice(at, end);

  return token('number', text, at, Number(text.replace(locale.decimal, '.')));
};

const quotedEnd = (source: string, at: number, quote: string): number | undefined => {
  for (let end = at + 1; end < source.length; end += 1) {
    if (source[end] === quote) {
      if (source[end + 1] !== quote) {
        return end;
      }
      end += 1;
    }
  }
  return undefined;
};

const unquote = (text: string, quote: string): string =>
  text.slice(1, -1).replaceAll(quote + quote, quote);

const errorAt = (source: string, at: number, locale: FormulaLocale): Scan | undefined => {
  const upper = source.slice(at, at + LONGEST_ERROR).toUpperCase();

  const spelling = errorSpellings(locale.errors).find((candidate) =>
    upper.startsWith(candidate.text),
  );

  return spelling === undefined
    ? undefined
    : { token: token('error', spelling.code, at), next: at + spelling.text.length };
};

const wordEnd = (source: string, at: number): number => {
  let end = at + 1;

  while (end < source.length && WORD_PART.test(source[end] ?? '')) {
    end += 1;
  }
  return end;
};

type Scan = { readonly token: Token; readonly next: number } | LexFailure;

const bracketEnd = (source: string, at: number): number | undefined => {
  let depth = 0;

  for (let index = at; index < source.length; index += 1) {
    const char = source[index];

    if (char === "'") {
      index += 1;
    } else if (char === '[') {
      depth += 1;
    } else if (char === ']') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return undefined;
};

const scanStructured = (source: string, at: number, open: number): Scan => {
  const end = bracketEnd(source, open);

  return end === undefined
    ? { position: open }
    : { token: token('structured', source.slice(at, end + 1), at), next: end + 1 };
};

const scanQuoted = (source: string, at: number): Scan => {
  const quote = source[at] ?? '"';
  const end = quotedEnd(source, at, quote);

  if (end === undefined) {
    return { position: at };
  }
  const text = unquote(source.slice(at, end + 1), quote);

  if (quote === '"') {
    return { token: token('string', text, at), next: end + 1 };
  }

  const book = BOOK.exec(text);

  if (source[end + 1] !== '!') {
    return { position: end + 1 };
  }
  return book === null
    ? { token: token('sheet', text, at), next: end + 2 }
    : {
        token: token('sheet', text.slice(book[0].length), at, Number(book[1])),
        next: end + 2,
      };
};

const scanBook = (source: string, at: number): Scan | undefined => {
  const book = BOOK.exec(source.slice(at, at + LONGEST_BOOK));
  const after = book === null ? at : at + book[0].length;

  if (book === null) {
    return undefined;
  }
  if (source[after] === '!') {
    return { token: token('sheet', '', at, Number(book[1])), next: after + 1 };
  }

  const end = WORD_START.test(source[after] ?? '') ? wordEnd(source, after) : after;

  return end > after && source[end] === '!'
    ? { token: token('sheet', source.slice(after, end), at, Number(book[1])), next: end + 1 }
    : undefined;
};

const scanWord = (source: string, at: number): Scan => {
  const end = wordEnd(source, at);
  const text = source.slice(at, end);

  if (source[end] === '[') {
    return scanStructured(source, at, end);
  }
  return source[end] === '!'
    ? { token: token('sheet', text, at), next: end + 1 }
    : { token: token('word', text, at), next: end };
};

const scanSymbol = (source: string, at: number, locale: FormulaLocale): Scan => {
  const char = source[at] ?? '';
  const operator = OPERATORS.find((candidate) => source.startsWith(candidate, at));

  if (char === '[') {
    return scanBook(source, at) ?? scanStructured(source, at, at);
  }
  if (char === '#') {
    return errorAt(source, at, locale) ?? { token: token('hash', '#', at), next: at + 1 };
  }
  if (operator !== undefined) {
    return { token: token('op', operator, at), next: at + operator.length };
  }
  return PUNCTUATION.has(char)
    ? { token: token('punct', char, at), next: at + 1 }
    : { position: at };
};

const scanAt = (source: string, at: number, locale: FormulaLocale): Scan => {
  const char = source[at] ?? '';

  const number =
    DIGIT.test(char) || char === locale.decimal ? numberAt(source, at, locale) : undefined;

  if (number !== undefined) {
    return { token: number, next: at + number.text.length };
  }
  if (char === '"' || char === "'") {
    return scanQuoted(source, at);
  }
  return WORD_START.test(char) ? scanWord(source, at) : scanSymbol(source, at, locale);
};

export const tokenize = (source: string, locale: FormulaLocale): Token[] | LexFailure => {
  const tokens: Token[] = [];
  let at = 0;

  while (at < source.length) {
    if (SPACE.test(source[at] ?? '')) {
      at += 1;
    } else {
      const scanned = scanAt(source, at, locale);

      if (!('token' in scanned)) {
        return scanned;
      }
      tokens.push(scanned.token);
      at = scanned.next;
    }
  }
  tokens.push(token('end', '', source.length));
  return tokens;
};
