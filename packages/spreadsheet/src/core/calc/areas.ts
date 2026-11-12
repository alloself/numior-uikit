import { CellError, CellValueKind, type CellRange } from '../cell.types';
import type { Sheet } from '../workbook';
import type { Reference } from './aggregate';
import { EvalValueKind, type AreasValue, type EvalValue } from './calc.types';
import { raise } from './coerce';

export const AREA_READERS: ReadonlySet<string> = new Set([
  'AND',
  'AREAS',
  'AVEDEV',
  'AVERAGE',
  'AVERAGEA',
  'CHOOSE',
  'COUNT',
  'COUNTA',
  'DEVSQ',
  'GEOMEAN',
  'HARMEAN',
  'IF',
  'INDEX',
  'IRR',
  'ISREF',
  'LARGE',
  'MAX',
  'MAXA',
  'MEDIAN',
  'MIN',
  'MINA',
  'MIRR',
  'NPV',
  'OR',
  'PERCENTILE',
  'PERCENTILE.EXC',
  'PERCENTILE.INC',
  'PRODUCT',
  'QUARTILE',
  'QUARTILE.EXC',
  'QUARTILE.INC',
  'RANK',
  'RANK.EQ',
  'SMALL',
  'STDEV',
  'STDEV.P',
  'STDEV.S',
  'STDEVP',
  'SUBTOTAL',
  'SUM',
  'SUMSQ',
  'VAR',
  'VAR.P',
  'VAR.S',
  'VARP',
  'XOR',
]);

export const AREA_ERRORS: ReadonlyMap<string, CellError> = new Map([
  ['COLUMN', CellError.Ref],
  ['COLUMNS', CellError.Ref],
  ['ROW', CellError.Ref],
  ['ROWS', CellError.Ref],
  ['HLOOKUP', CellError.Na],
  ['LOOKUP', CellError.Na],
  ['MATCH', CellError.Na],
  ['VLOOKUP', CellError.Na],
  ['XLOOKUP', CellError.Na],
  ['XMATCH', CellError.Na],
]);

export const areasOf = (value: EvalValue): AreasValue => {
  switch (value.kind) {
    case EvalValueKind.Reference:
      return { kind: EvalValueKind.Areas, sheet: value.sheet, ranges: [value.range] };
    case EvalValueKind.Areas:
      return value;
    case CellValueKind.Error:
      return raise(value.code);
    default:
      return raise(CellError.Value);
  }
};

export const eachArea = (value: EvalValue, visit: (area: Reference) => void): void => {
  const { sheet, ranges } = areasOf(value);

  for (const range of ranges) {
    visit({ kind: EvalValueKind.Reference, sheet, range });
  }
};

const sheetOf = (parts: readonly AreasValue[]): Sheet => {
  const sheet = parts[0]?.sheet;

  return sheet !== undefined && parts.every((part) => part.sheet === sheet)
    ? sheet
    : raise(CellError.Value);
};

const areasValue = (sheet: Sheet, ranges: readonly CellRange[]): EvalValue => {
  const [only] = ranges;

  if (ranges.length > 1) {
    return { kind: EvalValueKind.Areas, sheet, ranges };
  }
  return only === undefined
    ? raise(CellError.Null)
    : { kind: EvalValueKind.Reference, sheet, range: only };
};

const overlap = (one: CellRange, other: CellRange): CellRange | undefined => {
  const range = {
    top: Math.max(one.top, other.top),
    left: Math.max(one.left, other.left),
    bottom: Math.min(one.bottom, other.bottom),
    right: Math.min(one.right, other.right),
  };

  return range.top > range.bottom || range.left > range.right ? undefined : range;
};

const bounds = (outer: CellRange, range: CellRange): CellRange => ({
  top: Math.min(outer.top, range.top),
  left: Math.min(outer.left, range.left),
  bottom: Math.max(outer.bottom, range.bottom),
  right: Math.max(outer.right, range.right),
});

export const spanOf = (left: EvalValue, right: EvalValue): Reference => {
  const from = areasOf(left);
  const to = areasOf(right);
  const sheet = sheetOf([from, to]);
  const [first, ...rest] = [...from.ranges, ...to.ranges];

  return first === undefined
    ? raise(CellError.Value)
    : { kind: EvalValueKind.Reference, sheet, range: rest.reduce(bounds, first) };
};

export const intersectionOf = (left: EvalValue, right: EvalValue): EvalValue => {
  const one = areasOf(left);
  const other = areasOf(right);
  const sheet = sheetOf([one, other]);
  const ranges: CellRange[] = [];

  for (const range of one.ranges) {
    for (const crossing of other.ranges) {
      const shared = overlap(range, crossing);

      if (shared === undefined) {
        continue;
      }

      ranges.push(shared);
    }
  }
  return areasValue(sheet, ranges);
};

export const unionOf = (values: readonly EvalValue[]): EvalValue => {
  const parts = values.map(areasOf);

  return areasValue(
    sheetOf(parts),
    parts.flatMap((part) => part.ranges),
  );
};
