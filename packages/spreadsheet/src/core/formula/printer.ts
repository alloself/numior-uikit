import { columnName, formatCell } from '../address';
import type { CellAddress, CellRef } from '../cell.types';
import type { BinaryOperator, FormulaLocale, FormulaNode, LineRef } from './formula.types';
import { EN_FORMULAS } from './locale';
import { ORIGIN, absoluteFormula } from './origin';
import { localFunction } from './localization';
import { printStructured } from './structured';

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

const sheetPrefix = (sheet: string | undefined): string => {
  if (sheet === undefined) {
    return '';
  }
  return PLAIN_SHEET.test(sheet) && !LOOKS_LIKE_REFERENCE.test(sheet)
    ? `${sheet}!`
    : `'${sheet.replaceAll("'", "''")}'!`;
};

const numberText = (value: number, locale: FormulaLocale): string =>
  String(value).replace('e', 'E').replace('.', locale.decimal);

const cellText = (ref: CellRef): string => formatCell(ref);

const columnText = (line: LineRef): string =>
  `${line.absolute ? '$' : ''}${columnName(line.index)}`;

const rowText = (line: LineRef): string => `${line.absolute ? '$' : ''}${String(line.index + 1)}`;

const wrapped = (node: FormulaNode, locale: FormulaLocale, above: number): string => {
  const text = printNode(node, locale);

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

const referenceText = (node: FormulaNode): string | undefined => {
  switch (node.kind) {
    case 'cell':
      return `${sheetPrefix(node.sheet)}${cellText(node.ref)}`;
    case 'range':
      return `${sheetPrefix(node.sheet)}${cellText(node.from)}:${cellText(node.to)}`;
    case 'columns':
      return `${sheetPrefix(node.sheet)}${columnText(node.from)}:${columnText(node.to)}`;
    case 'rows':
      return `${sheetPrefix(node.sheet)}${rowText(node.from)}:${rowText(node.to)}`;
    case 'spill':
      return `${sheetPrefix(node.sheet)}${cellText(node.ref)}#`;
    case 'name':
      return `${sheetPrefix(node.sheet)}${node.name}`;
    default:
      return undefined;
  }
};

const operationText = (node: FormulaNode, locale: FormulaLocale): string => {
  switch (node.kind) {
    case 'call':
      return `${localFunction(node.name, locale)}(${node.args.map((arg) => printNode(arg, locale)).join(locale.argument)})`;
    case 'unary':
      return `${node.op}${wrapped(node.operand, locale, UNARY)}`;
    case 'percent':
      return `${wrapped(node.operand, locale, PERCENT)}%`;
    case 'binary': {
      const level = PRECEDENCE[node.op];

      return `${wrapped(node.left, locale, level)}${node.op}${wrapped(node.right, locale, level + 1)}`;
    }
    case 'array':
      return `{${node.rows
        .map((row) => row.map((item) => printNode(item, locale)).join(locale.arrayColumn))
        .join(locale.arrayRow)}}`;
    default:
      return '';
  }
};

const printNode = (node: FormulaNode, locale: FormulaLocale): string =>
  node.kind === 'structured'
    ? printStructured(node, locale)
    : (constantText(node, locale) ?? referenceText(node) ?? operationText(node, locale));

export const printFormula = (
  node: FormulaNode,
  locale: FormulaLocale = EN_FORMULAS,
  origin: CellAddress = ORIGIN,
): string => printNode(absoluteFormula(node, origin), locale);
