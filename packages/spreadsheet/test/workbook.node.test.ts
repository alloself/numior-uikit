import { describe, expect, it } from 'vite-plus/test';
import { createWorkbook, textValue, validSheetName } from '../src/core';

describe('workbook', () => {
  it('names sheets uniquely without case and shares strings between them', () => {
    const book = createWorkbook();
    const first = book.addSheet();
    const second = book.addSheet('Итоги');

    expect(book.sheets.map((sheet) => sheet.name)).toEqual(['Sheet1', 'Итоги']);
    expect(book.sheet('итоги')).toBe(second);
    expect(() => book.addSheet('ИТОГИ')).toThrow(RangeError);
    expect(book.renameSheet(first, 'итоги')).toBe(false);
    expect(book.renameSheet(first, 'План')).toBe(true);
    expect(book.addSheet().name).toBe('Sheet3');

    first.cells.set(0, 0, textValue('x'));
    second.cells.set(0, 0, textValue('x'));

    expect(book.strings.size).toBe(1);

    expect(['A/B', 'a'.repeat(32), "'q", '', 'ok'].map(validSheetName)).toEqual([
      false,
      false,
      false,
      false,
      true,
    ]);
  });
});
