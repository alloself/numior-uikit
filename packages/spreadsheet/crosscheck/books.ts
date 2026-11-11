import {
  EN_LOCALE,
  MAX_COLS,
  MAX_ROWS,
  RU_LOCALE,
  booleanValue,
  createCalculator,
  createWorkbook,
  formatCell,
  numberValue,
  parseCell,
  textValue,
  type BookLocale,
  type Calculator,
  type CellValue,
  type Sheet,
  type Workbook,
} from '@numior/spreadsheet/core';
import type { XlsxRead } from '@numior/spreadsheet/xlsx';
import {
  RESULT,
  agrees,
  wantedGrid,
  type Corpus,
  type CorpusCase,
  type Input,
} from '../test/function-corpus.ts';

export interface Check {
  readonly key: string;
  readonly file: string;
  readonly sheet: string;
  readonly row: number;
  readonly col: number;
  readonly wanted: Input;
  readonly tolerance: number;
}

export interface Mismatch {
  readonly cell: string;
  readonly wanted: Input;
  readonly found: Input | undefined;
}

export interface CaseBook {
  readonly book: Workbook;
  readonly calculator: Calculator;
  readonly checks: readonly Check[];
}

export interface BookCase {
  readonly corpus: Corpus;
  readonly entry: CorpusCase;
  readonly sheet: string;
}

export type Values = ReadonlyMap<string, CellValue>;

type Opened = Extract<XlsxRead, { readonly kind: 'editable' | 'read-only' }>;

const WHOLE = { top: 0, left: 0, bottom: MAX_ROWS - 1, right: MAX_COLS - 1 };

const CLOCK = new Date(2026, 9, 18, 12);

const ERROR_TEXT = /^#[A-Z/0!?]+[!?A]?$/u;

const at = (address: string): { readonly row: number; readonly col: number } => {
  const cell = parseCell(address);

  if (cell === undefined) {
    throw new Error(`${address} is not a cell`);
  }
  return cell;
};

const valueOf = (input: Input): CellValue => {
  switch (typeof input) {
    case 'number':
      return numberValue(input);
    case 'boolean':
      return booleanValue(input);
    default:
      return textValue(input);
  }
};

export const localeOf = (language: 'en' | 'ru'): BookLocale =>
  language === 'ru' ? RU_LOCALE : EN_LOCALE;

const place = (
  calculator: Calculator,
  sheet: Sheet,
  address: string,
  input: Input,
  locale: BookLocale,
): void => {
  const { row, col } = at(address);

  if (typeof input === 'string' && input.startsWith('=')) {
    if (!calculator.setFormula(sheet, row, col, input, locale.formulas).ok) {
      throw new Error(`${input} does not parse`);
    }
    return;
  }
  calculator.setValue(sheet, row, col, valueOf(input));
};

const caseChecks = (item: BookCase, file: string, tolerance: number): Check[] =>
  wantedGrid(item.entry.expected).flatMap((row, rowIndex) =>
    row.map((wanted, colIndex) => ({
      key: `${item.corpus.family}: ${item.entry.formula}`,
      file,
      sheet: item.sheet,
      row: RESULT.row + rowIndex,
      col: RESULT.col + colIndex,
      wanted,
      tolerance: Math.max(item.entry.tolerance, tolerance),
    })),
  );

export const caseBook = (
  cases: readonly BookCase[],
  file: string,
  tolerance: number,
  locale: BookLocale = EN_LOCALE,
): CaseBook => {
  const book = createWorkbook();

  const calculator = createCalculator(book, {
    locale,
    clock: () => CLOCK,
    random: () => 0.5,
  });

  const checks = cases.flatMap((item) => {
    const sheet = book.addSheet(item.sheet);
    const syntax = localeOf(item.entry.locale);

    Object.entries(item.entry.cells).forEach(([address, input]) => {
      place(calculator, sheet, address, input, syntax);
    });

    place(calculator, sheet, formatCell(RESULT), item.entry.formula, syntax);
    return caseChecks(item, file, tolerance);
  });

  calculator.recalculate({ budgetMs: Number.POSITIVE_INFINITY });
  return { book, calculator, checks };
};

export const shownInput = (value: CellValue): Input => {
  switch (value.kind) {
    case 'empty':
      return '';
    case 'error':
      return value.code;
    default:
      return value.value;
  }
};

export const valuesOf = (read: Opened): Values => {
  const values = new Map<string, CellValue>();

  read.book.sheets.forEach((sheet) => {
    sheet.cells.forEachInRange(WHOLE, (row, col, value) => {
      values.set(`${sheet.name}!${formatCell({ row, col })}`, value);
    });
  });

  return values;
};

const isError = (value: Input | undefined): boolean =>
  typeof value === 'string' && ERROR_TEXT.test(value);

const matches = (shown: Input, check: Check, looseErrors: boolean): boolean =>
  agrees(shown, check.wanted, check.tolerance) ||
  (looseErrors && isError(shown) && isError(check.wanted));

const recorded = (found: Map<string, Mismatch[]>, check: Check, shown: Input | undefined): void => {
  const list = found.get(check.key) ?? [];

  list.push({ cell: formatCell(check), wanted: check.wanted, found: shown });
  found.set(check.key, list);
};

const shownAt = (values: Values, check: Check): Input | undefined => {
  const value = values.get(`${check.sheet}!${formatCell(check)}`);

  return value === undefined ? undefined : shownInput(value);
};

const compared = (
  found: Map<string, Mismatch[]>,
  check: Check,
  shown: Input | undefined,
  looseErrors: boolean,
): void => {
  if (shown !== undefined && matches(shown, check, looseErrors)) {
    return;
  }

  recorded(found, check, shown);
};

export const mismatchesOf = async (
  checks: readonly Check[],
  valuesFor: (file: string) => Promise<Values>,
  looseErrors: boolean,
): Promise<Map<string, Mismatch[]>> => {
  const files = new Map<string, Values>();
  const found = new Map<string, Mismatch[]>();

  for (const check of checks) {
    const values = files.get(check.file) ?? (await valuesFor(check.file));

    files.set(check.file, values);
    compared(found, check, shownAt(values, check), looseErrors);
  }
  return found;
};

export const printMismatches = (
  mismatches: Iterable<readonly [string, readonly Mismatch[]]>,
  source: string,
): void => {
  for (const [key, list] of mismatches) {
    console.log(`new  ${key}`);

    for (const item of list) {
      console.log(
        `       ${item.cell}: wanted ${JSON.stringify(item.wanted)}, ${source} ${JSON.stringify(item.found ?? null)}`,
      );
    }
  }
};
