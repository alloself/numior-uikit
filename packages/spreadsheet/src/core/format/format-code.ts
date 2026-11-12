import {
  DateUnit,
  FormatChar,
  FormatTokenKind,
  SectionKind,
  type FormatCondition,
  type FormatSection,
  type FormatToken,
  type NumberFormat,
  type NumberLocale,
} from './format.types';
import { numberLocaleOf } from './number-locale';
import { BinaryOperator, UnaryOperator } from '../formula/formula.types';

interface Draft {
  readonly tokens: FormatToken[];
  condition: FormatCondition | undefined;
  color: number | undefined;
  locale: NumberLocale | undefined;
  system: 'date' | 'time' | undefined;
}

const COLORS: Readonly<Record<string, number>> = {
  black: 1,
  white: 2,
  red: 3,
  green: 4,
  blue: 5,
  yellow: 6,
  magenta: 7,
  cyan: 8,
};

const CONDITION = /^(<=|>=|<>|<|>|=)\s*(-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)$/iu;

const PALETTE_INDEX = /^color\s*(\d{1,2})$/iu;

const CURRENCY = /^\$([^-]*)(?:-([0-9a-f]+))?$/iu;

const ELAPSED = /^(h+|m+|s+)$/iu;

const SYSTEM_DATE = 0xf800;

const SYSTEM_TIME = 0xf400;

const CACHE_LIMIT = 1000;

const DATE_LETTERS: Readonly<Record<string, DateUnit>> = {
  y: 'year',
  e: 'year',
  m: 'month',
  d: 'day',
  h: 'hour',
  s: 'second',
};

const ELAPSED_UNITS: Readonly<Record<string, DateUnit>> = {
  h: 'hours',
  m: 'minutes',
  s: 'seconds',
};

const SIMPLE: Readonly<Record<string, FormatToken>> = {
  '0': { kind: 'digit', char: '0' },
  '#': { kind: 'digit', char: '#' },
  '?': { kind: 'digit', char: '?' },
  '.': { kind: 'point' },
  ',': { kind: 'comma' },
  '%': { kind: 'percent' },
  '/': { kind: 'slash' },
  '@': { kind: 'text' },
};

const GENERAL_TOKEN: FormatToken = { kind: 'general' };

const cache = new Map<string, NumberFormat>();

const literal = (text: string): FormatToken => ({ kind: 'literal', text });

const splitSections = (code: string): string[] => {
  const sections: string[] = [];
  let current = '';
  let quoted = false;
  let bracket = false;

  for (let index = 0; index < code.length; index += 1) {
    const char = code.charAt(index);

    if (char === FormatChar.Backslash && !quoted) {
      current += char + code.charAt(index + 1);
      index += 1;
    } else if (char === FormatChar.Semicolon && !quoted && !bracket) {
      sections.push(current);
      current = '';
    } else {
      quoted = char === FormatChar.Quote ? !quoted : quoted;

      bracket = quoted
        ? bracket
        : (char === FormatChar.OpenBracket || bracket) && char !== FormatChar.CloseBracket;

      current += char;
    }
  }
  sections.push(current);
  return sections;
};

const readCondition = (content: string): FormatCondition | undefined => {
  const found = CONDITION.exec(content);
  const op = found?.[1];

  switch (op) {
    case BinaryOperator.Less:
    case BinaryOperator.LessOrEqual:
    case BinaryOperator.Greater:
    case BinaryOperator.GreaterOrEqual:
    case BinaryOperator.Equal:
    case BinaryOperator.NotEqual:
      return { op, value: Number(found?.[2]) };
    default:
      return undefined;
  }
};

const readColor = (content: string): number | undefined => {
  const named = COLORS[content.toLowerCase()];

  if (named !== undefined) {
    return named;
  }

  const index = Number(PALETTE_INDEX.exec(content)?.[1]);

  return index >= 1 && index <= 56 ? index : undefined;
};

const readCurrency = (content: string, draft: Draft): boolean => {
  const found = CURRENCY.exec(content);

  if (found === null) {
    return false;
  }

  const symbol = found[1] ?? '';
  const lcid = found[2] === undefined ? undefined : Number.parseInt(found[2], 16);

  if (symbol !== '') {
    draft.tokens.push(literal(symbol));
  }
  if (lcid === SYSTEM_DATE || lcid === SYSTEM_TIME) {
    draft.system = lcid === SYSTEM_DATE ? 'date' : 'time';
  } else if (lcid !== undefined) {
    draft.locale = numberLocaleOf(lcid) ?? draft.locale;
  }
  return true;
};

const readBracket = (content: string, draft: Draft): void => {
  const elapsed = ELAPSED.exec(content)?.[1];

  if (elapsed !== undefined) {
    const unit = ELAPSED_UNITS[elapsed.charAt(0).toLowerCase()] ?? 'hours';

    draft.tokens.push({ kind: 'date', unit, width: elapsed.length, code: `[${elapsed}]` });
    return;
  }
  if (readCurrency(content, draft)) {
    return;
  }
  draft.condition = readCondition(content) ?? draft.condition;
  draft.color = readColor(content) ?? draft.color;
};

const runLength = (section: string, from: number): number => {
  const letter = section.charAt(from).toLowerCase();
  let end = from;

  while (section.charAt(end).toLowerCase() === letter) {
    end += 1;
  }
  return end - from;
};

const startsWith = (section: string, at: number, word: string): boolean =>
  section.slice(at, at + word.length).toLowerCase() === word.toLowerCase();

const wordToken = (section: string, at: number): readonly [FormatToken, number] | undefined => {
  if (startsWith(section, at, 'am/pm')) {
    return [{ kind: 'date', unit: 'ampm', width: 5, code: section.slice(at, at + 5) }, 5];
  }
  if (startsWith(section, at, 'a/p')) {
    return [{ kind: 'date', unit: 'ampm', width: 3, code: section.slice(at, at + 3) }, 3];
  }
  if (startsWith(section, at, 'general')) {
    return [{ kind: 'general' }, 7];
  }
  return undefined;
};

const letterToken = (section: string, at: number): readonly [FormatToken, number] | undefined => {
  const char = section.charAt(at);
  const next = section.charAt(at + 1);

  if (
    (char === FormatChar.ExponentUpper || char === FormatChar.ExponentLower) &&
    (next === FormatChar.Plus || next === FormatChar.Minus)
  ) {
    return [{ kind: 'exponent', plus: next === UnaryOperator.Plus }, 2];
  }

  const unit = DATE_LETTERS[char.toLowerCase()];

  if (unit === undefined) {
    return wordToken(section, at);
  }

  const width = runLength(section, at);

  return [
    {
      kind: 'date',
      unit,
      width: unit === DateUnit.Year && char.toLowerCase() === FormatChar.ExponentLower ? 4 : width,
      code: section.slice(at, at + width),
    },
    width,
  ];
};

const closing = (section: string, from: number, char: string): number => {
  const end = section.indexOf(char, from + 1);

  return end < 0 ? section.length : end;
};

const escapeToken = (section: string, at: number, draft: Draft): number | undefined => {
  const char = section.charAt(at);
  const next = section.charAt(at + 1);

  switch (char) {
    case FormatChar.Quote: {
      const end = closing(section, at, '"');

      draft.tokens.push(literal(section.slice(at + 1, end)));
      return end + 1;
    }
    case FormatChar.OpenBracket: {
      const end = closing(section, at, ']');

      readBracket(section.slice(at + 1, end), draft);
      return end + 1;
    }
    case FormatChar.Backslash:
      draft.tokens.push(literal(next));
      return at + 2;
    case FormatChar.Underscore:
      draft.tokens.push(literal(' '));
      return at + 2;
    case FormatChar.Asterisk:
      draft.tokens.push({ kind: 'fill', char: next });
      return at + 2;
    default:
      return undefined;
  }
};

const tokenize = (section: string): Draft => {
  const draft: Draft = {
    tokens: [],
    condition: undefined,
    color: undefined,
    locale: undefined,
    system: undefined,
  };

  let at = 0;

  while (at < section.length) {
    const escaped = escapeToken(section, at, draft);

    if (escaped !== undefined) {
      at = escaped;
      continue;
    }

    const char = section.charAt(at);
    const simple = SIMPLE[char];
    const word = simple === undefined ? letterToken(section, at) : undefined;

    draft.tokens.push(simple ?? word?.[0] ?? literal(char));
    at += word?.[1] ?? 1;
  }
  return draft;
};

const isDate = (
  token: FormatToken | undefined,
): token is Extract<FormatToken, { kind: typeof FormatTokenKind.Date }> =>
  token?.kind === FormatTokenKind.Date;

const neighbourUnit = (
  tokens: readonly FormatToken[],
  from: number,
  step: -1 | 1,
): DateUnit | undefined => {
  for (let index = from + step; index >= 0 && index < tokens.length; index += step) {
    const token = tokens[index];

    if (isDate(token)) {
      return token.unit;
    }
  }
  return undefined;
};

const asMinute = (tokens: readonly FormatToken[], index: number): boolean => {
  const before = neighbourUnit(tokens, index, -1);
  const after = neighbourUnit(tokens, index, 1);

  return (
    before === DateUnit.Hour ||
    before === DateUnit.Hours ||
    after === DateUnit.Second ||
    after === DateUnit.Seconds
  );
};

const resolveMinutes = (tokens: readonly FormatToken[]): FormatToken[] =>
  tokens.map((token, index) =>
    isDate(token) && token.unit === DateUnit.Month && token.width <= 2 && asMinute(tokens, index)
      ? { ...token, unit: 'minute' }
      : token,
  );

const plainText = (token: FormatToken): string => {
  switch (token.kind) {
    case FormatTokenKind.Literal:
      return token.text;
    case FormatTokenKind.Digit:
      return token.char;
    case FormatTokenKind.Point:
      return '.';
    case FormatTokenKind.Comma:
      return ',';
    case FormatTokenKind.Percent:
      return '%';
    case FormatTokenKind.Slash:
      return '/';
    case FormatTokenKind.Exponent:
      return token.plus ? 'E+' : 'E-';
    default:
      return '';
  }
};

const subsecondWidth = (tokens: readonly FormatToken[], from: number): number => {
  let width = 0;

  while (tokens[from + width]?.kind === FormatTokenKind.Digit) {
    width += 1;
  }
  return width;
};

const dateTokens = (tokens: readonly FormatToken[]): FormatToken[] => {
  const result: FormatToken[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const width = token?.kind === FormatTokenKind.Point ? subsecondWidth(tokens, index + 1) : 0;

    if (width > 0) {
      result.push({ kind: 'date', unit: 'subsecond', width, code: '.' });
      index += width;
    } else if (token !== undefined) {
      result.push(
        token.kind === FormatTokenKind.Date || token.kind === FormatTokenKind.Fill
          ? token
          : literal(plainText(token)),
      );
    }
  }
  return result;
};

const strayInDate = (tokens: readonly FormatToken[]): boolean =>
  tokens.some((token, index) => {
    switch (token.kind) {
      case FormatTokenKind.Digit: {
        const before = tokens[index - 1]?.kind;

        return before !== FormatTokenKind.Point && before !== FormatTokenKind.Digit;
      }
      case FormatTokenKind.Text:
      case FormatTokenKind.General:
        return true;
      default:
        return false;
    }
  });

const kindOf = (tokens: readonly FormatToken[]): SectionKind => {
  if (tokens.some((token) => token.kind === FormatTokenKind.Date)) {
    return strayInDate(tokens) ? 'invalid' : 'date';
  }
  if (
    tokens.some(
      (token) => token.kind === FormatTokenKind.Digit || token.kind === FormatTokenKind.General,
    )
  ) {
    return 'number';
  }
  return tokens.some((token) => token.kind === FormatTokenKind.Text) ? 'text' : 'literal';
};

const compileSection = (section: string): FormatSection => {
  const draft = tokenize(section);

  const bare =
    draft.tokens.length === 0 && (draft.condition !== undefined || draft.color !== undefined);

  const tokens = bare ? [GENERAL_TOKEN] : resolveMinutes(draft.tokens);
  const kind = draft.system === undefined ? kindOf(tokens) : 'date';

  return {
    kind,
    tokens: kind === SectionKind.Date ? dateTokens(tokens) : tokens,
    condition: draft.condition,
    color: draft.color,
    locale: draft.locale,
    system: draft.system,
  };
};

export const parseNumberFormat = (code: string): NumberFormat => {
  const known = cache.get(code);

  if (known !== undefined) {
    return known;
  }
  if (cache.size >= CACHE_LIMIT) {
    cache.clear();
  }

  const parsed = { code, sections: splitSections(code).slice(0, 4).map(compileSection) };

  cache.set(code, parsed);
  return parsed;
};
