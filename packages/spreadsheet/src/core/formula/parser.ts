import { columnIndex, MAX_ROWS, parseCell } from '../address';
import type { CellAddress, CellRef } from '../cell.types';
import { isCellError } from '../values';
import {
  FormulaChar,
  FunctionName,
  TokenKind,
  UnaryOperator,
  type BinaryOperator,
  type BookIndexOf,
  type FormulaFailure,
  type FormulaLocale,
  type FormulaNode,
  type FormulaParse,
  type LineRef,
  type SheetPlace,
} from './formula.types';
import { tokenize, type Token } from './lexer';
import { EN_FORMULAS } from './locale';
import { ORIGIN, relativeFormula } from './origin';
import { booleanFromWord, canonicalFunction } from './localization';
import { parseStructured } from './structured';

export interface ParseOptions {
  readonly books?: BookIndexOf | undefined;
}

interface Parser {
  formula(): FormulaNode;
}

class FormulaSyntaxError extends Error {
  readonly failure: FormulaFailure;

  constructor(failure: FormulaFailure) {
    super();
    this.failure = failure;
  }
}

const COMPARISONS: readonly BinaryOperator[] = ['=', '<>', '<', '>', '<=', '>='];

const COLUMN_WORD = /^(\$?)([A-Za-z]{1,3})$/u;

const ROW_WORD = /^(\$?)(\d{1,7})$/u;

const isBinary = (text: string, operators: readonly BinaryOperator[]): text is BinaryOperator =>
  operators.some((operator) => operator === text);

const columnLine = (text: string): LineRef | undefined => {
  const match = COLUMN_WORD.exec(text);
  const index = match?.[2] === undefined ? undefined : columnIndex(match[2]);

  return match === null || index === undefined
    ? undefined
    : { index, absolute: match[1] === FormulaChar.Dollar };
};

const rowLine = (text: string): LineRef | undefined => {
  const match = ROW_WORD.exec(text);
  const row = match?.[2] === undefined ? Number.NaN : Number.parseInt(match[2], 10);

  return match === null || row < 1 || row > MAX_ROWS
    ? undefined
    : { index: row - 1, absolute: match[1] === FormulaChar.Dollar };
};

const lineOf = (token: Token): LineRef | undefined =>
  token.kind === TokenKind.Number && /^\d+$/u.test(token.text) ? rowLine(token.text) : undefined;

const createParser = (
  tokens: readonly Token[],
  locale: FormulaLocale,
  offset: number,
  books: ParseOptions['books'],
): Parser => {
  let at = 0;

  const peek = (ahead = 0): Token =>
    tokens[Math.min(at + ahead, tokens.length - 1)] ?? {
      kind: 'end',
      text: '',
      start: 0,
      value: 0,
    };

  const next = (): Token => {
    const current = peek();

    at = Math.min(at + 1, tokens.length - 1);
    return current;
  };

  const fail = (token: Token, reason: FormulaFailure['reason']): never => {
    throw new FormulaSyntaxError({ position: token.start + offset, reason });
  };

  const isOp = (text: string, ahead = 0): boolean =>
    peek(ahead).kind === TokenKind.Op && peek(ahead).text === text;

  const isPunct = (text: string, ahead = 0): boolean =>
    peek(ahead).kind === TokenKind.Punct && peek(ahead).text === text;

  const expectPunct = (text: string): void => {
    if (!isPunct(text)) {
      fail(peek(), peek().kind === TokenKind.End ? 'end' : 'token');
    }
    next();
  };

  const binaryLevel =
    (operators: readonly BinaryOperator[], operand: () => FormulaNode) => (): FormulaNode => {
      let left = operand();

      for (let op = peek(); op.kind === TokenKind.Op && isBinary(op.text, operators); op = peek()) {
        next();
        left = { kind: 'binary', op: op.text, left, right: operand() };
      }
      return left;
    };

  const rangeEnd = (place: SheetPlace): Token => {
    const token = next();

    if (token.kind !== TokenKind.Sheet) {
      return token;
    }
    const end = placeOf(token, books);

    return end !== undefined && samePlace(end, place) ? next() : fail(token, 'reference');
  };

  const cellRange = (place: SheetPlace, from: CellRef): FormulaNode => {
    next();
    const end = parseCell(rangeEnd(place).text);

    return end === undefined
      ? fail(peek(-1), 'reference')
      : { kind: 'range', ...place, from, to: end };
  };

  const lineRange = (
    kind: 'columns' | 'rows',
    place: SheetPlace,
    from: LineRef,
    read: (token: Token) => LineRef | undefined,
  ): FormulaNode => {
    next();
    const to = read(rangeEnd(place));

    return to === undefined ? fail(peek(-1), 'reference') : { kind, ...place, from, to };
  };

  const cellReference = (place: SheetPlace, ref: CellRef): FormulaNode => {
    if (isOp(':')) {
      return cellRange(place, ref);
    }
    if (peek().kind === TokenKind.Hash) {
      next();
      return { kind: 'spill', ...place, ref };
    }
    return { kind: 'cell', ...place, ref };
  };

  const reference = (place: SheetPlace, token: Token): FormulaNode | undefined => {
    const cell = token.kind === TokenKind.Word ? parseCell(token.text) : undefined;
    const column = token.kind === TokenKind.Word ? columnLine(token.text) : undefined;
    const row = token.kind === TokenKind.Word ? rowLine(token.text) : lineOf(token);

    if (cell !== undefined) {
      return cellReference(place, cell);
    }
    if (column !== undefined && isOp(':')) {
      return lineRange('columns', place, column, (end) => columnLine(end.text));
    }
    if (row !== undefined && isOp(':')) {
      return lineRange('rows', place, row, (end) => rowLine(end.text));
    }
    return undefined;
  };

  const constant = (token: Token): FormulaNode => {
    switch (token.kind) {
      case TokenKind.Number:
        return { kind: 'number', value: token.value };
      case TokenKind.String:
        return { kind: 'string', value: token.text };
      case TokenKind.Error:
        return { kind: 'error', code: isCellError(token.text) ? token.text : '#VALUE!' };
      case TokenKind.Word:
        return booleanOf(token, locale) ?? fail(token, 'array');
      case TokenKind.Op:
        return token.text === UnaryOperator.Minus && peek().kind === TokenKind.Number
          ? { kind: 'number', value: -next().value }
          : fail(token, 'array');
      default:
        return fail(token, 'array');
    }
  };

  const array = (): FormulaNode => {
    const rows: FormulaNode[][] = [[]];

    rows.at(-1)?.push(constant(next()));

    while (isPunct(locale.arrayColumn) || isPunct(locale.arrayRow)) {
      if (isPunct(locale.arrayRow)) {
        rows.push([]);
      }
      next();
      rows.at(-1)?.push(constant(next()));
    }
    expectPunct('}');
    return rows.every((row) => row.length === rows[0]?.length)
      ? { kind: 'array', rows }
      : fail(peek(-1), 'array');
  };

  const argumentsOf = (): FormulaNode[] => {
    const args: FormulaNode[] = [];

    if (isPunct(')')) {
      next();
      return args;
    }

    const argument = (): FormulaNode =>
      isPunct(locale.argument) || isPunct(')') ? { kind: 'missing' } : expression();

    args.push(argument());

    while (isPunct(locale.argument)) {
      next();
      args.push(argument());
    }
    expectPunct(')');
    return args;
  };

  const word = (token: Token): FormulaNode => {
    if (isPunct('(')) {
      next();

      const name = canonicalFunction(token.text, locale);
      const args = argumentsOf();
      const [only] = args;

      return name === FunctionName.Single && args.length === 1 && only !== undefined
        ? { kind: 'unary', op: '@', operand: only }
        : { kind: 'call', name, args };
    }
    return booleanOf(token, locale) ?? reference({}, token) ?? { kind: 'name', name: token.text };
  };

  const bookTable = (place: SheetPlace, token: Token): FormulaNode | undefined => {
    const found =
      token.kind === TokenKind.Structured && place.book !== undefined && place.sheet === undefined
        ? parseStructured(token.text, locale)
        : undefined;

    return found === undefined ? undefined : { ...found, book: place.book };
  };

  const sheetItem = (place: SheetPlace, token: Token): FormulaNode =>
    reference(place, token) ??
    bookTable(place, token) ??
    (token.kind === TokenKind.Word && !isPunct('(') && booleanOf(token, locale) === undefined
      ? { kind: 'name', ...place, name: token.text }
      : fail(token, 'reference'));

  const primary = (): FormulaNode => {
    const token = next();

    switch (token.kind) {
      case TokenKind.Number:
        return reference({}, token) ?? { kind: 'number', value: token.value };
      case TokenKind.String:
      case TokenKind.Error:
        return constant(token);
      case TokenKind.Word:
        return word(token);
      case TokenKind.Sheet: {
        const place = placeOf(token, books);

        return place === undefined ? fail(token, 'reference') : sheetItem(place, next());
      }
      case TokenKind.Structured:
        return parseStructured(token.text, locale) ?? fail(token, 'reference');
      case TokenKind.Punct:
        return group(token);
      default:
        return fail(token, token.kind === TokenKind.End ? 'end' : 'token');
    }
  };

  const group = (token: Token): FormulaNode => {
    if (token.text === FormulaChar.OpenBrace) {
      return array();
    }
    if (token.text !== FormulaChar.OpenParen) {
      return fail(token, 'token');
    }
    const inner = expression();

    expectPunct(')');
    return inner;
  };

  const unary = (): FormulaNode => {
    const token = peek();

    if (
      token.kind === TokenKind.Op &&
      (token.text === UnaryOperator.Minus ||
        token.text === UnaryOperator.Plus ||
        token.text === UnaryOperator.Intersect)
    ) {
      next();
      return { kind: 'unary', op: token.text, operand: unary() };
    }
    return primary();
  };

  const percent = (): FormulaNode => {
    let operand = unary();

    while (isOp('%')) {
      next();
      operand = { kind: 'percent', operand };
    }
    return operand;
  };

  const power = binaryLevel(['^'], percent);
  const product = binaryLevel(['*', '/'], power);
  const sum = binaryLevel(['+', '-'], product);
  const concat = binaryLevel(['&'], sum);
  const comparison = binaryLevel(COMPARISONS, concat);

  const expression = (): FormulaNode => comparison();

  return {
    formula: () => {
      const ast = expression();

      if (peek().kind !== TokenKind.End) {
        fail(peek(), 'token');
      }
      return ast;
    },
  };
};

const placeOf = (token: Token, books: ParseOptions['books']): SheetPlace | undefined => {
  const sheet = token.text === '' ? {} : { sheet: token.text };
  const book = token.book === undefined ? token.value : books?.(token.book);

  if (book === undefined) {
    return undefined;
  }
  return book > 0 ? { book, ...sheet } : sheet;
};

const samePlace = (left: SheetPlace, right: SheetPlace): boolean =>
  left.book === right.book &&
  left.sheet !== undefined &&
  left.sheet.toLowerCase() === right.sheet?.toLowerCase();

const booleanOf = (token: Token, locale: FormulaLocale): FormulaNode | undefined => {
  const value = token.kind === TokenKind.Word ? booleanFromWord(token.text, locale) : undefined;

  return value === undefined ? undefined : { kind: 'boolean', value };
};

export const parseFormula = (
  text: string,
  locale: FormulaLocale = EN_FORMULAS,
  origin: CellAddress = ORIGIN,
  { books }: ParseOptions = {},
): FormulaParse => {
  const source = text.startsWith('=') ? text.slice(1) : text;
  const offset = text.length - source.length;
  const tokens = tokenize(source, locale);

  if (!Array.isArray(tokens)) {
    return { ok: false, error: { position: tokens.position + offset, reason: 'token' } };
  }
  try {
    return {
      ok: true,
      ast: relativeFormula(createParser(tokens, locale, offset, books).formula(), origin),
    };
  } catch (error) {
    if (error instanceof FormulaSyntaxError) {
      return { ok: false, error: error.failure };
    }
    throw error;
  }
};
