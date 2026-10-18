import { columnIndex, MAX_ROWS, parseCell } from '../address';
import type { CellRef } from '../cell.types';
import { isCellError } from '../values';
import type {
  BinaryOperator,
  FormulaFailure,
  FormulaLocale,
  FormulaNode,
  FormulaParse,
  LineRef,
} from './formula.types';
import { tokenize, type Token } from './lexer';
import { EN_FORMULAS } from './locale';

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

  return match === null || index === undefined ? undefined : { index, absolute: match[1] === '$' };
};

const rowLine = (text: string): LineRef | undefined => {
  const match = ROW_WORD.exec(text);
  const row = match?.[2] === undefined ? Number.NaN : Number.parseInt(match[2], 10);

  return match === null || row < 1 || row > MAX_ROWS
    ? undefined
    : { index: row - 1, absolute: match[1] === '$' };
};

const lineOf = (token: Token): LineRef | undefined =>
  token.kind === 'number' && /^\d+$/u.test(token.text) ? rowLine(token.text) : undefined;

interface Parser {
  formula(): FormulaNode;
}

const createParser = (tokens: readonly Token[], locale: FormulaLocale, offset: number): Parser => {
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
    peek(ahead).kind === 'op' && peek(ahead).text === text;

  const isPunct = (text: string, ahead = 0): boolean =>
    peek(ahead).kind === 'punct' && peek(ahead).text === text;

  const expectPunct = (text: string): void => {
    if (!isPunct(text)) {
      fail(peek(), peek().kind === 'end' ? 'end' : 'token');
    }
    next();
  };

  const binaryLevel =
    (operators: readonly BinaryOperator[], operand: () => FormulaNode) => (): FormulaNode => {
      let left = operand();

      for (let op = peek(); op.kind === 'op' && isBinary(op.text, operators); op = peek()) {
        next();
        left = { kind: 'binary', op: op.text, left, right: operand() };
      }
      return left;
    };

  const cellRange = (sheet: string | undefined, from: CellRef): FormulaNode => {
    next();
    const end = parseCell(next().text);

    return end === undefined
      ? fail(peek(-1), 'reference')
      : { kind: 'range', sheet, from, to: end };
  };

  const lineRange = (
    kind: 'columns' | 'rows',
    sheet: string | undefined,
    from: LineRef,
    read: (token: Token) => LineRef | undefined,
  ): FormulaNode => {
    next();
    const to = read(next());

    return to === undefined ? fail(peek(-1), 'reference') : { kind, sheet, from, to };
  };

  const cellReference = (sheet: string | undefined, ref: CellRef): FormulaNode => {
    if (isOp(':')) {
      return cellRange(sheet, ref);
    }
    if (peek().kind === 'hash') {
      next();
      return { kind: 'spill', sheet, ref };
    }
    return { kind: 'cell', sheet, ref };
  };

  const reference = (sheet: string | undefined, token: Token): FormulaNode | undefined => {
    const cell = token.kind === 'word' ? parseCell(token.text) : undefined;
    const column = token.kind === 'word' ? columnLine(token.text) : undefined;
    const row = token.kind === 'word' ? rowLine(token.text) : lineOf(token);

    if (cell !== undefined) {
      return cellReference(sheet, cell);
    }
    if (column !== undefined && isOp(':')) {
      return lineRange('columns', sheet, column, (end) => columnLine(end.text));
    }
    if (row !== undefined && isOp(':')) {
      return lineRange('rows', sheet, row, (end) => rowLine(end.text));
    }
    return undefined;
  };

  const constant = (token: Token): FormulaNode => {
    switch (token.kind) {
      case 'number':
        return { kind: 'number', value: token.value };
      case 'string':
        return { kind: 'string', value: token.text };
      case 'error':
        return { kind: 'error', code: isCellError(token.text) ? token.text : '#VALUE!' };
      case 'word':
        return booleanOf(token) ?? fail(token, 'array');
      case 'op':
        return token.text === '-' && peek().kind === 'number'
          ? { kind: 'number', value: -next().value }
          : fail(token, 'array');
      default:
        return fail(token, 'array');
    }
  };

  const array = (): FormulaNode => {
    const rows: FormulaNode[][] = [[]];

    for (;;) {
      rows.at(-1)?.push(constant(next()));
      if (isPunct(locale.arrayColumn)) {
        next();
      } else if (isPunct(locale.arrayRow)) {
        next();
        rows.push([]);
      } else {
        expectPunct('}');
        return rows.every((row) => row.length === rows[0]?.length)
          ? { kind: 'array', rows }
          : fail(peek(-1), 'array');
      }
    }
  };

  const argumentsOf = (): FormulaNode[] => {
    const args: FormulaNode[] = [];

    if (isPunct(')')) {
      next();
      return args;
    }
    for (;;) {
      const empty = isPunct(locale.argument) || isPunct(')');

      args.push(empty ? { kind: 'missing' } : expression());
      if (!isPunct(locale.argument)) {
        expectPunct(')');
        return args;
      }
      next();
    }
  };

  const word = (token: Token): FormulaNode => {
    if (isPunct('(')) {
      next();
      return { kind: 'call', name: token.text.toUpperCase(), args: argumentsOf() };
    }
    return booleanOf(token) ?? reference(undefined, token) ?? { kind: 'name', name: token.text };
  };

  const primary = (): FormulaNode => {
    const token = next();

    switch (token.kind) {
      case 'number':
        return reference(undefined, token) ?? { kind: 'number', value: token.value };
      case 'string':
      case 'error':
        return constant(token);
      case 'word':
        return word(token);
      case 'sheet':
        return reference(token.text, next()) ?? fail(peek(-1), 'reference');
      case 'punct':
        return group(token);
      default:
        return fail(token, token.kind === 'end' ? 'end' : 'token');
    }
  };

  const group = (token: Token): FormulaNode => {
    if (token.text === '{') {
      return array();
    }
    if (token.text !== '(') {
      return fail(token, 'token');
    }
    const inner = expression();

    expectPunct(')');
    return inner;
  };

  const unary = (): FormulaNode => {
    const token = peek();

    if (token.kind === 'op' && (token.text === '-' || token.text === '+')) {
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

      if (peek().kind !== 'end') {
        fail(peek(), 'token');
      }
      return ast;
    },
  };
};

const booleanOf = (token: Token): FormulaNode | undefined => {
  const upper = token.text.toUpperCase();

  return upper === 'TRUE' || upper === 'FALSE'
    ? { kind: 'boolean', value: upper === 'TRUE' }
    : undefined;
};

export const parseFormula = (text: string, locale: FormulaLocale = EN_FORMULAS): FormulaParse => {
  const source = text.startsWith('=') ? text.slice(1) : text;
  const offset = text.length - source.length;
  const tokens = tokenize(source, locale);

  if (!Array.isArray(tokens)) {
    return { ok: false, error: { position: tokens.position + offset, reason: 'token' } };
  }
  try {
    return { ok: true, ast: createParser(tokens, locale, offset).formula() };
  } catch (error) {
    if (error instanceof FormulaSyntaxError) {
      return { ok: false, error: error.failure };
    }
    throw error;
  }
};
