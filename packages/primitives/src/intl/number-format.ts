import { graphemesOf } from './graphemes';
import { decimalPlaces } from './number-step';

export interface NumberSymbols {
  readonly decimal: string;
  readonly group: string;
  readonly minus: string;
  readonly digits: readonly string[];
  readonly literals: string;
}

const formatters = new Map<string, Intl.NumberFormat>();
const BIDI_MARKS = /[؜‎‏‪-‮]/g;
const LITERAL_PARTS = new Set(['currency', 'percentSign', 'literal', 'unit', 'plusSign']);

const PRECISION_KEYS = [
  'minimumFractionDigits',
  'maximumFractionDigits',
  'minimumSignificantDigits',
  'maximumSignificantDigits',
] as const;

export const formatterFor = (
  locale: string,
  options?: Intl.NumberFormatOptions,
): Intl.NumberFormat => {
  const key = `${locale}|${JSON.stringify(options ?? {})}`;
  const cached = formatters.get(key);
  if (cached) {
    return cached;
  }
  const formatter = new Intl.NumberFormat(locale, options);
  formatters.set(key, formatter);
  return formatter;
};

const partValue = (parts: readonly Intl.NumberFormatPart[], type: string): string | undefined =>
  parts.find((part) => part.type === type)?.value;

export const numberSymbols = (
  locale: string,
  options?: Intl.NumberFormatOptions,
): NumberSymbols => {
  const formatter = formatterFor(locale, options);
  const numberingSystem = formatter.resolvedOptions().numberingSystem;

  const decimalParts = formatterFor(locale, {
    numberingSystem,
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).formatToParts(-1234567.8);

  const digitFormatter = formatterFor(locale, {
    numberingSystem,
    useGrouping: false,
    maximumFractionDigits: 0,
  });

  return {
    decimal: partValue(decimalParts, 'decimal') ?? '.',
    group: partValue(decimalParts, 'group') ?? ',',
    minus: partValue(decimalParts, 'minusSign') ?? '-',
    digits: Array.from({ length: 10 }, (_, digit) => digitFormatter.format(digit)),
    literals: formatter
      .formatToParts(-1234.5)
      .filter((part) => LITERAL_PARTS.has(part.type))
      .map((part) => part.value)
      .join(''),
  };
};

export const formatNumber = (
  value: number | null,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string =>
  value === null || !Number.isFinite(value) ? '' : formatterFor(locale, options).format(value);

const roundTo = (value: number, places: number): number => {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
};

const asciiDigits = (text: string, symbols: NumberSymbols): string => {
  let ascii = '';
  for (const char of text) {
    const digit = symbols.digits.indexOf(char);
    if (digit >= 0) {
      ascii += String(digit);
    } else if (char === symbols.decimal || (char === '.' && symbols.group !== '.')) {
      ascii += '.';
    } else if (char >= '0' && char <= '9') {
      ascii += char;
    }
  }
  return ascii;
};

const isNegative = (text: string, symbols: NumberSymbols): boolean =>
  text.includes(symbols.minus) || text.includes('-') || text.includes('−') || text.startsWith('(');

export const parseNumber = (
  text: string,
  locale: string,
  options?: Intl.NumberFormatOptions,
): number | null => {
  const symbols = numberSymbols(locale, options);
  const cleaned = text.replace(BIDI_MARKS, '').trim();
  const ascii = asciiDigits(cleaned, symbols);
  if (ascii === '' || ascii === '.' || ascii.indexOf('.') !== ascii.lastIndexOf('.')) {
    return null;
  }
  const magnitude = Number(ascii);
  if (!Number.isFinite(magnitude)) {
    return null;
  }
  const signed = isNegative(cleaned, symbols) ? -magnitude : magnitude;
  const resolved = formatterFor(locale, options).resolvedOptions();
  if (resolved.style === 'percent') {
    return roundTo(signed / 100, (resolved.maximumFractionDigits ?? 0) + 2);
  }
  return signed;
};

export const isPartialNumber = (text: string, symbols: NumberSymbols): boolean => {
  const allowed = new Set([
    ...symbols.digits,
    ...graphemesOf('0123456789'),
    symbols.decimal,
    symbols.group,
    ...graphemesOf('.,-−+   ()'),
    ...graphemesOf(symbols.literals),
  ]);

  return graphemesOf(text).every((char) => allowed.has(char));
};

export const withStepPrecision = (
  options: Intl.NumberFormatOptions | undefined,
  step: number,
): Intl.NumberFormatOptions => {
  const explicit =
    options !== undefined &&
    (PRECISION_KEYS.some((key) => options[key] !== undefined) || options.style === 'currency');

  if (explicit) {
    return options;
  }
  return { ...options, maximumFractionDigits: Math.max(3, decimalPlaces(step)) };
};
