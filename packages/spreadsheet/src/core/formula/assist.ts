import { FormulaChar, TokenKind, type FormulaLocale } from './formula.types';
import { tokenize, type Token } from './lexer';
import { EN_FORMULAS } from './locale';

export interface FunctionPrefix {
  readonly start: number;
  readonly text: string;
}

export interface FunctionCall {
  readonly name: string;
  readonly argument: number;
}

interface CallFrame {
  readonly name: string | undefined;
  readonly argument: number;
}

const FUNCTION_NAME = /^[\p{L}_][\p{L}\p{N}_.]*$/u;

const WORD_PART = /[\p{L}\p{N}_.$]/u;

const tokensBefore = (text: string, caret: number, locale: FormulaLocale): Token[] | undefined => {
  if (!text.startsWith(FormulaChar.Equals)) {
    return undefined;
  }

  const tokens = tokenize(text.slice(1, caret), locale);

  return Array.isArray(tokens) ? tokens.filter((token) => token.kind !== TokenKind.End) : undefined;
};

const closes = (token: Token): boolean =>
  token.text === FormulaChar.CloseParen || token.text === FormulaChar.CloseBrace;

const opensOperand = (token: Token | undefined): boolean =>
  token === undefined ||
  token.kind === TokenKind.Op ||
  (token.kind === TokenKind.Punct && !closes(token));

export const functionPrefixAt = (
  text: string,
  caret: number,
  locale: FormulaLocale = EN_FORMULAS,
): FunctionPrefix | undefined => {
  const tokens = tokensBefore(text, caret, locale);
  const last = tokens?.at(-1);

  const ready =
    last !== undefined &&
    last.kind === TokenKind.Word &&
    FUNCTION_NAME.test(last.text) &&
    last.start + last.text.length === caret - 1 &&
    !WORD_PART.test(text[caret] ?? '') &&
    opensOperand(tokens?.at(-2));

  return ready ? { start: last.start + 1, text: last.text } : undefined;
};

const bumped = (frames: readonly CallFrame[]): CallFrame[] => {
  const top = frames.at(-1);

  return top === undefined
    ? [...frames]
    : [...frames.slice(0, -1), { ...top, argument: top.argument + 1 }];
};

const framesAfter = (
  frames: readonly CallFrame[],
  token: Token,
  previous: Token | undefined,
  locale: FormulaLocale,
): CallFrame[] => {
  if (token.kind !== TokenKind.Punct) {
    return [...frames];
  }
  if (token.text === FormulaChar.OpenParen) {
    const name = previous?.kind === TokenKind.Word ? previous.text : undefined;

    return [...frames, { name, argument: 0 }];
  }
  if (token.text === FormulaChar.OpenBrace) {
    return [...frames, { name: undefined, argument: 0 }];
  }
  if (closes(token)) {
    return frames.slice(0, -1);
  }
  return token.text === locale.argument ? bumped(frames) : [...frames];
};

export const functionCallAt = (
  text: string,
  caret: number,
  locale: FormulaLocale = EN_FORMULAS,
): FunctionCall | undefined => {
  const tokens = tokensBefore(text, caret, locale) ?? [];

  const frames = tokens.reduce<CallFrame[]>(
    (open, token, index) => framesAfter(open, token, tokens[index - 1], locale),
    [],
  );

  const call = frames.findLast((frame) => frame.name !== undefined);

  return call?.name === undefined ? undefined : { name: call.name, argument: call.argument };
};
