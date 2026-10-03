export type ContentExpr =
  | { readonly kind: 'name'; readonly name: string }
  | { readonly kind: 'seq'; readonly items: readonly ContentExpr[] }
  | { readonly kind: 'choice'; readonly options: readonly ContentExpr[] }
  | {
      readonly kind: 'repeat';
      readonly expr: ContentExpr;
      readonly min: number;
      readonly max: number;
    };

interface Cursor {
  readonly source: string;
  readonly tokens: readonly string[];
  position: number;
}

const TOKEN = /\s*([A-Za-z_][\w-]*|\d+|[()|*+?{},]|\S)/g;
const NAME = /^[A-Za-z_][\w-]*$/;
const COUNT = /^\d+$/;

const tokenize = (source: string): string[] =>
  [...source.matchAll(TOKEN)].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));

const expected = (cursor: Cursor, what: string): never => {
  throw new SyntaxError(`Expected ${what} at token ${cursor.position + 1} of "${cursor.source}"`);
};

const peek = (cursor: Cursor): string | undefined => cursor.tokens[cursor.position];

const take = (cursor: Cursor, token: string): boolean => {
  if (peek(cursor) !== token) {
    return false;
  }
  cursor.position += 1;
  return true;
};

const countOf = (cursor: Cursor): number => {
  const token = peek(cursor);

  if (token === undefined || !COUNT.test(token)) {
    return expected(cursor, 'a number');
  }
  cursor.position += 1;
  return Number(token);
};

const rangeOf = (cursor: Cursor, expr: ContentExpr): ContentExpr => {
  const min = countOf(cursor);
  let max = min;

  if (take(cursor, ',')) {
    max = peek(cursor) === '}' ? Number.POSITIVE_INFINITY : countOf(cursor);
  }
  if (!take(cursor, '}')) {
    return expected(cursor, '"}"');
  }
  if (max < min) {
    throw new SyntaxError(`Range {${min},${max}} is empty in "${cursor.source}"`);
  }
  return { kind: 'repeat', expr, min, max };
};

const SUFFIXES: Readonly<Record<string, { readonly min: number; readonly max: number }>> = {
  '*': { min: 0, max: Number.POSITIVE_INFINITY },
  '+': { min: 1, max: Number.POSITIVE_INFINITY },
  '?': { min: 0, max: 1 },
};

const suffixed = (cursor: Cursor, expr: ContentExpr): ContentExpr => {
  let result = expr;

  for (;;) {
    const token = peek(cursor) ?? '';
    const suffix = SUFFIXES[token];

    if (suffix !== undefined) {
      cursor.position += 1;
      result = { kind: 'repeat', expr: result, ...suffix };
    } else if (take(cursor, '{')) {
      result = rangeOf(cursor, result);
    } else {
      return result;
    }
  }
};

const atomOf = (cursor: Cursor): ContentExpr => {
  if (take(cursor, '(')) {
    const inner = choiceOf(cursor);

    return take(cursor, ')') ? inner : expected(cursor, '")"');
  }
  const token = peek(cursor);

  if (token === undefined || !NAME.test(token)) {
    return expected(cursor, 'a node type or a group');
  }
  cursor.position += 1;
  return { kind: 'name', name: token };
};

const startsTerm = (token: string | undefined): boolean =>
  token !== undefined && (token === '(' || NAME.test(token));

const sequenceOf = (cursor: Cursor): ContentExpr => {
  const items: ContentExpr[] = [];

  while (startsTerm(peek(cursor))) {
    items.push(suffixed(cursor, atomOf(cursor)));
  }
  return items.length === 1 && items[0] !== undefined ? items[0] : { kind: 'seq', items };
};

const choiceOf = (cursor: Cursor): ContentExpr => {
  const options = [sequenceOf(cursor)];

  while (take(cursor, '|')) {
    options.push(sequenceOf(cursor));
  }
  return options.length === 1 && options[0] !== undefined
    ? options[0]
    : { kind: 'choice', options };
};

export const parseContentExpression = (source: string): ContentExpr => {
  const cursor: Cursor = { source, tokens: tokenize(source), position: 0 };
  const expr = choiceOf(cursor);

  if (cursor.position < cursor.tokens.length) {
    return expected(cursor, 'the end');
  }
  return expr;
};
