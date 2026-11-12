import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vite-plus/test';
import {
  EN_NUMBERS,
  EMPTY,
  RU_NUMBERS,
  booleanValue,
  builtinFormat,
  errorValue,
  formatColor,
  formatValue,
  isCellError,
  numberValue,
  textValue,
  type CellValue,
  type FormatFill,
} from '../src/core';

interface FormatCase {
  readonly code: string;
  readonly value: CellValue;
  readonly locale: 'en' | 'ru';
  readonly text: string;
  readonly color: number | undefined;
  readonly fill: FormatFill | undefined;
}

const BUDGET_MS = 100;

const BUDGET_CELLS = 20_000;

const BUDGET_CODES = ['General', '#,##0.00', '0.00%'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const cellOf = (value: unknown): CellValue => {
  if (typeof value === 'number') {
    return numberValue(value);
  }
  if (typeof value === 'string') {
    return textValue(value);
  }
  if (typeof value === 'boolean') {
    return booleanValue(value);
  }
  if (isRecord(value) && typeof value.error === 'string' && isCellError(value.error)) {
    return errorValue(value.error);
  }
  return EMPTY;
};

const fillOf = (value: unknown): FormatFill | undefined =>
  isRecord(value) && typeof value.char === 'string' && typeof value.at === 'number'
    ? { char: value.char, at: value.at }
    : undefined;

const caseOf = (entry: unknown, index: number): FormatCase => {
  if (!isRecord(entry) || typeof entry.code !== 'string' || typeof entry.text !== 'string') {
    throw new Error(`formats.json case ${String(index)} needs a code and a text`);
  }
  return {
    code: entry.code,
    value: cellOf(entry.value),
    locale: entry.locale === 'ru' ? 'ru' : 'en',
    text: entry.text,
    color: typeof entry.color === 'number' ? entry.color : undefined,
    fill: fillOf(entry.fill),
  };
};

const corpus = (): FormatCase[] => {
  const parsed: unknown = JSON.parse(
    readFileSync(new URL('./corpus/formats/formats.json', import.meta.url), 'utf8'),
  );

  const cases = isRecord(parsed) && Array.isArray(parsed.cases) ? parsed.cases : [];

  return cases.map(caseOf);
};

describe('number format corpus', () => {
  it.each(corpus().map((entry) => [`${entry.code} · ${entry.text}`, entry] as const))(
    '%s',
    (_name, entry) => {
      const shown = formatValue(
        entry.value,
        entry.code,
        entry.locale === 'ru' ? RU_NUMBERS : EN_NUMBERS,
      );

      expect(shown).toEqual({ text: entry.text, color: entry.color, fill: entry.fill });
    },
  );
});

describe('built-in formats and colours', () => {
  it('resolves locale-dependent built-in ids through the locale', () => {
    expect(builtinFormat(14, EN_NUMBERS)).toBe('m/d/yyyy');
    expect(builtinFormat(14, RU_NUMBERS)).toBe('dd.mm.yyyy');
    expect(builtinFormat(22, RU_NUMBERS)).toBe('dd.mm.yyyy h:mm');
    expect(builtinFormat(7, RU_NUMBERS)).toBe('#,##0.00\\ "₽";-#,##0.00\\ "₽"');
    expect(builtinFormat(49, EN_NUMBERS)).toBe('@');
    expect(builtinFormat(200, EN_NUMBERS)).toBeUndefined();
  });

  it('maps palette indices to colours', () => {
    expect(formatColor(3)).toBe('#FF0000');
    expect(formatColor(57)).toBeUndefined();
  });
});

describe('cost', () => {
  it('formats twenty thousand numbers in three common formats within the budget', () => {
    const values = Array.from({ length: BUDGET_CELLS }, (_, index) =>
      numberValue(index * 37.31 - 400_000),
    );

    const formatAll = (): number =>
      BUDGET_CODES.reduce(
        (total, code) =>
          values.reduce(
            (sum, value) => sum + formatValue(value, code, RU_NUMBERS).text.length,
            total,
          ),
        0,
      );

    formatAll();

    const started = performance.now();
    const length = formatAll();
    const spent = performance.now() - started;

    expect(length).toBeGreaterThan(0);
    expect(spent).toBeLessThan(BUDGET_MS);
  });
});
