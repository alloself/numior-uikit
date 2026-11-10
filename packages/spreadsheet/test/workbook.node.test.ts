import { describe, expect, it } from 'vite-plus/test';
import {
  createWorkbook,
  emptyPivot,
  PivotLanguage,
  PivotSourceKind,
  textValue,
  validSheetName,
} from '../src/core';

describe('workbook', () => {
  it('counts every change of its cells and sheets in one revision', () => {
    const book = createWorkbook();
    const first = book.addSheet();
    const second = book.addSheet();
    const seen = [book.revision];

    first.cells.set(0, 0, textValue('x'));
    seen.push(book.revision);
    second.cells.set(4, 4, textValue('y'));
    seen.push(book.revision);
    second.cells.shiftLines('rows', 0, 1);
    seen.push(book.revision);
    book.removeSheet(second);
    seen.push(book.revision);

    expect(seen.every((revision, index) => index === 0 || revision > (seen[index - 1] ?? 0))).toBe(
      true,
    );
  });

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

  it('finds the pivot tables of a sheet seen through a proxy', () => {
    const book = createWorkbook();
    const sheet = book.addSheet('Pivot');
    const range = { top: 0, left: 0, bottom: 3, right: 1 };

    book.pivots.set({
      name: 'PivotTable1',
      sheet,
      anchor: { row: 2, col: 0 },
      definition: emptyPivot(
        { kind: PivotSourceKind.Range, sheet: 'Data', range },
        PivotLanguage.En,
      ),
      footprint: range,
    });

    expect(book.pivots.on(new Proxy(sheet, {})).map((pivot) => pivot.name)).toEqual([
      'PivotTable1',
    ]);
  });
});
