import * as fc from 'fast-check';
import { describe, expect, it } from 'vite-plus/test';
import {
  MAX_COLS,
  MAX_ROWS,
  columnIndex,
  columnName,
  formatCell,
  formatRange,
  parseCell,
  parseRange,
} from '../src/core';

describe('A1 addresses', () => {
  it('names columns from A to XFD and reads the names back', () => {
    expect([0, 25, 26, 51, 701, 702, MAX_COLS - 1].map(columnName)).toEqual([
      'A',
      'Z',
      'AA',
      'AZ',
      'ZZ',
      'AAA',
      'XFD',
    ]);

    expect(columnIndex('xfd')).toBe(MAX_COLS - 1);
    expect(columnIndex('XFE')).toBeUndefined();

    fc.assert(
      fc.property(fc.integer({ min: 0, max: MAX_COLS - 1 }), (index) => {
        expect(columnIndex(columnName(index))).toBe(index);
      }),
    );
  });

  it('reads cells with absolute parts and refuses addresses outside the sheet', () => {
    expect(parseCell('$B$3')).toEqual({ row: 2, col: 1, colAbsolute: true, rowAbsolute: true });
    expect(parseCell('c10')).toEqual({ row: 9, col: 2, colAbsolute: false, rowAbsolute: false });
    expect(formatCell({ row: 9, col: 2, colAbsolute: false, rowAbsolute: true })).toBe('C$10');
    expect(parseCell(`A${String(MAX_ROWS + 1)}`)).toBeUndefined();
    expect(parseCell('A0')).toBeUndefined();
    expect(parseCell('1A')).toBeUndefined();
  });

  it('reads ranges of cells, whole columns and whole rows', () => {
    expect(parseRange('B3:A1')).toEqual({ top: 0, left: 0, bottom: 2, right: 1 });
    expect(parseRange('C:A')).toEqual({ top: 0, left: 0, bottom: MAX_ROWS - 1, right: 2 });
    expect(parseRange('2:4')).toEqual({ top: 1, left: 0, bottom: 3, right: MAX_COLS - 1 });
    expect(parseRange('D5')).toEqual({ top: 4, left: 3, bottom: 4, right: 3 });
    expect(parseRange('A1:B2:C3')).toBeUndefined();
    expect(formatRange({ top: 0, left: 0, bottom: 2, right: 1 })).toBe('A1:B3');
    expect(formatRange({ top: 4, left: 3, bottom: 4, right: 3 })).toBe('D5');
  });
});
