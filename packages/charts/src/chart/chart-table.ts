import type { ChartSpec, ChartValue } from '../core';
import { ChartCategoriesKind, TimeContext } from '../core/chart.types';
import { timeFormatter } from '../core/format';
import { timeGrain } from '../core/time';
import { timeZoneOf } from '../core/zone';
import type { CategoryName } from './chart.types';

const numbers = new Map<string, Intl.NumberFormat>();

const MISSING = '—';

const numberFormat = (locale: string): Intl.NumberFormat => {
  const known = numbers.get(locale) ?? new Intl.NumberFormat(locale);

  numbers.set(locale, known);
  return known;
};

const finiteText = (value: number | undefined, format: (value: number) => string): string =>
  value === undefined || !Number.isFinite(value) ? MISSING : format(value);

export const categoryName = (
  spec: ChartSpec,
  locale: string,
  timeZone: string | undefined,
): CategoryName => {
  const { categories } = spec;

  switch (categories.kind) {
    case ChartCategoriesKind.Text:
      return (index) => categories.labels[index] ?? '';
    case ChartCategoriesKind.Number: {
      const format = numberFormat(locale);

      return (index) => finiteText(categories.values[index], (value) => format.format(value));
    }
    case ChartCategoriesKind.Time: {
      const zone = timeZoneOf(timeZone);
      const { unit } = timeGrain(categories.values, zone);
      const format = timeFormatter(locale, TimeContext.Year, zone.name);

      return (index) => finiteText(categories.values[index], (value) => format(value, unit));
    }
  }
};

export const categoryTexts = (spec: ChartSpec, name: CategoryName): readonly string[] =>
  Array.from(
    {
      length:
        spec.categories.kind === ChartCategoriesKind.Text
          ? spec.categories.labels.length
          : spec.categories.values.length,
    },
    (_unused, index) => name(index),
  );

export const valueText = (value: ChartValue | undefined, locale: string): string =>
  value === null || value === undefined || !Number.isFinite(value)
    ? MISSING
    : numberFormat(locale).format(value);
