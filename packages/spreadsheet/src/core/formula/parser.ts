import { columnIndex, MAX_ROWS, parseCell } from '../address';
import type { CellAddress, CellRef } from '../cell.types';
import { isCellError } from '../values';
import {
  AreaOperator,
  FormulaChar,
  FormulaFailureReason,
  FormulaNodeKind,
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
  type SignatureOf,
} from './formula.types';
import {
  callRefusal,
  givesReference,
  literalRefusal,
  MAX_FORMULA_CALLS,
  MAX_FORMULA_DEPTH,
  MAX_FORMULA_GROUPS,
  MAX_FORMULA_SIGNS,
  MAX_FORMULA_TEXT,
  numberRefusal,
  type FormulaRefusal,
} from './excel-limits';
import { tokenize, type Token } from './lexer';
import { EN_FORMULAS } from './locale';
import { ORIGIN, relativeFormula } from './origin';
import { booleanFromWord, canonicalFunction } from './localization';
import { parseStructured } from './structured';
import { printFormula } from './printer';
import { formulaDepth } from './walk';

export interface ParseOptions {
  readonly books?: BookIndexOf | undefined;
  readonly signatures?: SignatureOf | undefined;
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

const LOST_REFERENCE = '#REF!';

const COLUMN_WORD = /^(\$?)([A-Za-z]{1,3})$/u;

const ROW_WORD = /^(\$?)(\d{1,7})$/u;

const SIGNS: ReadonlyMap<string, UnaryOperator> = new Map(
  Object.values(UnaryOperator).map((sign) => [sign, sign]),
);

const AREA_STARTS: ReadonlySet<TokenKind> = new Set([
  TokenKind.Word,
  TokenKind.Sheet,
  TokenKind.Structured,
  TokenKind.Number,
  TokenKind.Error,
]);

const NO_SIGNATURES: SignatureOf = () => undefined;

const startsArea = (token: Token): boolean =>
  token.spaced === true &&
  (AREA_STARTS.has(token.kind) ||
    (token.kind === TokenKind.Punct && token.text === FormulaChar.OpenParen));

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

const signOf = (token: Token): UnaryOperator | undefined =>
  token.kind === TokenKind.Op ? SIGNS.get(token.text) : undefined;

const lineOf = (token: Token): LineRef | undefined =>
  token.kind === TokenKind.Number && /^\d+$/u.test(token.text) ? rowLine(token.text) : undefined;

const createParser = (
  tokens: readonly Token[],
  locale: FormulaLocale,
  offset: number,
  { books, signatures }: ParseOptions,
): Parser => {
  let at = 0;
  let groups = 0;
  let calls = 0;

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

  const fail = (token: Token, reason: FormulaFailureReason, detail?: FormulaRefusal): never => {
    throw new FormulaSyntaxError({
      position: token.start + offset,
      reason,
      name: detail?.name,
      argument: detail?.argument === undefined ? undefined : detail.argument + 1,
    });
  };

  const checked = (token: Token, node: FormulaNode): FormulaNode => {
    const reason = signatures === undefined ? undefined : literalRefusal(node);

    return reason === undefined ? node : fail(token, reason);
  };

  const numberOf = (token: Token, digits: Token, sign: number): FormulaNode => {
    const reason =
      signatures === undefined
        ? undefined
        : numberRefusal(digits.text.replace(locale.decimal, '.'));

    return reason === undefined
      ? { kind: 'number', value: sign * digits.value }
      : fail(token, reason);
  };

  const isOp = (text: string, ahead = 0): boolean =>
    peek(ahead).kind === TokenKind.Op && peek(ahead).text === text;

  const isPunct = (text: string, ahead = 0): boolean =>
    peek(ahead).kind === TokenKind.Punct && peek(ahead).text === text;

  const isMark = (text: string): boolean => isPunct(text) || isOp(text);

  const callsAhead = (): boolean => isPunct(FormulaChar.OpenParen) && peek().spaced !== true;

  const shaped = (node: FormulaNode): boolean => givesReference(node, signatures ?? NO_SIGNATURES);

  const area = (start: Token, node: FormulaNode): FormulaNode =>
    shaped(node) ? node : fail(start, FormulaFailureReason.Reference);

  const expectPunct = (text: string): void => {
    if (!isPunct(text)) {
      fail(
        peek(),
        peek().kind === TokenKind.End ? FormulaFailureReason.End : FormulaFailureReason.Token,
      );
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

    return end !== undefined && samePlace(end, place)
      ? next()
      : fail(token, FormulaFailureReason.Reference);
  };

  const cellRange = (place: SheetPlace, from: CellRef): FormulaNode => {
    next();
    const end = parseCell(rangeEnd(place).text);

    return end === undefined
      ? fail(peek(-1), FormulaFailureReason.Reference)
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

    return to === undefined
      ? fail(peek(-1), FormulaFailureReason.Reference)
      : { kind, ...place, from, to };
  };

  const cellEndAhead = (place: SheetPlace): boolean => {
    const end = peek(1);

    if (end.kind === TokenKind.Word) {
      return parseCell(end.text) !== undefined;
    }

    const endPlace = end.kind === TokenKind.Sheet ? placeOf(end, books) : undefined;
    const cell = peek(2);

    return (
      endPlace !== undefined &&
      samePlace(endPlace, place) &&
      cell.kind === TokenKind.Word &&
      parseCell(cell.text) !== undefined
    );
  };

  const cellReference = (place: SheetPlace, ref: CellRef): FormulaNode => {
    if (isOp(FormulaChar.Colon) && cellEndAhead(place)) {
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
        return numberOf(token, token, 1);
      case TokenKind.String:
        return checked(token, { kind: 'string', value: token.text });
      case TokenKind.Error:
        return { kind: 'error', code: isCellError(token.text) ? token.text : '#VALUE!' };
      case TokenKind.Word:
        return booleanOf(token, locale) ?? fail(token, FormulaFailureReason.Array);
      case TokenKind.Op:
        return token.text === UnaryOperator.Minus && peek().kind === TokenKind.Number
          ? numberOf(token, next(), -1)
          : fail(token, FormulaFailureReason.Array);
      default:
        return fail(token, FormulaFailureReason.Array);
    }
  };

  const array = (): FormulaNode => {
    const rows: FormulaNode[][] = [[]];

    rows.at(-1)?.push(constant(next()));

    while (isMark(locale.arrayColumn) || isMark(locale.arrayRow)) {
      if (isMark(locale.arrayRow)) {
        rows.push([]);
      }
      next();
      rows.at(-1)?.push(constant(next()));
    }
    expectPunct('}');
    return rows.every((row) => row.length === rows[0]?.length)
      ? { kind: 'array', rows }
      : fail(peek(-1), FormulaFailureReason.Array);
  };

  const argumentsOf = (starts: Token[]): FormulaNode[] => {
    const args: FormulaNode[] = [];

    if (isPunct(')')) {
      next();
      return args;
    }

    const argument = (): FormulaNode => {
      starts.push(peek());
      return isPunct(locale.argument) || isPunct(')') ? { kind: 'missing' } : expression();
    };

    args.push(argument());

    while (isPunct(locale.argument)) {
      next();
      args.push(argument());
    }
    expectPunct(')');
    return args;
  };

  const checkedCall = (token: Token, node: FormulaNode, starts: readonly Token[]): FormulaNode => {
    const refusal =
      signatures === undefined || node.kind !== FormulaNodeKind.Call
        ? undefined
        : callRefusal(node.name, node.args, signatures);

    if (refusal === undefined) {
      return node;
    }

    const blamed = refusal.argument === undefined ? token : (starts[refusal.argument] ?? token);

    return fail(blamed, refusal.reason, refusal);
  };

  const nestedArguments = (token: Token, starts: Token[]): FormulaNode[] => {
    if (calls === MAX_FORMULA_CALLS) {
      return fail(token, FormulaFailureReason.Nesting);
    }

    calls += 1;

    const args = argumentsOf(starts);

    calls -= 1;
    return args;
  };

  const applied = (callee: FormulaNode): FormulaNode => {
    let node = callee;

    while (callsAhead()) {
      const open = next();

      if (!shaped(node)) {
        return fail(open, FormulaFailureReason.Token);
      }

      node = { kind: 'apply', callee: node, args: nestedArguments(open, []) };
    }
    return node;
  };

  const call = (token: Token): FormulaNode => {
    const name = canonicalFunction(token.text, locale);
    const starts: Token[] = [];
    const args = nestedArguments(token, starts);
    const [only] = args;

    return name === FunctionName.Single && args.length === 1 && only !== undefined
      ? { kind: 'unary', op: '@', operand: only }
      : applied(checkedCall(token, { kind: 'call', name, args }, starts));
  };

  const word = (token: Token): FormulaNode => {
    if (callsAhead()) {
      next();
      return call(token);
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
    lostReference(place, token) ??
    (token.kind === TokenKind.Word && !isPunct('(') && booleanOf(token, locale) === undefined
      ? { kind: 'name', ...place, name: token.text }
      : fail(token, FormulaFailureReason.Reference));

  const primary = (): FormulaNode => {
    const token = next();

    switch (token.kind) {
      case TokenKind.Number:
        return reference({}, token) ?? numberOf(token, token, 1);
      case TokenKind.String:
      case TokenKind.Error:
        return constant(token);
      case TokenKind.Word:
        return word(token);
      case TokenKind.Sheet: {
        const place = placeOf(token, books);

        return place === undefined
          ? fail(token, FormulaFailureReason.Reference)
          : sheetItem(place, next());
      }
      case TokenKind.Structured:
        return parseStructured(token.text, locale) ?? fail(token, FormulaFailureReason.Reference);
      case TokenKind.Punct:
        return group(token);
      default:
        return fail(
          token,
          token.kind === TokenKind.End ? FormulaFailureReason.End : FormulaFailureReason.Token,
        );
    }
  };

  const group = (token: Token): FormulaNode => {
    if (token.text === FormulaChar.OpenBrace) {
      return array();
    }
    if (token.text !== FormulaChar.OpenParen) {
      return fail(token, FormulaFailureReason.Token);
    }
    if (groups === MAX_FORMULA_GROUPS) {
      return fail(token, FormulaFailureReason.Nesting);
    }

    groups += 1;

    const start = peek();
    const inner = expression();
    const node = isPunct(locale.argument) ? union(start, inner) : inner;

    expectPunct(')');
    groups -= 1;
    return node;
  };

  const union = (start: Token, first: FormulaNode): FormulaNode => {
    const areas = [area(start, first)];

    while (isPunct(locale.argument)) {
      next();

      const item = peek();

      areas.push(area(item, expression()));
    }
    return { kind: 'union', areas };
  };

  const rangeOperand = (): FormulaNode => {
    const start = peek();

    return start.kind === TokenKind.Sheet
      ? fail(start, FormulaFailureReason.Reference)
      : area(start, primary());
  };

  const rangeLevel = (): FormulaNode => {
    const start = peek();
    let node = primary();

    while (isOp(FormulaChar.Colon)) {
      const left = area(start, node);

      next();
      node = { kind: 'areas', op: AreaOperator.Range, left, right: rangeOperand() };
    }
    return node;
  };

  const intersectionLevel = (): FormulaNode => {
    let node = rangeLevel();

    while (startsArea(peek()) && shaped(node)) {
      const start = peek();

      node = {
        kind: 'areas',
        op: AreaOperator.Intersection,
        left: node,
        right: area(start, rangeLevel()),
      };
    }
    return node;
  };

  const unary = (): FormulaNode => {
    const signs: UnaryOperator[] = [];

    for (let sign = signOf(peek()); sign !== undefined; sign = signOf(peek())) {
      if (signs.length === MAX_FORMULA_SIGNS) {
        return fail(peek(), FormulaFailureReason.Nesting);
      }

      signs.push(sign);
      next();
    }
    return signs.reduceRight<FormulaNode>(
      (operand, op) => ({ kind: 'unary', op, operand }),
      intersectionLevel(),
    );
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
        fail(peek(), FormulaFailureReason.Token);
      }
      return ast;
    },
  };
};

const lostReference = (place: SheetPlace, token: Token): FormulaNode | undefined =>
  token.kind === TokenKind.Error && token.text === LOST_REFERENCE
    ? { kind: 'error', code: LOST_REFERENCE, ...place }
    : undefined;

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

const depthChecked = (
  ast: FormulaNode,
  tokens: readonly Token[],
  text: string,
): FormulaParse | undefined =>
  tokens.length > MAX_FORMULA_DEPTH && formulaDepth(ast) > MAX_FORMULA_DEPTH
    ? { ok: false, error: { position: text.length, reason: FormulaFailureReason.Depth } }
    : undefined;

const lengthChecked = (
  ast: FormulaNode,
  text: string,
  origin: CellAddress,
  { signatures }: ParseOptions,
): FormulaParse => {
  const long =
    signatures !== undefined && printFormula(ast, EN_FORMULAS, origin).length > MAX_FORMULA_TEXT;

  return long
    ? { ok: false, error: { position: text.length, reason: FormulaFailureReason.LongFormula } }
    : { ok: true, ast };
};

export const parseFormula = (
  text: string,
  locale: FormulaLocale = EN_FORMULAS,
  origin: CellAddress = ORIGIN,
  options: ParseOptions = {},
): FormulaParse => {
  const source = text.startsWith('=') ? text.slice(1) : text;
  const offset = text.length - source.length;
  const tokens = tokenize(source, locale);

  if (!Array.isArray(tokens)) {
    return {
      ok: false,
      error: { position: tokens.position + offset, reason: FormulaFailureReason.Token },
    };
  }
  try {
    const parsed = createParser(tokens, locale, offset, options).formula();

    return (
      depthChecked(parsed, tokens, text) ??
      lengthChecked(relativeFormula(parsed, origin), text, origin, options)
    );
  } catch (error) {
    if (error instanceof FormulaSyntaxError) {
      return { ok: false, error: error.failure };
    }
    throw error;
  }
};
