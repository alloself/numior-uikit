import type { TimeUnit } from './chart.types';

export type NumberStyle = 'plain' | 'compact' | 'percent';

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

const COMPACT_FROM = 10_000;

const fractionDigits = (step: number): number => {
  const text = String(Number(step.toPrecision(12)));
  const point = text.indexOf('.');

  return point < 0 ? 0 : text.length - point - 1;
};

export const estimateWidth = (text: string, fontSize: number): number =>
  text.length * fontSize * 0.6;

export const numberStyle = (largest: number, percent: boolean): NumberStyle => {
  if (percent) {
    return 'percent';
  }
  return largest >= COMPACT_FROM ? 'compact' : 'plain';
};

const numberOptions = (step: number, style: NumberStyle): Intl.NumberFormatOptions => {
  switch (style) {
    case 'percent':
      return { style: 'percent', maximumFractionDigits: Math.max(fractionDigits(step) - 2, 0) };
    case 'compact':
      return { notation: 'compact', maximumFractionDigits: 1 };
    default:
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
    const options = numberOptions(step, style);

    return cached(
      numberFormats,
      `${locale}|${JSON.stringify(options)}`,
      () => new Intl.NumberFormat(locale, options),
    ).format(value);
  };

export const timeFormatter =
  (locale: string) =>
  (value: number, unit: TimeUnit): string =>
    cached(
      dateFormats,
      `${locale}|${unit}`,
      () => new Intl.DateTimeFormat(locale, { ...TIME_PARTS[unit], timeZone: 'UTC' }),
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
