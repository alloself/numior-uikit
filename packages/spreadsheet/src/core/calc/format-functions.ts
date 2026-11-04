import { CellValueKind, type CellValue } from '../cell.types';
import { renderValue } from '../format/format-value';
import { invariantCode } from '../format/local-code';
import { currencyFormat } from '../format/number-locale';
import { textValue } from '../values';
import type { FunctionArgs, FunctionSpec } from './calc.types';
import { numberFromText, raise } from './coerce';
import { defineFunction } from './registry';
import { roundHalfAway } from './rounding';

const MAX_DECIMALS = 127;

const shownValue = (args: FunctionArgs, index: number): CellValue => {
  const value = args.scalar(index);

  if (value.kind === CellValueKind.Error) {
    return raise(value.code);
  }
  if (value.kind === CellValueKind.Empty) {
    return { kind: 'number', value: 0 };
  }
  if (value.kind !== CellValueKind.String) {
    return value;
  }

  const number = numberFromText(value.value, args.locale);

  return number === undefined ? value : { kind: 'number', value: number };
};

const formatted = (value: CellValue, code: string, args: FunctionArgs): string =>
  renderValue(value, code, args.locale)?.text ?? raise('#VALUE!');

const decimalsOf = (args: FunctionArgs, index: number): number => {
  const decimals = Math.trunc(args.number(index, 2));

  return decimals > MAX_DECIMALS ? raise('#VALUE!') : decimals;
};

const roundedNumber = (args: FunctionArgs, decimals: number): CellValue => ({
  kind: 'number',
  value: roundHalfAway(args.number(0), decimals),
});

const fixedCode = (decimals: number, plain: boolean): string =>
  `${plain ? '0' : '#,##0'}${decimals > 0 ? `.${'0'.repeat(decimals)}` : ''}`;

const formatting = (
  name: string,
  min: number,
  max: number,
  compute: (args: FunctionArgs) => string,
): FunctionSpec =>
  defineFunction({
    name,
    min,
    max,
    lift: Array.from({ length: max }, (_, index) => index),
    evaluate: (args) => textValue(compute(args)),
  });

export const FORMAT_FUNCTIONS: readonly FunctionSpec[] = [
  formatting('TEXT', 2, 2, (args) =>
    formatted(shownValue(args, 0), invariantCode(args.text(1), args.locale), args),
  ),
  formatting('FIXED', 1, 3, (args) => {
    const decimals = decimalsOf(args, 1);

    return formatted(
      roundedNumber(args, decimals),
      fixedCode(Math.max(decimals, 0), args.logical(2, false)),
      args,
    );
  }),
  formatting('DOLLAR', 1, 2, (args) => {
    const decimals = decimalsOf(args, 1);

    return formatted(
      roundedNumber(args, decimals),
      currencyFormat(args.locale, Math.max(decimals, 0)),
      args,
    );
  }),
];
