import type { CellAddress, CellRange, CellValue } from './cell.types';
import type { Calculator } from './calc/calculator';
import { logicalFromText, toText } from './calc/coerce';
import { parseNumberFormat } from './format/format-code';
import { formatValue } from './format/format-value';
import type { FormatToken, FormattedValue, NumberLocale } from './format/format.types';
import { currencyFormat } from './format/number-locale';
import { readValueText } from './format/read-value';
import type { FormulaFailure, FormulaNode } from './formula/formula.types';
import { ORIGIN, referenceRange } from './formula/origin';
import { parseFormula } from './formula/parser';
import { printFormula } from './formula/printer';
import { formulaReferences, mapReferences, type FormulaReference } from './formula/references';
import type { BookLocale } from './locale';
import { booleanValue, numberValue, textValue } from './values';
import { createStepper } from './steps/apply-step';
import type { CellEdit, WorkbookStep } from './steps/step.types';
import type { Sheet, Workbook } from './workbook';

export type CellInput =
  | { readonly kind: 'empty' }
  | { readonly kind: 'formula'; readonly text: string }
  | { readonly kind: 'value'; readonly value: CellValue; readonly format: string | undefined };

export interface NameOptions {
  readonly scope?: Sheet | undefined;
  readonly anchor?: CellAddress | undefined;
  readonly locale?: BookLocale | undefined;
}

export type EntryResult =
  | { readonly ok: true; readonly step: WorkbookStep }
  | { readonly ok: false; readonly error: FormulaFailure };

export interface CellEditor {
  enter(
    sheet: Sheet,
    row: number,
    col: number,
    text: string,
    locale?: BookLocale,
  ): FormulaFailure | undefined;
  input(sheet: Sheet, row: number, col: number, text: string, locale?: BookLocale): EntryResult;
  formatStep(sheet: Sheet, range: CellRange, code: string): WorkbookStep;
  nameStep(name: string, text: string, sheet: Sheet, options?: NameOptions): EntryResult;
  nameText(name: string, scope?: Sheet, anchor?: CellAddress): string | undefined;
  inputText(sheet: Sheet, row: number, col: number): string;
  shown(sheet: Sheet, row: number, col: number): FormattedValue;
  formatAt(sheet: Sheet, row: number, col: number): string;
  setFormat(sheet: Sheet, range: CellRange, code: string): void;
}

const CLOCK = new Set([
  'hour',
  'minute',
  'second',
  'subsecond',
  'ampm',
  'hours',
  'minutes',
  'seconds',
]);

const CALENDAR = new Set(['year', 'month', 'day']);

const TEXT_FORMAT = '@';

const DATE_RESULTS = new Set([
  'DATE',
  'TODAY',
  'EDATE',
  'EOMONTH',
  'WORKDAY',
  'WORKDAY.INTL',
  'DATEVALUE',
]);

const TIME_RESULTS = new Set(['TIME', 'TIMEVALUE']);

const MONEY_RESULTS = new Set([
  'PMT',
  'PV',
  'FV',
  'IPMT',
  'PPMT',
  'NPV',
  'XNPV',
  'CUMIPMT',
  'CUMPRINC',
]);

const RATE_RESULTS = new Set(['RATE', 'IRR', 'XIRR', 'MIRR', 'EFFECT', 'NOMINAL', 'RRI']);

const INHERITING = new Set([
  'SUM',
  'SUMIF',
  'SUMIFS',
  'SUMPRODUCT',
  'AVERAGE',
  'AVERAGEIF',
  'AVERAGEIFS',
  'MIN',
  'MAX',
  'MINIFS',
  'MAXIFS',
  'MEDIAN',
  'LARGE',
  'SMALL',
  'ROUND',
  'ROUNDUP',
  'ROUNDDOWN',
  'MROUND',
  'TRUNC',
  'INT',
  'ABS',
  'CEILING',
  'FLOOR',
  'IF',
  'IFS',
  'IFERROR',
  'IFNA',
  'CHOOSE',
  'INDEX',
  'LOOKUP',
  'VLOOKUP',
  'HLOOKUP',
  'XLOOKUP',
]);

const ARITHMETIC = new Set(['+', '-', '*', '/', '^']);

const inherits = (node: FormulaNode): boolean => {
  switch (node.kind) {
    case 'cell':
    case 'range':
    case 'unary':
    case 'percent':
      return true;
    case 'binary':
      return ARITHMETIC.has(node.op);
    case 'call':
      return INHERITING.has(node.name.toUpperCase());
    default:
      return false;
  }
};

const entry = (sheet: Sheet, cell: CellEdit): EntryResult => ({
  ok: true,
  step: { kind: 'setCells', sheet: sheet.name, cells: [cell] },
});

const plainText = (text: string): CellInput => ({
  kind: 'value',
  value: textValue(text),
  format: undefined,
});

export const readInput = (text: string, locale: NumberLocale): CellInput => {
  if (text === '') {
    return { kind: 'empty' };
  }
  if (text.startsWith("'")) {
    return plainText(text.slice(1));
  }
  if (text.startsWith('=') && text.length > 1) {
    return { kind: 'formula', text };
  }

  const logical = logicalFromText(text.trim(), locale);

  if (logical !== undefined) {
    return { kind: 'value', value: booleanValue(logical), format: undefined };
  }

  const read = readValueText(text, locale);

  return read === undefined
    ? plainText(text)
    : { kind: 'value', value: numberValue(read.value), format: read.format };
};

const unitsOf = (tokens: readonly FormatToken[], units: ReadonlySet<string>): boolean =>
  tokens.some((token) => token.kind === 'date' && units.has(token.unit));

const dateEditText = (
  value: number,
  tokens: readonly FormatToken[],
  locale: NumberLocale,
): string => {
  const calendar = unitsOf(tokens, CALENDAR) || value >= 1;
  const clock = unitsOf(tokens, CLOCK) || !Number.isInteger(value);

  const parts = [
    calendar ? formatValue(numberValue(value), locale.shortDate, locale).text : '',
    clock ? formatValue(numberValue(value), locale.longTime, locale).text : '',
  ];

  return parts.filter((part) => part !== '').join(' ');
};

const numberEditText = (value: number, code: string, locale: NumberLocale): string => {
  const section = parseNumberFormat(code).sections[0];
  const tokens = section?.tokens ?? [];

  if (section?.kind === 'date' && value >= 0) {
    return dateEditText(value, tokens, locale);
  }
  if (tokens.some((token) => token.kind === 'percent')) {
    return `${toText(numberValue(Number((value * 100).toPrecision(15))), locale)}%`;
  }
  return toText(numberValue(value), locale);
};

const sameText = (text: string, locale: NumberLocale): boolean => {
  const input = readInput(text, locale);

  return input.kind === 'value' && input.value.kind === 'string' && input.value.value === text;
};

export const editText = (value: CellValue, code: string, locale: NumberLocale): string => {
  switch (value.kind) {
    case 'number':
      return numberEditText(value.value, code, locale);
    case 'string':
      return code === TEXT_FORMAT || sameText(value.value, locale)
        ? value.value
        : `'${value.value}`;
    case 'boolean':
      return value.value ? locale.trueText : locale.falseText;
    case 'error':
      return value.code;
    case 'empty':
      return '';
  }
};

type CellOrRange = Extract<FormulaReference, { readonly kind: 'cell' | 'range' }>;

const isCellOrRange = (found: FormulaReference): found is CellOrRange =>
  found.kind === 'cell' || found.kind === 'range';

const resultFormat = (node: FormulaNode, locale: NumberLocale): string | undefined => {
  if (node.kind !== 'call') {
    return undefined;
  }

  const name = node.name.toUpperCase();

  if (DATE_RESULTS.has(name)) {
    return locale.shortDate;
  }
  if (name === 'NOW') {
    return `${locale.shortDate} ${locale.shortTime}`;
  }
  if (TIME_RESULTS.has(name)) {
    return locale.shortTime;
  }
  if (MONEY_RESULTS.has(name)) {
    return currencyFormat(locale, 2);
  }
  return RATE_RESULTS.has(name) ? '0%' : undefined;
};

const referencedFormat = (
  node: FormulaNode,
  book: Workbook,
  sheet: Sheet,
  origin: CellAddress,
): string | undefined => {
  const first = inherits(node) ? formulaReferences(node).find(isCellOrRange) : undefined;
  const source = first?.sheet === undefined ? sheet : book.sheet(first.sheet);
  const range = first === undefined ? undefined : referenceRange(first, origin);

  if (range === undefined || source === undefined) {
    return undefined;
  }

  const id = source.formats.get(range.top, range.left);

  return id === 0 ? undefined : book.formats.code(id);
};

const qualified = (ast: FormulaNode, sheet: Sheet): FormulaNode =>
  mapReferences(ast, (reference) =>
    reference.kind === 'name' || reference.sheet !== undefined
      ? reference
      : { ...reference, sheet: sheet.name },
  );

const formatStep = (sheet: Sheet, range: CellRange, code: string): WorkbookStep => ({
  kind: 'setFormat',
  sheet: sheet.name,
  range,
  format: code,
});

export const createCellEditor = (book: Workbook, calculator: Calculator): CellEditor => {
  const stepper = createStepper(book, calculator);

  const formatAt = (sheet: Sheet, row: number, col: number): string =>
    book.formats.code(sheet.formats.get(row, col));

  const formulaEdit = (
    sheet: Sheet,
    position: CellAddress,
    text: string,
    locale: BookLocale,
  ): EntryResult => {
    const parsed = parseFormula(text, locale.formulas, position);

    if (!parsed.ok) {
      return parsed;
    }

    const format =
      sheet.formats.get(position.row, position.col) === 0
        ? (resultFormat(parsed.ast, calculator.locale.numbers) ??
          referencedFormat(parsed.ast, book, sheet, position))
        : undefined;

    return entry(sheet, { ...position, content: { kind: 'formula', ast: parsed.ast }, format });
  };

  const input = (
    sheet: Sheet,
    row: number,
    col: number,
    text: string,
    locale: BookLocale = calculator.locale,
  ): EntryResult => {
    const read =
      formatAt(sheet, row, col) === TEXT_FORMAT && text !== ''
        ? plainText(text)
        : readInput(text, locale.numbers);

    switch (read.kind) {
      case 'empty':
        return entry(sheet, { row, col, content: { kind: 'empty' } });
      case 'formula':
        return formulaEdit(sheet, { row, col }, read.text, locale);
      case 'value':
        return entry(sheet, {
          row,
          col,
          content: { kind: 'value', value: read.value },
          format: read.format,
        });
    }
  };

  const nameStep = (
    name: string,
    text: string,
    sheet: Sheet,
    options: NameOptions = {},
  ): EntryResult => {
    const scope = options.scope?.name;

    if (text.trim() === '') {
      return { ok: true, step: { kind: 'setName', name, scope, ast: undefined } };
    }

    const parsed = parseFormula(
      text,
      (options.locale ?? calculator.locale).formulas,
      options.anchor ?? ORIGIN,
    );

    return parsed.ok
      ? { ok: true, step: { kind: 'setName', name, scope, ast: qualified(parsed.ast, sheet) } }
      : parsed;
  };

  return {
    input,
    nameStep,
    nameText: (name, scope, anchor = ORIGIN) => {
      const defined = book.names.get(name, scope);

      return defined === undefined
        ? undefined
        : `=${printFormula(defined.ast, calculator.locale.formulas, anchor)}`;
    },
    enter: (sheet, row, col, text, locale) => {
      const result = input(sheet, row, col, text, locale);

      if (!result.ok) {
        return result.error;
      }
      stepper.apply(result.step);
      return undefined;
    },
    inputText: (sheet, row, col) => {
      const formula = calculator.formulaAt(sheet, row, col);
      const { locale } = calculator;

      return formula === undefined
        ? editText(sheet.cells.get(row, col), formatAt(sheet, row, col), locale.numbers)
        : `=${printFormula(formula.ast, locale.formulas, { row, col })}`;
    },
    shown: (sheet, row, col) =>
      formatValue(sheet.cells.get(row, col), formatAt(sheet, row, col), calculator.locale.numbers),
    formatAt,
    formatStep,
    setFormat: (sheet, range, code) => {
      stepper.apply(formatStep(sheet, range, code));
    },
  };
};
