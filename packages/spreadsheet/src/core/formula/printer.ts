import { columnName, formatCell } from '../address';
import type { CellAddress, CellRef } from '../cell.types';
import {
  FormulaNodeKind,
  type BinaryOperator,
  type BookLabelOf,
  type FormulaLocale,
  type FormulaNode,
  type LineRef,
  type SheetPlace,
} from './formula.types';
import { EN_FORMULAS } from './locale';
import { ORIGIN, absoluteFormula } from './origin';
import { localFunction } from './localization';
import { printStructured } from './structured';
import { foldFormula } from './walk';

export interface PrintOptions {
  readonly books?: BookLabelOf | undefined;
}

interface Printing extends PrintOptions {
  readonly locale: FormulaLocale;
}

interface Printed {
  readonly text: string;
  readonly level: number;
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
    case FormulaNodeKind.Binary:
      return PRECEDENCE[node.op];
    case FormulaNodeKind.Percent:
      return PERCENT;
    case FormulaNodeKind.Unary:
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

const wrapped = (printed: Printed | undefined, above: number): string => {
  if (printed === undefined) {
    return '';
  }
  return printed.level < above ? `(${printed.text})` : printed.text;
};

const constantText = (node: FormulaNode, printing: Printing): string | undefined => {
  const { locale } = printing;

  switch (node.kind) {
    case FormulaNodeKind.Number:
      return numberText(node.value, locale);
    case FormulaNodeKind.String:
      return `"${node.value.replaceAll('"', '""')}"`;
    case FormulaNodeKind.Boolean:
      return node.value ? locale.trueText : locale.falseText;
    case FormulaNodeKind.Error:
      return `${sheetPrefix(node, printing)}${locale.errors[node.code]}`;
    case FormulaNodeKind.Missing:
      return '';
    case FormulaNodeKind.Opaque:
      return node.text;
    default:
      return undefined;
  }
};

const referenceText = (node: FormulaNode, printing: Printing): string | undefined => {
  switch (node.kind) {
    case FormulaNodeKind.Cell:
      return `${sheetPrefix(node, printing)}${cellText(node.ref)}`;
    case FormulaNodeKind.Range:
      return `${sheetPrefix(node, printing)}${cellText(node.from)}:${cellText(node.to)}`;
    case FormulaNodeKind.Columns:
      return `${sheetPrefix(node, printing)}${columnText(node.from)}:${columnText(node.to)}`;
    case FormulaNodeKind.Rows:
      return `${sheetPrefix(node, printing)}${rowText(node.from)}:${rowText(node.to)}`;
    case FormulaNodeKind.Spill:
      return `${sheetPrefix(node, printing)}${cellText(node.ref)}#`;
    case FormulaNodeKind.Name:
      return `${sheetPrefix(node, printing)}${node.name}`;
    default:
      return undefined;
  }
};

const arrayText = (
  rows: readonly (readonly FormulaNode[])[],
  items: readonly Printed[],
  locale: FormulaLocale,
): string =>
  rows
    .reduce<{ texts: string[]; at: number }>(
      (built, row) => {
        built.texts.push(
          items
            .slice(built.at, built.at + row.length)
            .map((item) => item.text)
            .join(locale.arrayColumn),
        );

        return { texts: built.texts, at: built.at + row.length };
      },
      { texts: [], at: 0 },
    )
    .texts.join(locale.arrayRow);

const operationText = (
  node: FormulaNode,
  parts: readonly Printed[],
  printing: Printing,
): string => {
  switch (node.kind) {
    case FormulaNodeKind.Call:
      return `${localFunction(node.name, printing.locale)}(${parts.map((part) => part.text).join(printing.locale.argument)})`;
    case FormulaNodeKind.Unary:
      return `${node.op}${wrapped(parts[0], UNARY)}`;
    case FormulaNodeKind.Percent:
      return `${wrapped(parts[0], PERCENT)}%`;
    case FormulaNodeKind.Binary: {
      const level = PRECEDENCE[node.op];

      return `${wrapped(parts[0], level)}${node.op}${wrapped(parts[1], level + 1)}`;
    }
    case FormulaNodeKind.Array:
      return `{${arrayText(node.rows, parts, printing.locale)}}`;
    default:
      return '';
  }
};

const nodeText = (node: FormulaNode, parts: readonly Printed[], printing: Printing): string =>
  node.kind === FormulaNodeKind.Structured
    ? `${sheetPrefix({ book: node.book }, printing)}${printStructured(node, printing.locale)}`
    : (constantText(node, printing) ??
      referenceText(node, printing) ??
      operationText(node, parts, printing));

export const printFormula = (
  node: FormulaNode,
  locale: FormulaLocale = EN_FORMULAS,
  origin: CellAddress = ORIGIN,
  { books }: PrintOptions = {},
): string => {
  const printing: Printing = { locale, books };

  return foldFormula<Printed>(absoluteFormula(node, origin), (item, parts) => ({
    text: nodeText(item, parts, printing),
    level: precedenceOf(item),
  })).text;
};
