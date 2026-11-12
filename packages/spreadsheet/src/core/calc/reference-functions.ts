import { MAX_COLS, MAX_ROWS, formatCell } from '../address';
import type { CellRange } from '../cell.types';
import { numberValue, textValue } from '../values';
import { areasOf } from './areas';
import { buildArray, shapeOf } from './array';
import { EvalValueKind, type EvalValue, type FunctionArgs, type FunctionSpec } from './calc.types';
import { raise } from './coerce';
import { defineFunction } from './registry';
import { firstArgument } from './signatures';

const PLAIN_SHEET = /^[\p{L}_][\p{L}\p{N}_.]*$/u;

const rangeOf = (value: EvalValue): CellRange =>
  value.kind === EvalValueKind.Reference ? value.range : raise('#VALUE!');

const position = (args: FunctionArgs, rows: boolean): EvalValue => {
  if (args.missing(0)) {
    const here = args.here();

    return numberValue((rows ? here.row : here.col) + 1);
  }
  const range = rangeOf(args.value(0));
  const size = rows ? range.bottom - range.top + 1 : range.right - range.left + 1;
  const first = rows ? range.top : range.left;

  if (size === 1) {
    return numberValue(first + 1);
  }
  return buildArray({ rows: rows ? size : 1, cols: rows ? 1 : size }, (row, col) =>
    numberValue(first + (rows ? row : col) + 1),
  );
};

const sheetPrefix = (args: FunctionArgs): string => {
  if (args.missing(4)) {
    return '';
  }
  const name = args.text(4);

  return PLAIN_SHEET.test(name) ? `${name}!` : `'${name.replaceAll("'", "''")}'!`;
};

const relative = (index: number, absolute: boolean, letter: string): string =>
  absolute ? `${letter}${String(index)}` : `${letter}[${String(index)}]`;

const address = (args: FunctionArgs): EvalValue => {
  const row = Math.trunc(args.number(0));
  const col = Math.trunc(args.number(1));
  const mode = Math.trunc(args.number(2, 1));

  if (row < 1 || row > MAX_ROWS || col < 1 || col > MAX_COLS || mode < 1 || mode > 4) {
    return raise('#VALUE!');
  }
  const rowAbsolute = mode === 1 || mode === 2;
  const colAbsolute = mode === 1 || mode === 3;

  const text = args.logical(3, true)
    ? formatCell({ row: row - 1, col: col - 1, rowAbsolute, colAbsolute })
    : `${relative(row, rowAbsolute, 'R')}${relative(col, colAbsolute, 'C')}`;

  return textValue(sheetPrefix(args) + text);
};

const offset = (args: FunctionArgs): EvalValue => {
  const base = args.value(0);

  if (base.kind !== EvalValueKind.Reference) {
    return raise('#VALUE!');
  }
  const { range } = base;
  const top = range.top + Math.trunc(args.number(1));
  const left = range.left + Math.trunc(args.number(2));
  const height = Math.trunc(args.number(3, range.bottom - range.top + 1));
  const width = Math.trunc(args.number(4, range.right - range.left + 1));
  const bottom = top + height - 1;
  const right = left + width - 1;

  if (height < 1 || width < 1 || top < 0 || left < 0 || bottom >= MAX_ROWS || right >= MAX_COLS) {
    return raise('#REF!');
  }
  return args.refer(base.sheet, { top, left, bottom, right });
};

export const REFERENCE_FUNCTIONS: readonly FunctionSpec[] = [
  defineFunction({
    name: 'AREAS',
    unreadAt: firstArgument,
    min: 1,
    max: 1,
    referenceAt: firstArgument,
    evaluate: (args) => numberValue(areasOf(args.value(0)).ranges.length),
  }),
  defineFunction({
    name: 'ROW',
    unreadAt: firstArgument,
    min: 0,
    max: 1,
    referenceAt: firstArgument,
    evaluate: (args) => position(args, true),
  }),
  defineFunction({
    name: 'COLUMN',
    unreadAt: firstArgument,
    min: 0,
    max: 1,
    referenceAt: firstArgument,
    evaluate: (args) => position(args, false),
  }),
  defineFunction({
    name: 'ROWS',
    unreadAt: firstArgument,
    min: 1,
    max: 1,
    evaluate: (args) => numberValue(shapeOf(args.value(0)).rows),
  }),
  defineFunction({
    name: 'COLUMNS',
    unreadAt: firstArgument,
    min: 1,
    max: 1,
    evaluate: (args) => numberValue(shapeOf(args.value(0)).cols),
  }),
  defineFunction({ name: 'ADDRESS', min: 2, max: 5, lift: [0, 1], evaluate: address }),
  defineFunction({
    name: 'OFFSET',
    unreadAt: firstArgument,
    min: 3,
    max: 5,
    volatile: true,
    referenceAt: firstArgument,
    givesReference: true,
    evaluate: offset,
  }),
  defineFunction({
    name: 'INDIRECT',
    min: 1,
    max: 2,
    givesReference: true,
    volatile: true,
    evaluate: (args) => args.indirect(args.text(0), args.logical(1, true)),
  }),
];
