import {
  CellInputKind,
  CellValueKind,
  type CellAddress,
  type CellRange,
  type CellValue,
} from './cell.types';
import type { Calculator } from './calc/calculator';
import { logicalFromText, toText } from './calc/coerce';
import { parseNumberFormat } from './format/format-code';
import { formatValue } from './format/format-value';
import {
  FormatTokenKind,
  SectionKind,
  type FormattedValue,
  type FormatToken,
  type NumberLocale,
} from './format/format.types';
import { currencyFormat, withYear } from './format/number-locale';
import { readValueText } from './format/read-value';
import {
  FormulaNodeKind,
  FormulaReferenceKind,
  FunctionName,
  type FormulaFailure,
  type FormulaNode,
} from './formula/formula.types';
import { ORIGIN, referenceRange } from './formula/origin';
import { parseFormula, type ParseOptions } from './formula/parser';
import { printFormula } from './formula/printer';
import {
  formulaReferences,
  isSymbolic,
  mapReferences,
  type FormulaReference,
} from './formula/references';
import type { BookLocale } from './locale';
import { errorFromText } from './error-texts';
import { booleanValue, errorValue, numberValue, textValue } from './values';
import { createStepper } from './steps/apply-step';
import type { CellEdit, WorkbookStep } from './steps/step.types';
import { uniqueColumns } from './tables';
import { bookLabels, bookNames, localSheet, type Sheet, type Workbook } from './workbook';

export type CellInput =
  | { readonly kind: typeof CellInputKind.Empty }
  | { readonly kind: typeof CellInputKind.Formula; readonly text: string }
  | {
      readonly kind: typeof CellInputKind.Value;
      readonly value: CellValue;
      readonly format: string | undefined;
    };

export interface NameOptions {
  readonly scope?: Sheet | undefined;
  readonly anchor?: CellAddress | undefined;
  readonly locale?: BookLocale | undefined;
}

export interface TableOptions {
  readonly name?: string | undefined;
  readonly headers?: boolean | undefined;
  readonly totals?: boolean | undefined;
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
  tableStep(sheet: Sheet, range: CellRange, options?: TableOptions): WorkbookStep;
  inputText(sheet: Sheet, row: number, col: number, locale?: BookLocale): string;
  shown(sheet: Sheet, row: number, col: number): FormattedValue;
  formatAt(sheet: Sheet, row: number, col: number): string;
  setFormat(sheet: Sheet, range: CellRange, code: string): void;
}

type CellOrRange = Extract<
  FormulaReference,
  { readonly kind: typeof FormulaReferenceKind.Cell | typeof FormulaReferenceKind.Range }
>;

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
    case FormulaNodeKind.Cell:
    case FormulaNodeKind.Range:
    case FormulaNodeKind.Areas:
    case FormulaNodeKind.Unary:
    case FormulaNodeKind.Percent:
      return true;
    case FormulaNodeKind.Binary:
      return ARITHMETIC.has(node.op);
    case FormulaNodeKind.Call:
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
  const error = errorFromText(text.trim(), locale.errors);

  if (error !== undefined) {
    return { kind: 'value', value: errorValue(error), format: undefined };
  }

  if (logical !== undefined) {
    return { kind: 'value', value: booleanValue(logical), format: undefined };
  }

  const read = readValueText(text, locale);

  return read === undefined
    ? plainText(text)
    : { kind: 'value', value: numberValue(read.value), format: read.format };
};

const unitsOf = (tokens: readonly FormatToken[], units: ReadonlySet<string>): boolean =>
  tokens.some((token) => token.kind === FormatTokenKind.Date && units.has(token.unit));

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

  if (section?.kind === SectionKind.Date && value >= 0) {
    return dateEditText(value, tokens, locale);
  }
  if (tokens.some((token) => token.kind === FormatTokenKind.Percent)) {
    return `${toText(numberValue(Number((value * 100).toPrecision(15))), locale)}%`;
  }
  return toText(numberValue(value), locale);
};

const sameText = (text: string, locale: NumberLocale): boolean => {
  const input = readInput(text, locale);

  return (
    input.kind === CellInputKind.Value &&
    input.value.kind === CellValueKind.String &&
    input.value.value === text
  );
};

export const editText = (value: CellValue, code: string, locale: NumberLocale): string => {
  switch (value.kind) {
    case CellValueKind.Number:
      return numberEditText(value.value, code, locale);
    case CellValueKind.String:
      return code === TEXT_FORMAT || sameText(value.value, locale)
        ? value.value
        : `'${value.value}`;
    case CellValueKind.Boolean:
      return value.value ? locale.trueText : locale.falseText;
    case CellValueKind.Error:
      return locale.errors[value.code];
    case CellValueKind.Empty:
      return '';
  }
};

const isCellOrRange = (found: FormulaReference): found is CellOrRange =>
  found.kind === FormulaReferenceKind.Cell || found.kind === FormulaReferenceKind.Range;

const resultFormat = (node: FormulaNode, locale: NumberLocale): string | undefined => {
  if (node.kind !== FormulaNodeKind.Call) {
    return undefined;
  }

  const name = node.name.toUpperCase();

  if (DATE_RESULTS.has(name)) {
    return locale.shortDate;
  }
  if (name === FunctionName.Now) {
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
  const source = first === undefined ? undefined : localSheet(book, first, sheet);
  const range = first === undefined ? undefined : referenceRange(first, origin);

  if (range === undefined || source === undefined) {
    return undefined;
  }

  const id = source.formats.get(range.top, range.left);

  return id === 0 ? undefined : book.formats.code(id);
};

const qualified = (ast: FormulaNode, sheet: Sheet): FormulaNode =>
  mapReferences(ast, (reference) =>
    isSymbolic(reference) || reference.sheet !== undefined
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

  const typedOptions = (): ParseOptions => ({
    ...bookNames(book),
    signatures: calculator.signatures,
  });

  const formatAt = (sheet: Sheet, row: number, col: number): string =>
    book.formats.code(sheet.formats.get(row, col));

  const typedIn = (locale: BookLocale): NumberLocale =>
    withYear(locale.numbers, calculator.clock().getFullYear());

  const formulaEdit = (
    sheet: Sheet,
    position: CellAddress,
    text: string,
    locale: BookLocale,
  ): EntryResult => {
    const parsed = parseFormula(text, locale.formulas, position, typedOptions());

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

  const inHeader = (sheet: Sheet, row: number, col: number): boolean =>
    book.tables
      .on(sheet)
      .some(
        (table) =>
          table.headers &&
          table.range.top === row &&
          col >= table.range.left &&
          col <= table.range.right,
      );

  const input = (
    sheet: Sheet,
    row: number,
    col: number,
    text: string,
    locale: BookLocale = calculator.locale,
  ): EntryResult => {
    const read =
      (formatAt(sheet, row, col) === TEXT_FORMAT || inHeader(sheet, row, col)) && text !== ''
        ? plainText(text)
        : readInput(text, typedIn(locale));

    switch (read.kind) {
      case CellInputKind.Empty:
        return entry(sheet, { row, col, content: { kind: 'empty' } });
      case CellInputKind.Formula:
        return formulaEdit(sheet, { row, col }, read.text, locale);
      case CellInputKind.Value:
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
      typedOptions(),
    );

    return parsed.ok
      ? { ok: true, step: { kind: 'setName', name, scope, ast: qualified(parsed.ast, sheet) } }
      : parsed;
  };

  const shown = (sheet: Sheet, row: number, col: number): FormattedValue =>
    formatValue(sheet.cells.get(row, col), formatAt(sheet, row, col), calculator.locale.numbers);

  const freeTableName = (): string => {
    const prefix = calculator.locale.formulas.defaultTable;
    let index = 1;

    while (
      book.tables.get(`${prefix}${String(index)}`) !== undefined ||
      book.names.taken(`${prefix}${String(index)}`)
    ) {
      index += 1;
    }
    return `${prefix}${String(index)}`;
  };

  const tableStep = (sheet: Sheet, range: CellRange, options: TableOptions = {}): WorkbookStep => {
    const headers = options.headers ?? true;
    const width = range.right - range.left + 1;

    const texts = Array.from({ length: width }, (_unused, index) =>
      headers ? shown(sheet, range.top, range.left + index).text : '',
    );

    const columns = uniqueColumns(texts, calculator.locale.formulas.defaultColumn);

    const cells = columns.reduce<CellEdit[]>((edits, name, index) => {
      const col = range.left + index;
      const value = sheet.cells.get(range.top, col);

      if (headers && (value.kind !== CellValueKind.String || value.value !== name)) {
        edits.push({
          row: range.top,
          col,
          content: { kind: 'value', value: textValue(name) },
        });
      }
      return edits;
    }, []);

    return {
      kind: 'batch',
      steps: [
        { kind: 'setCells', sheet: sheet.name, cells },
        {
          kind: 'addTable',
          name: options.name ?? freeTableName(),
          table: { sheet: sheet.name, range, columns, headers, totals: options.totals ?? false },
        },
      ],
    };
  };

  return {
    input,
    nameStep,
    tableStep,
    nameText: (name, scope, anchor = ORIGIN) => {
      const defined = book.names.get(name, scope);

      return defined === undefined
        ? undefined
        : `=${printFormula(defined.ast, calculator.locale.formulas, anchor, bookLabels(book))}`;
    },
    enter: (sheet, row, col, text, locale) => {
      const result = input(sheet, row, col, text, locale);

      if (!result.ok) {
        return result.error;
      }
      stepper.apply(result.step);
      return undefined;
    },
    inputText: (sheet, row, col, locale = calculator.locale) => {
      const formula = calculator.formulaAt(sheet, row, col);

      return formula === undefined
        ? editText(sheet.cells.get(row, col), formatAt(sheet, row, col), typedIn(locale))
        : `=${printFormula(formula.ast, locale.formulas, { row, col }, bookLabels(book))}`;
    },
    shown,
    formatAt,
    formatStep,
    setFormat: (sheet, range, code) => {
      stepper.apply(formatStep(sheet, range, code));
    },
  };
};
