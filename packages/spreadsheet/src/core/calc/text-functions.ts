import { EN_NUMBERS } from '../format/number-locale';
import { numberValue, textValue } from '../values';
import { MANY } from './aggregate';
import { matrixOf } from './array';
import type { EvalValue, FunctionArgs, FunctionSpec } from './calc.types';
import { numberFromText, raise, toText } from './coerce';
import { wildcardSource } from './criteria';
import { defineFunction } from './registry';

const MAX_TEXT = 32_767;

const WINDOWS_1252 = [
  0x20_ac, 0x81, 0x20_1a, 0x1_92, 0x20_1e, 0x20_26, 0x20_20, 0x20_21, 0x2_c6, 0x20_30, 0x1_60,
  0x20_39, 0x1_52, 0x8d, 0x1_7d, 0x8f, 0x90, 0x20_18, 0x20_19, 0x20_1c, 0x20_1d, 0x20_22, 0x20_13,
  0x20_14, 0x2_dc, 0x21_22, 0x1_61, 0x20_3a, 0x1_53, 0x9d, 0x1_7e, 0x1_78,
];

const LETTER = /\p{L}/u;

const PRINTABLE = 32;

const limited = (text: string): EvalValue =>
  text.length > MAX_TEXT ? raise('#VALUE!') : textValue(text);

const count = (args: FunctionArgs, index: number, fallback: number): number => {
  const value = Math.trunc(args.number(index, fallback));

  return value < 0 ? raise('#VALUE!') : value;
};

const proper = (text: string): string => {
  let previous = false;
  let result = '';

  for (const char of text) {
    const letter = LETTER.test(char);

    result += letter && !previous ? char.toUpperCase() : char.toLowerCase();
    previous = letter;
  }
  return result;
};

const substitute = (args: FunctionArgs): string => {
  const text = args.text(0);
  const old = args.text(1);
  const replacement = args.text(2);

  if (old === '') {
    return text;
  }
  if (args.missing(3)) {
    return text.replaceAll(old, replacement);
  }
  const instance = Math.trunc(args.number(3));
  let at = -1;

  if (instance < 1) {
    return raise('#VALUE!');
  }
  for (let seen = 0; seen < instance; seen += 1) {
    at = text.indexOf(old, at + 1);
    if (at < 0) {
      return text;
    }
  }
  return text.slice(0, at) + replacement + text.slice(at + old.length);
};

const startOf = (args: FunctionArgs, within: string): number => {
  const start = Math.trunc(args.number(2, 1));

  return start < 1 || start > within.length + 1 ? raise('#VALUE!') : start - 1;
};

const find = (args: FunctionArgs, wildcards: boolean): number => {
  const wanted = args.text(0);
  const within = args.text(1);
  const start = startOf(args, within);

  if (!wildcards) {
    const at = within.indexOf(wanted, start);

    return at < 0 ? raise('#VALUE!') : at + 1;
  }
  const at = within.slice(start).search(new RegExp(wildcardSource(wanted), 'iu'));

  return at < 0 ? raise('#VALUE!') : start + at + 1;
};

const fromWindows = (code: number): string => {
  if (code < 1 || code > 255) {
    return raise('#VALUE!');
  }
  return String.fromCodePoint(
    code >= 0x80 && code < 0xa0 ? (WINDOWS_1252[code - 0x80] ?? code) : code,
  );
};

const toWindows = (text: string): number => {
  const code = text.codePointAt(0) ?? raise('#VALUE!');
  const mapped = WINDOWS_1252.indexOf(code);

  if (mapped >= 0) {
    return 0x80 + mapped;
  }
  return code < 0x80 || (code >= 0xa0 && code <= 0xff) ? code : 63;
};

const numberValueOf = (args: FunctionArgs): number => {
  const decimal = args.missing(1) ? '.' : args.text(1).slice(0, 1);
  const group = args.missing(2) ? ',' : args.text(2).slice(0, 1);
  const text = args.text(0).replaceAll(/\s/gu, '');
  const percents = /%*$/u.exec(text)?.[0].length ?? 0;

  const body = text
    .slice(0, text.length - percents)
    .replaceAll(group, '')
    .replace(decimal, '.');

  if (body === '') {
    return 0;
  }
  const parsed = numberFromText(body, EN_NUMBERS);

  return parsed === undefined ? raise('#VALUE!') : parsed / 100 ** percents;
};

const piecesOf = (args: FunctionArgs, from: number, keepEmpty: boolean): string[] => {
  const pieces: string[] = [];

  for (let index = from; index < args.count; index += 1) {
    const value = args.value(index);

    if (keepEmpty && value.kind === 'reference') {
      matrixOf(value).forEach((row) => {
        row.forEach((cell) => pieces.push(toText(cell, args.locale)));
      });
    } else {
      args.forEachValue(
        index,
        (cell) => {
          pieces.push(toText(cell, args.locale));
        },
        index + 1,
      );
    }
  }
  return pieces;
};

const textJoin = (args: FunctionArgs): EvalValue => {
  const delimiters = matrixOf(args.value(0))
    .flat()
    .map((cell) => toText(cell, args.locale));

  const keepEmpty = !args.logical(1);
  const pieces = piecesOf(args, 2, keepEmpty).filter((piece) => keepEmpty || piece !== '');

  return limited(
    pieces.reduce(
      (joined, piece, index) =>
        index === 0 ? piece : joined + (delimiters[(index - 1) % delimiters.length] ?? '') + piece,
      '',
    ),
  );
};

const occurrence = (
  args: FunctionArgs,
  text: string,
): { start: number; end: number } | undefined => {
  const delimiter = args.text(1);
  const instance = Math.trunc(args.number(2, 1));
  const folded = args.number(3, 0) === 0 ? text : text.toLowerCase();
  const wanted = args.number(3, 0) === 0 ? delimiter : delimiter.toLowerCase();
  const positions: number[] = [];

  if (instance === 0 || Math.abs(instance) > text.length + 1) {
    return raise('#VALUE!');
  }
  for (
    let at = folded.indexOf(wanted);
    at >= 0;
    at = folded.indexOf(wanted, at + Math.max(1, wanted.length))
  ) {
    positions.push(at);
  }

  const start = instance > 0 ? positions[instance - 1] : positions[positions.length + instance];

  return start === undefined ? undefined : { start, end: start + wanted.length };
};

const around = (args: FunctionArgs, before: boolean): EvalValue => {
  const text = args.text(0);
  const found = occurrence(args, text);

  if (found === undefined) {
    return args.missing(5) ? raise('#N/A') : args.value(5);
  }
  return textValue(before ? text.slice(0, found.start) : text.slice(found.end));
};

const textual = (
  name: string,
  min: number,
  max: number,
  compute: (args: FunctionArgs) => EvalValue,
): FunctionSpec =>
  defineFunction({
    name,
    min,
    max,
    lift: Array.from({ length: max }, (_, index) => index),
    evaluate: compute,
  });

export const TEXT_FUNCTIONS: readonly FunctionSpec[] = [
  defineFunction({
    name: 'CONCAT',
    min: 1,
    max: MANY,
    evaluate: (args) => limited(piecesOf(args, 0, false).join('')),
  }),
  textual('CONCATENATE', 1, MANY, (args) =>
    limited(Array.from({ length: args.count }, (_, index) => args.text(index)).join('')),
  ),
  defineFunction({ name: 'TEXTJOIN', min: 3, max: MANY, evaluate: textJoin }),
  textual('LEFT', 1, 2, (args) => textValue(args.text(0).slice(0, count(args, 1, 1)))),
  textual('RIGHT', 1, 2, (args) => {
    const text = args.text(0);
    const length = count(args, 1, 1);

    return textValue(length === 0 ? '' : text.slice(-length));
  }),
  textual('MID', 3, 3, (args) => {
    const start = Math.trunc(args.number(1));

    return start < 1
      ? raise('#VALUE!')
      : textValue(args.text(0).slice(start - 1, start - 1 + count(args, 2, 0)));
  }),
  textual('LEN', 1, 1, (args) => numberValue(args.text(0).length)),
  textual('LOWER', 1, 1, (args) => textValue(args.text(0).toLowerCase())),
  textual('UPPER', 1, 1, (args) => textValue(args.text(0).toUpperCase())),
  textual('PROPER', 1, 1, (args) => textValue(proper(args.text(0)))),
  textual('TRIM', 1, 1, (args) => textValue(args.text(0).replaceAll(/ +/gu, ' ').trim())),
  textual('CLEAN', 1, 1, (args) =>
    textValue(
      args
        .text(0)
        .split('')
        .filter((char) => char.charCodeAt(0) >= PRINTABLE)
        .join(''),
    ),
  ),
  textual('SUBSTITUTE', 3, 4, (args) => textValue(substitute(args))),
  textual('REPLACE', 4, 4, (args) => {
    const text = args.text(0);
    const start = Math.trunc(args.number(1));

    return start < 1
      ? raise('#VALUE!')
      : textValue(
          text.slice(0, start - 1) + args.text(3) + text.slice(start - 1 + count(args, 2, 0)),
        );
  }),
  textual('FIND', 2, 3, (args) => numberValue(find(args, false))),
  textual('SEARCH', 2, 3, (args) => numberValue(find(args, true))),
  textual('EXACT', 2, 2, (args) => ({ kind: 'boolean', value: args.text(0) === args.text(1) })),
  textual('REPT', 2, 2, (args) => limited(args.text(0).repeat(count(args, 1, 0)))),
  textual('CHAR', 1, 1, (args) => textValue(fromWindows(Math.trunc(args.number(0))))),
  textual('CODE', 1, 1, (args) => numberValue(toWindows(args.text(0)))),
  textual('UNICHAR', 1, 1, (args) => {
    const code = Math.trunc(args.number(0));

    return code < 1 || code > 0x10_ff_ff ? raise('#VALUE!') : textValue(String.fromCodePoint(code));
  }),
  textual('UNICODE', 1, 1, (args) => numberValue(args.text(0).codePointAt(0) ?? raise('#VALUE!'))),
  textual('VALUE', 1, 1, (args) => {
    const value = args.scalar(0);

    if (value.kind === 'number') {
      return value;
    }
    const text = args.text(0).trim();

    return text === ''
      ? numberValue(0)
      : numberValue(numberFromText(text, args.locale) ?? raise('#VALUE!'));
  }),
  textual('NUMBERVALUE', 1, 3, (args) => numberValue(numberValueOf(args))),
  textual('T', 1, 1, (args) => {
    const value = args.scalar(0);

    return value.kind === 'error'
      ? raise(value.code)
      : textValue(value.kind === 'string' ? value.value : '');
  }),
  textual('TEXTBEFORE', 2, 6, (args) => around(args, true)),
  textual('TEXTAFTER', 2, 6, (args) => around(args, false)),
];
