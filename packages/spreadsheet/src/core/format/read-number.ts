import { FormatChar, type NumberLocale } from './format.types';
import { currencyFormat } from './number-locale';
import { UnaryOperator } from '../formula/formula.types';

export interface ReadNumber {
  readonly value: number;
  readonly format: string | undefined;
}

interface Body {
  readonly value: number;
  readonly decimals: number;
  readonly grouped: boolean;
  readonly exponent: boolean;
}

interface Marks {
  readonly text: string;
  readonly negative: boolean;
  readonly percent: boolean;
  readonly currency: boolean;
}

const SPACES = new Set([' ', ' ', ' ']);

const FRACTION = /^(\d+)\s+(\d+)\/(\d+)$/u;

const escaped = (char: string): string => char.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');

const bodyPatterns = new Map<NumberLocale, RegExp>();

const bodyPattern = (locale: NumberLocale): RegExp => {
  const known = bodyPatterns.get(locale);

  if (known !== undefined) {
    return known;
  }

  const group = SPACES.has(locale.group) ? '[ \\u00a0\\u202f]' : escaped(locale.group);
  const decimal = escaped(locale.decimal);

  const pattern = new RegExp(
    `^(\\d{1,3}(?:${group}\\d{3})+|\\d*)(?:${decimal}(\\d*))?(?:[eE]([+-]?\\d+))?$`,
    'u',
  );

  bodyPatterns.set(locale, pattern);
  return pattern;
};

const readBody = (text: string, locale: NumberLocale): Body | undefined => {
  const found = bodyPattern(locale).exec(text);
  const whole = found?.[1] ?? '';
  const fraction = found?.[2] ?? '';

  if (found === null || (whole === '' && fraction === '')) {
    return undefined;
  }

  const digits = whole.replaceAll(/\D/gu, '');

  return {
    value: Number(`${digits === '' ? '0' : digits}.${fraction}e${found[3] ?? '0'}`),
    decimals: fraction.length,
    grouped: digits.length !== whole.length,
    exponent: found[3] !== undefined,
  };
};

const withoutSign = (text: string): readonly [string, boolean] => {
  const sign = text.charAt(0);

  return sign === FormatChar.Minus || sign === FormatChar.Plus
    ? [text.slice(1).trim(), sign === UnaryOperator.Minus]
    : [text, false];
};

const withoutCurrency = (text: string, locale: NumberLocale): readonly [string, boolean] => {
  for (const symbol of locale.currencySymbols) {
    if (text.startsWith(symbol)) {
      return [text.slice(symbol.length).trim(), true];
    }
    if (text.endsWith(symbol)) {
      return [text.slice(0, -symbol.length).trim(), true];
    }
  }
  return [text, false];
};

const marksOf = (raw: string, locale: NumberLocale): Marks => {
  const trimmed = raw.trim();
  const bracketed = trimmed.startsWith('(') && trimmed.endsWith(')');
  const [signed, leadingMinus] = withoutSign(bracketed ? trimmed.slice(1, -1).trim() : trimmed);
  const [plain, currency] = withoutCurrency(signed, locale);
  const [unsigned, innerMinus] = withoutSign(plain);
  const percent = unsigned.endsWith('%');

  return {
    text: percent ? unsigned.slice(0, -1).trim() : unsigned,
    negative: bracketed || leadingMinus || innerMinus,
    percent,
    currency,
  };
};

const formatOf = (body: Body, marks: Marks, locale: NumberLocale): string | undefined => {
  const decimals = body.decimals > 0 ? 2 : 0;

  if (body.exponent) {
    return '0.00E+00';
  }
  if (marks.percent) {
    return decimals > 0 ? '0.00%' : '0%';
  }
  if (marks.currency) {
    return currencyFormat(locale, decimals);
  }
  if (body.grouped) {
    return decimals > 0 ? '#,##0.00' : '#,##0';
  }
  return undefined;
};

const readFraction = (text: string): ReadNumber | undefined => {
  const found = FRACTION.exec(text);
  const denominator = Number(found?.[3]);

  if (found === null || denominator === 0) {
    return undefined;
  }
  return {
    value: Number(found[1]) + Number(found[2]) / denominator,
    format: denominator >= 10 ? '# ??/??' : '# ?/?',
  };
};

export const readNumberText = (raw: string, locale: NumberLocale): ReadNumber | undefined => {
  const marks = marksOf(raw, locale);
  const body = readBody(marks.text, locale);

  if (body === undefined) {
    const fraction = marks.percent || marks.currency ? undefined : readFraction(marks.text);

    return fraction === undefined
      ? undefined
      : { value: marks.negative ? -fraction.value : fraction.value, format: fraction.format };
  }

  const scaled = marks.percent ? body.value / 100 : body.value;

  return { value: marks.negative ? -scaled : scaled, format: formatOf(body, marks, locale) };
};
