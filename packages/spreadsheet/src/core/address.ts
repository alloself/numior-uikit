import type { CellAddress, CellRange, CellRef } from './cell.types';

export const MAX_ROWS = 1_048_576;

export const MAX_COLS = 16_384;

const LETTERS = 26;

const CELL = /^(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7})$/u;

const COLUMN = /^\$?([A-Za-z]{1,3})$/u;

const ROW = /^\$?(\d{1,7})$/u;

export const columnName = (index: number): string => {
  let name = '';

  for (let rest = index + 1; rest > 0; rest = Math.floor((rest - 1) / LETTERS)) {
    name = String.fromCodePoint(65 + ((rest - 1) % LETTERS)) + name;
  }
  return name;
};

export const columnIndex = (name: string): number | undefined => {
  let index = 0;

  for (const letter of name.toUpperCase()) {
    const code = letter.codePointAt(0) ?? 0;

    if (code < 65 || code > 90) {
      return undefined;
    }
    index = index * LETTERS + (code - 64);
  }
  return index > 0 && index <= MAX_COLS ? index - 1 : undefined;
};

const rowIndex = (digits: string): number | undefined => {
  const row = Number.parseInt(digits, 10);

  return row >= 1 && row <= MAX_ROWS ? row - 1 : undefined;
};

export const parseCell = (text: string): CellRef | undefined => {
  const match = CELL.exec(text);
  const col = match?.[2] === undefined ? undefined : columnIndex(match[2]);
  const row = match?.[4] === undefined ? undefined : rowIndex(match[4]);

  return match === null || col === undefined || row === undefined
    ? undefined
    : { row, col, colAbsolute: match[1] === '$', rowAbsolute: match[3] === '$' };
};

export const formatCell = (ref: CellAddress & Partial<CellRef>): string =>
  `${ref.colAbsolute === true ? '$' : ''}${columnName(ref.col)}${ref.rowAbsolute === true ? '$' : ''}${String(ref.row + 1)}`;

export const cellIndex = (row: number, col: number): number => row * MAX_COLS + col;

export const addressOf = (index: number): CellAddress => ({
  row: Math.floor(index / MAX_COLS),
  col: index % MAX_COLS,
});

export const rangeOf = (from: CellAddress, to: CellAddress): CellRange => ({
  top: Math.min(from.row, to.row),
  left: Math.min(from.col, to.col),
  bottom: Math.max(from.row, to.row),
  right: Math.max(from.col, to.col),
});

const columnsRange = (from: string, to: string): CellRange | undefined => {
  const left = COLUMN.exec(from)?.[1];
  const right = COLUMN.exec(to)?.[1];
  const start = left === undefined ? undefined : columnIndex(left);
  const end = right === undefined ? undefined : columnIndex(right);

  return start === undefined || end === undefined
    ? undefined
    : rangeOf({ row: 0, col: start }, { row: MAX_ROWS - 1, col: end });
};

const rowsRange = (from: string, to: string): CellRange | undefined => {
  const top = ROW.exec(from)?.[1];
  const bottom = ROW.exec(to)?.[1];
  const start = top === undefined ? undefined : rowIndex(top);
  const end = bottom === undefined ? undefined : rowIndex(bottom);

  return start === undefined || end === undefined
    ? undefined
    : rangeOf({ row: start, col: 0 }, { row: end, col: MAX_COLS - 1 });
};

export const parseRange = (text: string): CellRange | undefined => {
  const [from = '', to = from, ...rest] = text.split(':');
  const start = parseCell(from);
  const end = parseCell(to);

  if (rest.length > 0) {
    return undefined;
  }
  if (start !== undefined && end !== undefined) {
    return rangeOf(start, end);
  }
  return columnsRange(from, to) ?? rowsRange(from, to);
};

export const formatRange = (range: CellRange): string => {
  const from = formatCell({ row: range.top, col: range.left });
  const to = formatCell({ row: range.bottom, col: range.right });

  return from === to ? from : `${from}:${to}`;
};

export const containsCell = (range: CellRange, row: number, col: number): boolean =>
  row >= range.top && row <= range.bottom && col >= range.left && col <= range.right;

export const rangeSize = (range: CellRange): number =>
  (range.bottom - range.top + 1) * (range.right - range.left + 1);
