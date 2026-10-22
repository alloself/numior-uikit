import { columnName, formatCell } from '../address';
import type { CellAddress, CellRef } from '../cell.types';
import type {
  BinaryOperator,
  BookLabelOf,
  FormulaLocale,
  FormulaNode,
  LineRef,
  SheetPlace,
} from './formula.types';
import { EN_FORMULAS } from './locale';
import { ORIGIN, absoluteFormula } from './origin';
import { localFunction } from './localization';
import { printStructured } from './structured';

export interface PrintOptions {
  readonly books?: BookLabelOf | undefined;
}

interface Printing extends PrintOptions {
  readonly locale: FormulaLocale;
}

const PRECEDENCE: Readonly<Record<BinaryOperator, number>> = {
  '=': 1,
  '<>': 1,
  '<': 1,
  '>': 1,
  '<=': 1,
  '>=': 1,
  '&': 2,
  '+': 3,
  '-': 3,
  '*': 4,
  '/': 4,
  '^': 5,
};

const PERCENT = 6;

const UNARY = 7;

const ATOM = 8;

const PLAIN_SHEET = /^[\p{L}_][\p{L}\p{N}_.]*$/u;

const LOOKS_LIKE_REFERENCE = /^(?:[A-Za-z]{1,3}\d+|R\d*C\d*|TRUE|FALSE)$/iu;

const precedenceOf = (node: FormulaNode): number => {
  switch (node.kind) {
    case 'binary':
      return PRECEDENCE[node.op];
    case 'percent':
      return PERCENT;
    case 'unary':
      return UNARY;
    default:
      return ATOM;
  }
};

const plainSheet = (sheet: string): boolean =>
  PLAIN_SHEET.test(sheet) && !LOOKS_LIKE_REFERENCE.test(sheet);

const bookPrefix = (book: number | undefined, printing: Printing): string => {
  if (book === undefined) {
    return '';
  }
  return `[${printing.books?.(book) ?? String(book)}]`;
};

const sheetPrefix = ({ book, sheet }: SheetPlace, printing: Printing): string => {
  const prefix = bookPrefix(book, printing);
  const name = book === undefined ? undefined : printing.books?.(book);
  const plainBook = name === undefined || PLAIN_SHEET.test(name);

  if (sheet === undefined) {
    return prefix === '' ? '' : `${prefix}!`;
  }
  return plainSheet(sheet) && plainBook
    ? `${prefix}${sheet}!`
    : `'${(prefix + sheet).replaceAll("'", "''")}'!`;
};

const numberText = (value: number, locale: FormulaLocale): string =>
  String(value).replace('e', 'E').replace('.', locale.decimal);

const cellText = (ref: CellRef): string => formatCell(ref);

const columnText = (line: LineRef): string =>
  `${line.absolute ? '$' : ''}${columnName(line.index)}`;

const rowText = (line: LineRef): string => `${line.absolute ? '$' : ''}${String(line.index + 1)}`;

const wrapped = (node: FormulaNode, printing: Printing, above: number): string => {
  const text = printNode(node, printing);

  return precedenceOf(node) < above ? `(${text})` : text;
};

const constantText = (node: FormulaNode, locale: FormulaLocale): string | undefined => {
  switch (node.kind) {
    case 'number':
      return numberText(node.value, locale);
    case 'string':
      return `"${node.value.replaceAll('"', '""')}"`;
    case 'boolean':
      return node.value ? locale.trueText : locale.falseText;
    case 'error':
      return locale.errors[node.code];
    case 'missing':
      return '';
    default:
      return undefined;
  }
};

const referenceText = (node: FormulaNode, printing: Printing): string | undefined => {
  switch (node.kind) {
    case 'cell':
      return `${sheetPrefix(node, printing)}${cellText(node.ref)}`;
    case 'range':
      return `${sheetPrefix(node, printing)}${cellText(node.from)}:${cellText(node.to)}`;
    case 'columns':
      return `${sheetPrefix(node, printing)}${columnText(node.from)}:${columnText(node.to)}`;
    case 'rows':
      return `${sheetPrefix(node, printing)}${rowText(node.from)}:${rowText(node.to)}`;
    case 'spill':
      return `${sheetPrefix(node, printing)}${cellText(node.ref)}#`;
    case 'name':
      return `${sheetPrefix(node, printing)}${node.name}`;
    default:
      return undefined;
  }
};

const operationText = (node: FormulaNode, printing: Printing): string => {
  switch (node.kind) {
    case 'call':
      return `${localFunction(node.name, printing.locale)}(${node.args.map((arg) => printNode(arg, printing)).join(printing.locale.argument)})`;
    case 'unary':
      return `${node.op}${wrapped(node.operand, printing, UNARY)}`;
    case 'percent':
      return `${wrapped(node.operand, printing, PERCENT)}%`;
    case 'binary': {
      const level = PRECEDENCE[node.op];

      return `${wrapped(node.left, printing, level)}${node.op}${wrapped(node.right, printing, level + 1)}`;
    }
    case 'array':
      return `{${node.rows
        .map((row) =>
          row.map((item) => printNode(item, printing)).join(printing.locale.arrayColumn),
        )
        .join(printing.locale.arrayRow)}}`;
    default:
      return '';
  }
};

const printNode = (node: FormulaNode, printing: Printing): string =>
  node.kind === 'structured'
    ? printStructured(node, printing.locale)
    : (constantText(node, printing.locale) ??
      referenceText(node, printing) ??
      operationText(node, printing));

export const printFormula = (
  node: FormulaNode,
  locale: FormulaLocale = EN_FORMULAS,
  origin: CellAddress = ORIGIN,
  { books }: PrintOptions = {},
): string => printNode(absoluteFormula(node, origin), { locale, books });
