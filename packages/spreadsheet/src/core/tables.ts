import type { CellRange } from './cell.types';
import { shiftSpan, type LineChange } from './formula/rewrite';

export interface TableShape {
  readonly range: CellRange;
  readonly columns: readonly string[];
  readonly headers: boolean;
  readonly totals: boolean;
}

export type TableShift =
  | { readonly kind: 'same' }
  | { readonly kind: 'moved'; readonly shape: TableShape }
  | { readonly kind: 'removed' };

type Span = readonly [number, number];

const SAME: TableShift = { kind: 'same' };

const REMOVED: TableShift = { kind: 'removed' };

export const tableData = (table: TableShape): CellRange => ({
  ...table.range,
  top: table.range.top + (table.headers ? 1 : 0),
  bottom: table.range.bottom - (table.totals ? 1 : 0),
});

export const dataRows = (table: TableShape): number => {
  const data = tableData(table);

  return data.bottom - data.top + 1;
};

export const rangesMeet = (left: CellRange, right: CellRange): boolean =>
  left.top <= right.bottom &&
  right.top <= left.bottom &&
  left.left <= right.right &&
  right.left <= left.right;

const taken = (names: readonly string[], name: string, skip: number): boolean =>
  names.some((other, index) => index !== skip && other.toLowerCase() === name.toLowerCase());

const freeColumnName = (names: readonly string[], prefix: string, skip = -1, from = 1): string => {
  let index = from;

  while (taken(names, `${prefix}${String(index)}`, skip)) {
    index += 1;
  }
  return `${prefix}${String(index)}`;
};

export const columnNameAt = (
  names: readonly string[],
  index: number,
  text: string,
  prefix: string,
): string => {
  const wanted = text.replaceAll(/[\r\n]+/gu, ' ').trim();

  if (wanted === '') {
    return freeColumnName(names, prefix, index);
  }
  return taken(names, wanted, index) ? freeColumnName(names, wanted, index, 2) : wanted;
};

export const uniqueColumns = (texts: readonly string[], prefix: string): string[] =>
  texts.reduce<string[]>((names, text, index) => {
    const others = text.trim() === '' ? [...names, ...texts.slice(index + 1)] : names;

    names.push(columnNameAt(others, -1, text, prefix));
    return names;
  }, []);

export const validColumns = (shape: TableShape): boolean =>
  shape.columns.length === shape.range.right - shape.range.left + 1 &&
  shape.columns.every((name, index) => name.trim() !== '' && !taken(shape.columns, name, index));

const deletes = (change: LineChange, line: number): boolean =>
  change.count < 0 && line >= change.at && line < change.at - change.count;

const shiftedRows = (shape: TableShape, change: LineChange, span: Span): TableShift => {
  if (shape.headers && deletes(change, shape.range.top)) {
    return REMOVED;
  }

  const moved: TableShape = {
    ...shape,
    range: { ...shape.range, top: span[0], bottom: span[1] },
    totals: shape.totals && !deletes(change, shape.range.bottom),
  };

  return dataRows(moved) < 1 ? REMOVED : { kind: 'moved', shape: moved };
};

const keptColumns = (shape: TableShape, change: LineChange): string[] =>
  shape.columns.filter((_name, index) => !deletes(change, shape.range.left + index));

const grownColumns = (
  shape: TableShape,
  change: LineChange,
  width: number,
  prefix: string,
): string[] => {
  const columns = shape.columns.slice();

  if (change.at > shape.range.left) {
    const fresh: string[] = [];

    while (columns.length + fresh.length < width) {
      fresh.push(freeColumnName([...columns, ...fresh], prefix));
    }
    columns.splice(change.at - shape.range.left, 0, ...fresh);
  }
  return columns.slice(0, width);
};

const shiftedColumns = (
  shape: TableShape,
  change: LineChange,
  span: Span,
  prefix: string,
): TableShift => {
  const width = span[1] - span[0] + 1;

  return {
    kind: 'moved',
    shape: {
      ...shape,
      range: { ...shape.range, left: span[0], right: span[1] },
      columns:
        change.count < 0 ? keptColumns(shape, change) : grownColumns(shape, change, width, prefix),
    },
  };
};

export const shiftTable = (shape: TableShape, change: LineChange, prefix: string): TableShift => {
  const rows = change.axis === 'rows';
  const { top, bottom, left, right } = shape.range;
  const before: Span = rows ? [top, bottom] : [left, right];
  const span = shiftSpan(before, change);

  if (span === undefined) {
    return REMOVED;
  }
  if (span[0] === before[0] && span[1] === before[1]) {
    return SAME;
  }
  return rows ? shiftedRows(shape, change, span) : shiftedColumns(shape, change, span, prefix);
};
