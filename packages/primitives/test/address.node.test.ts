import { describe, expect, it } from 'vite-plus/test';
import { columnIndex, columnName } from '../src/address/address';

describe('column names', () => {
  it('names columns by letters the way a spreadsheet does and reads the names back', () => {
    const indices = [0, 1, 25, 26, 27, 51, 52, 701, 702, 16_383, 18_277, 18_278];

    expect(indices.map(columnName)).toEqual([
      'A',
      'B',
      'Z',
      'AA',
      'AB',
      'AZ',
      'BA',
      'ZZ',
      'AAA',
      'XFD',
      'ZZZ',
      'AAAA',
    ]);

    expect(indices.map((index) => columnIndex(columnName(index)))).toEqual(indices);
    expect(columnIndex('xfd')).toBe(16_383);
  });

  it('answers nothing for a name that is not made of Latin letters', () => {
    expect(['', 'A1', '$A', 'Я', 'a b', '1'].map(columnIndex)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('gives no name to a column before the first one and rounds a fraction down', () => {
    expect(columnName(-1)).toBe('');
    expect(columnName(26.9)).toBe('AA');
  });
});
