import { describe, expect, it } from 'vite-plus/test';
import { RU_LOCALE, numberValue, parseFormula, textValue } from '../src/core';
import { readWorkbook, readZip, writeWorkbook, type Bytes } from '../src/xlsx';
import { openBook } from './book-harness';

const RATE = parseFormula('=[1]Other!$B$1');

const withOtherBook = (locale = RU_LOCALE) => {
  const sheet = openBook(locale);

  const other = sheet.book.addExternal({
    target: 'other.xlsx',
    sheets: ['Other', 'Q1 data'],
    names: [{ name: 'Rate', sheet: undefined, ast: RATE.ok ? RATE.ast : undefined }],
  });

  other.sheets[0]?.cells.set(0, 0, numberValue(9));
  other.sheets[0]?.cells.set(1, 0, numberValue(1));
  other.sheets[0]?.cells.set(2, 0, numberValue(2));
  other.sheets[0]?.cells.set(0, 1, numberValue(0.2));
  other.sheets[1]?.cells.set(0, 0, textValue('pen'));
  return sheet;
};

const partOf = async (bytes: Bytes, part: string): Promise<string> => {
  const zip = readZip(bytes);

  return zip.ok && zip.archive.has(part) ? zip.archive.text(part) : '';
};

describe('references into other books', () => {
  it('reads the values the other book cached and prints them in the language of the book', () => {
    const sheet = withOtherBook();

    sheet.type('A1', '=[1]Other!A1*2');
    sheet.type('A2', '=СУММ([1]Other!A1:A3)');
    sheet.type('A3', "='[1]Q1 data'!A1");
    sheet.type('A4', '=[1]!Rate*100');
    sheet.type('A5', '=[2]Other!A1');
    sheet.type('A6', '=[1]Missing!A1');

    expect(sheet.shown('A1')).toBe('18');
    expect(sheet.shown('A2')).toBe('12');
    expect(sheet.shown('A3')).toBe('pen');
    expect(sheet.shown('A4')).toBe('20');
    expect(sheet.shown('A5')).toBe('#ССЫЛКА!');
    expect(sheet.shown('A6')).toBe('#ССЫЛКА!');
    expect(sheet.input('A2')).toBe('=СУММ([1]Other!A1:A3)');
  });

  it('keeps them in place when lines, sheets and tables of this book change', () => {
    const sheet = withOtherBook();

    sheet.commit({ kind: 'renameSheet', from: 'Rates', to: 'Other' });
    sheet.type('A1', 'Total');
    sheet.type('B1', '=[1]Other!A1+Other!A1');
    sheet.type('A1', '5', 'Other');

    expect(sheet.shown('B1')).toBe('14');

    sheet.insert('1', 2);
    sheet.insert('1', 3, 'Other');

    expect(sheet.input('B3')).toBe('=[1]Other!A1+Other!A4');
    expect(sheet.shown('B3')).toBe('14');

    sheet.commit({ kind: 'removeSheet', name: 'Other' });

    expect(sheet.input('B3')).toBe('=[1]Other!A1+#ССЫЛКА!');
  });

  it('writes the cached books it has no source for and reads them back', async () => {
    const sheet = withOtherBook();

    sheet.type('A1', '=[1]Other!A1*2');
    sheet.type('A2', '=[1]!Rate');
    sheet.calculator.recalculate({ budgetMs: Number.POSITIVE_INFINITY });

    const result = await writeWorkbook(sheet.book, sheet.calculator);

    if (!result.ok) {
      throw new Error('the book was refused');
    }

    const { bytes } = result;

    expect(await partOf(bytes, 'xl/workbook.xml')).toContain(
      '<externalReferences><externalReference r:id="rId',
    );

    expect(await partOf(bytes, 'xl/externalLinks/externalLink1.xml')).toContain(
      '<definedNames><definedName name="Rate" refersTo="=Other!$B$1"/></definedNames>',
    );

    expect(await partOf(bytes, 'xl/externalLinks/_rels/externalLink1.xml.rels')).toContain(
      'Target="other.xlsx" TargetMode="External"',
    );

    const read = await readWorkbook(bytes, { recalc: 'chunked', locale: RU_LOCALE });

    if (read.kind === 'rejected') {
      throw new Error(`the written book was rejected: ${read.reason}`);
    }

    expect(read.kind).toBe('editable');
    expect(read.book.externals.map((book) => book.target)).toEqual(['other.xlsx']);
    expect(read.book.sheets[0]?.cells.get(0, 0)).toEqual(numberValue(18));
    expect(read.book.sheets[0]?.cells.get(1, 0)).toEqual(numberValue(0.2));
  });
});
