import { clamp } from 'lodash-es';
import { NumberStyle, TimeContext, TimeUnit } from './chart.types';

interface Shape {
  readonly digits: number;
  readonly exponent: number;
}

const ELLIPSIS = '…';

const TIME_PARTS: Readonly<Record<TimeUnit, Intl.DateTimeFormatOptions>> = {
  second: { hour: '2-digit', minute: '2-digit', second: '2-digit' },
  minute: { hour: '2-digit', minute: '2-digit' },
  hour: { hour: '2-digit', minute: '2-digit' },
  day: { day: 'numeric', month: 'short' },
  week: { day: 'numeric', month: 'short' },
  month: { month: 'short', year: 'numeric' },
  year: { year: 'numeric' },
};

const DATED: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };

const YEARED: Intl.DateTimeFormatOptions = { ...DATED, year: 'numeric' };

const TIMED: readonly TimeUnit[] = [TimeUnit.Second, TimeUnit.Minute, TimeUnit.Hour];

const COMPACT_FROM = 10_000;

const SCIENTIFIC_BELOW = 1e-4;

const MOST_DIGITS = 20;

const WHOLE: Shape = { digits: 1, exponent: 0 };

const shapeOf = (value: number): Shape => {
  if (!Number.isFinite(value) || value === 0) {
    return WHOLE;
  }

  const [mantissa = '', exponent = '0'] = Math.abs(value).toExponential(11).split('e');

  return {
    digits: Math.max(mantissa.replace('.', '').replace(/0+$/, '').length, 1),
    exponent: Number(exponent),
  };
};

const fractionDigits = (step: number): number => {
  const { digits, exponent } = shapeOf(step);

  return clamp(digits - 1 - exponent, 0, MOST_DIGITS);
};

const significantDigits = (value: number, step: number): number => {
  const { digits, exponent } = shapeOf(step);

  return clamp(shapeOf(value).exponent - exponent + digits, 1, MOST_DIGITS);
};

export const estimateWidth = (text: string, fontSize: number): number =>
  text.length * fontSize * 0.6;

export const numberStyle = (largest: number, percent: boolean): NumberStyle => {
  if (percent) {
    return NumberStyle.Percent;
  }
  if (largest > 0 && largest < SCIENTIFIC_BELOW) {
    return NumberStyle.Scientific;
  }
  return largest >= COMPACT_FROM ? NumberStyle.Compact : NumberStyle.Plain;
};

const numberOptions = (
  value: number,
  step: number,
  style: NumberStyle,
): Intl.NumberFormatOptions => {
  switch (style) {
    case NumberStyle.Percent:
      return { style: 'percent', maximumFractionDigits: Math.max(fractionDigits(step) - 2, 0) };
    case NumberStyle.Compact:
      return { notation: 'compact', maximumSignificantDigits: significantDigits(value, step) };
    case NumberStyle.Scientific:
      return value === 0
        ? {}
        : { notation: 'scientific', maximumSignificantDigits: significantDigits(value, step) };
    case NumberStyle.Plain:
      return { maximumFractionDigits: fractionDigits(step) };
  }
};

const numberFormats = new Map<string, Intl.NumberFormat>();

const dateFormats = new Map<string, Intl.DateTimeFormat>();

const cached = <T>(cache: Map<string, T>, key: string, create: () => T): T => {
  const known = cache.get(key);

  if (known !== undefined) {
    return known;
  }

  const created = create();

  cache.set(key, created);
  return created;
};

export const numberFormatter =
  (locale: string, style: NumberStyle) =>
  (value: number, step: number): string => {
    const options = numberOptions(value, step, style);

    return cached(
      numberFormats,
      `${locale}|${JSON.stringify(options)}`,
      () => new Intl.NumberFormat(locale, options),
    ).format(value);
  };

const timeParts = (unit: TimeUnit, context: TimeContext): Intl.DateTimeFormatOptions => {
  const parts = TIME_PARTS[unit];

  switch (context) {
    case TimeContext.Year:
      return unit === TimeUnit.Month || unit === TimeUnit.Year ? parts : { ...parts, ...YEARED };
    case TimeContext.Date:
      return TIMED.includes(unit) ? { ...parts, ...DATED } : parts;
    case TimeContext.None:
      return parts;
  }
};

export const timeFormatter =
  (locale: string, context: TimeContext = TimeContext.None) =>
  (value: number, unit: TimeUnit): string =>
    cached(
      dateFormats,
      `${locale}|${unit}|${context}`,
      () => new Intl.DateTimeFormat(locale, { ...timeParts(unit, context), timeZone: 'UTC' }),
    ).format(value);

export const truncated = (
  text: string,
  width: number,
  fontSize: number,
  measure: (text: string, fontSize: number) => number,
): string => {
  if (measure(text, fontSize) <= width) {
    return text;
  }

  let low = 0;
  let high = text.length;

  while (low < high) {
    const middle = Math.ceil((low + high) / 2);

    if (measure(text.slice(0, middle) + ELLIPSIS, fontSize) <= width) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return low === 0 ? ELLIPSIS : text.slice(0, low).trimEnd() + ELLIPSIS;
};
