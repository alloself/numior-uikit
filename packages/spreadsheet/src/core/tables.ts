import { LineAxis, type CellError, type CellRange, type TableShiftKind } from './cell.types';
import { StructuredArea, type StructuredColumns } from './formula/formula.types';
import { shiftSpan, type LineChange } from './formula/rewrite';

export interface TableShape {
  readonly range: CellRange;
  readonly columns: readonly string[];
  readonly headers: boolean;
  readonly totals: boolean;
}

export type TableShift =
  | { readonly kind: typeof TableShiftKind.Same }
  | { readonly kind: typeof TableShiftKind.Moved; readonly shape: TableShape }
  | { readonly kind: typeof TableShiftKind.Removed };

type Span = readonly [number, number];

export interface StructuredPart {
  readonly area: StructuredArea;
  readonly columns?: StructuredColumns | undefined;
}

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

const columnOf = (table: TableShape, name: string): number | undefined => {
  const wanted = name.toLowerCase();
  const index = table.columns.findIndex((column) => column.toLowerCase() === wanted);

  return index < 0 ? undefined : index;
};

const areaRows = (
  table: TableShape,
  area: StructuredArea,
  row: number,
): readonly [number, number] | CellError => {
  const data = tableData(table);

  switch (area) {
    case StructuredArea.All:
      return [table.range.top, table.range.bottom];
    case StructuredArea.Data:
      return [data.top, data.bottom];
    case StructuredArea.Headers:
      return table.headers ? [table.range.top, table.range.top] : '#REF!';
    case StructuredArea.Totals:
      return table.totals ? [table.range.bottom, table.range.bottom] : '#REF!';
    case StructuredArea.HeadersData:
      return [table.range.top, data.bottom];
    case StructuredArea.DataTotals:
      return [data.top, table.range.bottom];
    case StructuredArea.Row:
      return row >= data.top && row <= data.bottom ? [row, row] : '#VALUE!';
  }
};

export const structuredRange = (
  table: TableShape,
  part: StructuredPart,
  row: number,
): CellRange | CellError => {
  const rows = areaRows(table, part.area, row);
  const from = part.columns === undefined ? 0 : columnOf(table, part.columns.from);

  const to =
    part.columns === undefined ? table.columns.length - 1 : columnOf(table, part.columns.to);

  if (typeof rows === 'string') {
    return rows;
  }
  if (from === undefined || to === undefined) {
    return '#REF!';
  }
  return {
    top: rows[0],
    bottom: rows[1],
    left: table.range.left + Math.min(from, to),
    right: table.range.left + Math.max(from, to),
  };
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
  const columns = shape.columns;

  if (change.at <= shape.range.left) {
    return columns.slice(0, width);
  }
  const fresh: string[] = [];
  const at = change.at - shape.range.left;

  while (columns.length + fresh.length < width) {
    fresh.push(freeColumnName([...columns, ...fresh], prefix));
  }
  return [...columns.slice(0, at), ...fresh, ...columns.slice(at)].slice(0, width);
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
  const rows = change.axis === LineAxis.Rows;
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
