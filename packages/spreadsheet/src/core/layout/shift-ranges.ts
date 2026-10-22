import type { CellAddress, CellRange } from '../cell.types';
import { shiftSpan, type LineChange } from '../formula/rewrite';

const shiftRange = (range: CellRange, change: LineChange): CellRange | undefined => {
  const rows = change.axis === 'rows';
  const span = shiftSpan(rows ? [range.top, range.bottom] : [range.left, range.right], change);

  if (span === undefined) {
    return undefined;
  }
  return rows
    ? { ...range, top: span[0], bottom: span[1] }
    : { ...range, left: span[0], right: span[1] };
};

export const shiftRanges = (ranges: readonly CellRange[], change: LineChange): CellRange[] =>
  ranges.reduce<CellRange[]>((kept, range) => {
    const moved = shiftRange(range, change);

    if (moved !== undefined) {
      kept.push(moved);
    }
    return kept;
  }, []);

const single = (range: CellRange): boolean =>
  range.top === range.bottom && range.left === range.right;

export const shiftMerges = (merges: readonly CellRange[], change: LineChange): CellRange[] =>
  merges.reduce<CellRange[]>((kept, merge) => {
    const moved = shiftRange(merge, change);

    if (moved !== undefined && !single(moved)) {
      kept.push(moved);
    }
    return kept;
  }, []);

const previousLine = (line: number, change: LineChange): number => {
  if (change.count > 0) {
    return line >= change.at + change.count ? line - change.count : line;
  }
  return line >= change.at ? line - change.count : line;
};

export const survivorOf = (anchor: CellAddress, change: LineChange): CellAddress =>
  change.axis === 'rows'
    ? { row: previousLine(anchor.row, change), col: anchor.col }
    : { row: anchor.row, col: previousLine(anchor.col, change) };
