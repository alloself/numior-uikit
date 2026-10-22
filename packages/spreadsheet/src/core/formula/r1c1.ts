import { MAX_COLS, MAX_ROWS, columnName } from '../address';
import type { CellAddress } from '../cell.types';

const PART = /^(?:R(\[-?\d+\]|\d+)?)?(?:C(\[-?\d+\]|\d+)?)?$/iu;

const lineOf = (text: string | undefined, base: number, limit: number): number | undefined => {
  if (text === undefined) {
    return base;
  }

  const index = text.startsWith('[') ? base + Number(text.slice(1, -1)) : Number(text) - 1;

  return index >= 0 && index < limit ? index : undefined;
};

const partOf = (text: string, here: CellAddress): string | undefined => {
  const found = PART.exec(text);
  const upper = text.toUpperCase();
  const rows = upper.startsWith('R');
  const cols = upper.includes('C');

  if (found === null || text === '' || (!rows && !cols)) {
    return undefined;
  }

  const row = rows ? lineOf(found[1], here.row, MAX_ROWS) : 0;
  const col = cols ? lineOf(found[2], here.col, MAX_COLS) : 0;

  if (row === undefined || col === undefined) {
    return undefined;
  }
  if (!cols) {
    return String(row + 1);
  }
  return rows ? `${columnName(col)}${String(row + 1)}` : columnName(col);
};

export const a1FromR1c1 = (text: string, here: CellAddress): string | undefined => {
  const bang = text.lastIndexOf('!');
  const sheet = bang < 0 ? '' : text.slice(0, bang + 1);
  const [first = '', second, ...rest] = text.slice(bang + 1).split(':');
  const from = partOf(first, here);
  const to = second === undefined ? undefined : partOf(second, here);

  if (from === undefined || rest.length > 0 || (second !== undefined && to === undefined)) {
    return undefined;
  }
  const whole = !/\d/u.test(from) || !/[A-Z]/u.test(from);

  if (to === undefined) {
    return whole ? `${sheet}${from}:${from}` : `${sheet}${from}`;
  }
  return `${sheet}${from}:${to}`;
};
