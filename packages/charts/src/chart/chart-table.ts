import type { ChartSpec, ChartValue } from '../core';
import { ChartCategoriesKind } from '../core/chart.types';

const numbers = new Map<string, Intl.NumberFormat>();

const dates = new Map<string, Intl.DateTimeFormat>();

const MISSING = '—';

const numberFormat = (locale: string): Intl.NumberFormat => {
  const known = numbers.get(locale) ?? new Intl.NumberFormat(locale);

  numbers.set(locale, known);
  return known;
};

const dateFormat = (locale: string): Intl.DateTimeFormat => {
  const known =
    dates.get(locale) ?? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' });

  dates.set(locale, known);
  return known;
};

export const categoryTexts = (spec: ChartSpec, locale: string): readonly string[] => {
  switch (spec.categories.kind) {
    case ChartCategoriesKind.Text:
      return spec.categories.labels;
    case ChartCategoriesKind.Number:
      return spec.categories.values.map((value) => numberFormat(locale).format(value));
    default:
      return spec.categories.values.map((value) => dateFormat(locale).format(value));
  }
};

export const valueText = (value: ChartValue | undefined, locale: string): string =>
  value === null || value === undefined || !Number.isFinite(value)
    ? MISSING
    : numberFormat(locale).format(value);
