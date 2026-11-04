import { describe, expect, it } from 'vite-plus/test';
import {
  clampNumber,
  decimalPlaces,
  formatNumber,
  isPartialNumber,
  numberSymbols,
  parseNumber,
  snapToStep,
  stepNumber,
  withStepPrecision,
} from '../src';

const EUR = { style: 'currency', currency: 'EUR' } as const;
const PERCENT = { style: 'percent' } as const;

describe('number formatting and parsing', () => {
  it('formats through Intl and returns an empty string for missing values', () => {
    expect(formatNumber(1234.5, 'en-US')).toBe('1,234.5');
    expect(formatNumber(1234.5, 'de-DE')).toBe('1.234,5');
    expect(formatNumber(1234.5, 'de-DE', EUR)).toMatch(/^1\.234,50\s€$/);
    expect(formatNumber(0.26, 'en-US', PERCENT)).toBe('26%');
    expect(formatNumber(null, 'en-US')).toBe('');
    expect(formatNumber(Number.NaN, 'en-US')).toBe('');
  });

  it('parses locale separators, spaces, foreign digits and sign forms', () => {
    expect(parseNumber('1,234.5', 'en-US')).toBe(1234.5);
    expect(parseNumber('1.234,5', 'de-DE')).toBe(1234.5);
    expect(parseNumber('1 234,5', 'fr-FR')).toBe(1234.5);
    expect(parseNumber('1 234,5', 'fr-FR')).toBe(1234.5);
    expect(parseNumber('١٬٢٣٤٫٥', 'ar-EG')).toBe(1234.5);
    expect(parseNumber(formatNumber(-1234.5, 'ar-EG'), 'ar-EG')).toBe(-1234.5);
    expect(parseNumber('−12', 'en-US')).toBe(-12);
    expect(parseNumber('(12)', 'en-US')).toBe(-12);
    expect(parseNumber('26%', 'en-US', PERCENT)).toBe(0.26);
    expect(parseNumber('', 'en-US')).toBeNull();
    expect(parseNumber('abc', 'en-US')).toBeNull();
    expect(parseNumber('1.2.3', 'en-US')).toBeNull();
    expect(parseNumber('1,5', 'en-US')).toBe(15);
  });

  it('round-trips formatted values across locales and styles', () => {
    const matrix = [
      ['en-US', undefined],
      ['de-DE', undefined],
      ['fr-FR', EUR],
      ['ar-EG', undefined],
      ['hi-IN', { numberingSystem: 'deva' }],
      ['en-US', PERCENT],
    ] as const;

    for (const [locale, options] of matrix) {
      for (const value of [0, -0.5, 1234.5678, 1e6]) {
        const text = formatNumber(value, locale, options);
        const expected = parseNumber(formatNumber(value, 'en-US', options), 'en-US', options);
        expect(parseNumber(text, locale, options)).toBe(expected);
      }
    }
  });

  it('exposes the locale symbols used by the input filter', () => {
    const arabic = numberSymbols('ar-EG');
    expect(arabic.digits).toEqual(['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']);

    const german = numberSymbols('de-DE', EUR);
    expect(german.decimal).toBe(',');
    expect(german.group).toBe('.');
    expect(german.literals).toContain('€');
    expect(numberSymbols('en-US', PERCENT).literals).toContain('%');
    expect(isPartialNumber('-1,2', german)).toBe(true);
    expect(isPartialNumber('x', german)).toBe(false);
  });

  it('steps on an exact grid without floating drift and clamps to the bounds', () => {
    expect(stepNumber(0.7, 1, { step: 0.1 })).toBe(0.8);
    expect(stepNumber(0.3, -1, { step: 0.1 })).toBe(0.2);
    expect(stepNumber(null, 1, { step: 1 })).toBe(1);
    expect(stepNumber(null, 1, { step: 1, min: 3 })).toBe(3);
    expect(stepNumber(null, -1, { step: 1, min: 0 })).toBe(0);
    expect(stepNumber(2.5, 1, { step: 1 })).toBe(3);
    expect(stepNumber(2.5, -1, { step: 1 })).toBe(2);
    expect(stepNumber(9.5, 10, { step: 0.1, max: 10 })).toBe(10);
    expect(snapToStep(7, 5, 1)).toBe(6);
    expect(clampNumber(5, 10, 20)).toBe(10);
    expect(decimalPlaces(1e-7)).toBe(7);
    expect(decimalPlaces(0.001)).toBe(3);
    expect(withStepPrecision(undefined, 0.0001)).toEqual({ maximumFractionDigits: 4 });

    expect(withStepPrecision({ maximumFractionDigits: 1 }, 0.0001)).toEqual({
      maximumFractionDigits: 1,
    });

    expect(withStepPrecision(EUR, 0.001)).toBe(EUR);
  });
});
