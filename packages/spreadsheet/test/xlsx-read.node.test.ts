import { describe, expect, it } from 'vite-plus/test';
import { RU_LOCALE, createCellEditor, parseCell, type Sheet } from '../src/core';
import {
  readWorkbook,
  writeZip,
  type ReadOptions,
  type XlsxProgress,
  type XlsxRead,
} from '../src/xlsx';
import { SALES_SHEET, workbookWith, xlsxPackage } from './xlsx-package';

type Opened = Extract<XlsxRead, { readonly kind: 'editable' | 'read-only' }>;

const opened = async (
  changes: Readonly<Record<string, string | undefined>> = {},
  options: ReadOptions = {},
): Promise<Opened> => {
  const read = await readWorkbook(await xlsxPackage(changes), options);

  if (read.kind === 'rejected') {
    throw new Error(`the package was rejected: ${read.reason} ${read.detail ?? ''}`);
  }
  return read;
};

const at = (address: string): { readonly row: number; readonly col: number } => {
  const cell = parseCell(address);

  if (cell === undefined) {
    throw new Error(`${address} is not a cell`);
  }
  return cell;
};

const sheetOf = (read: Opened, name: string): Sheet => {
  const sheet = read.book.sheet(name);

  if (sheet === undefined) {
    throw new Error(`${name} is missing`);
  }
  return sheet;
};

const viewOf = (read: Opened, name = 'Sales') => {
  const sheet = sheetOf(read, name);
  const editor = createCellEditor(read.book, read.calculator);

  return {
    shown: (address: string): string => editor.shown(sheet, at(address).row, at(address).col).text,
    input: (address: string): string => editor.inputText(sheet, at(address).row, at(address).col),
    state: (address: string) =>
      read.calculator.formulaAt(sheet, at(address).row, at(address).col)?.state,
  };
};

const reasonOf = async (
  bytes: Promise<Uint8Array<ArrayBuffer>> | Uint8Array<ArrayBuffer>,
): Promise<string> => {
  const read = await readWorkbook(await bytes);

  return read.kind === 'rejected' ? read.reason : read.kind;
};

describe('reading xlsx', () => {
  it('reads values, shared strings, number formats and cached formula results', async () => {
    const read = await opened();
    const sales = viewOf(read);

    expect(read.kind).toBe('editable');
    expect(read.book.sheets.map((sheet) => sheet.name)).toEqual(['Sales', 'Rates']);

    expect(['A1', 'A3', 'B2', 'C2', 'F2', 'G2', 'H2', 'F3', 'A4', 'A5'].map(sales.shown)).toEqual([
      'Item',
      'Ink',
      '3',
      '75.0%',
      'TRUE',
      '#N/A',
      '1/1/2025',
      ' inline ',
      'Mat',
      'Total\r',
    ]);

    expect([sales.state('C2'), sales.input('C2')]).toEqual(['imported', '=B2*Rate']);
    expect(read.report.staleFormulas).toBe(10);
  });

  it('expands shared formulas and keeps the spill of an array formula', async () => {
    const read = await opened();
    const sales = viewOf(read);
    const anchor = at('E2');

    expect(['D2', 'D3', 'D4'].map(sales.input)).toEqual(['=B2*2', '=B3*2', '=B4*2']);
    expect(['E2', 'E3', 'E4'].map(sales.shown)).toEqual(['1', '2', '3']);
    expect(sales.input('E2')).toBe('=SORT(B2:B4)');

    expect(read.calculator.spillOf(sheetOf(read, 'Sales'), anchor.row, anchor.col)).toEqual({
      top: 1,
      left: 4,
      bottom: 3,
      right: 4,
    });

    expect(read.calculator.contentAt(sheetOf(read, 'Sales'), 2, 4)).toEqual({ kind: 'empty' });
  });

  it('reads defined names, tables and structured references and recalculates on request', async () => {
    const read = await opened({}, { recalc: 'chunked' });
    const sales = viewOf(read);

    expect(read.book.names.get('Rate', undefined)).toBeDefined();
    expect(read.book.tables.get('orders')?.columns).toEqual(['Item', 'Amount', 'Cost', 'Twice']);
    expect(['C2', 'D4', 'E3', 'B5'].map(sales.shown)).toEqual(['75.0%', '4', '2', '6']);

    expect([sales.state('C2'), sales.state('G3'), sales.shown('G3')]).toEqual([
      'fresh',
      'imported',
      '42',
    ]);

    expect(read.report.staleFormulas).toBe(1);
  });

  it('keeps the value Excel computed for functions it does not know until the formula changes', async () => {
    const read = await opened({}, { recalc: 'chunked' });
    const sales = viewOf(read);
    const sheet = sheetOf(read, 'Sales');

    read.calculator.setFormula(sheet, 1, 1, '7');
    read.calculator.recalculate({ budgetMs: Number.POSITIVE_INFINITY });

    expect([sales.state('G3'), sales.shown('G3'), sales.shown('D2')]).toEqual([
      'imported',
      '42',
      '14',
    ]);

    read.calculator.setFormula(sheet, 2, 6, 'B3+1');
    read.calculator.recalculate({ budgetMs: Number.POSITIVE_INFINITY });

    expect([sales.state('G3'), sales.shown('G3')]).toEqual(['fresh', '2']);
  });

  it('reports what the book holds beyond the model', async () => {
    const { report } = await opened();

    expect(
      Object.fromEntries(report.items.map((item) => [item.code, [item.severity, item.count]])),
    ).toEqual({
      'unsupported-functions': ['info', 1],
      'cell-styles': ['info', 1],
      'rich-text': ['info', 1],
      'merged-cells': ['info', 1],
      'conditional-formats': ['info', 1],
      hyperlinks: ['info', 1],
      'sheet-layout': ['info', 2],
      'hidden-sheets': ['info', 1],
    });

    expect(report.items.find((item) => item.code === 'unsupported-functions')?.names).toEqual([
      'FORECAST.ETS',
    ]);
  });

  it('opens books it cannot keep faithful as read-only', async () => {
    expect((await opened({ 'xl/workbook.xml': workbookWith(' date1904="1"') })).kind).toBe(
      'read-only',
    );

    expect(
      (
        await opened({ 'xl/worksheets/sheet1.xml': SALES_SHEET.replace('B2*Rate', 'B2*(') })
      ).report.items.find((item) => item.code === 'formula-syntax'),
    ).toMatchObject({ severity: 'read-only', count: 1, sheets: ['Sales'] });
  });

  it('keeps the original bytes and tells parsed parts from opaque ones', async () => {
    const bytes = await xlsxPackage();
    const read = await readWorkbook(bytes);

    if (read.kind === 'rejected') {
      throw new Error('the package was rejected');
    }
    expect(read.source.bytes).toBe(bytes);

    expect(
      Object.fromEntries(read.source.parts.map((part) => [part.name, part.kind])),
    ).toMatchObject({
      'xl/worksheets/sheet1.xml': 'parsed',
      'xl/sharedStrings.xml': 'parsed',
      'docProps/app.xml': 'opaque',
      '[Content_Types].xml': 'opaque',
    });
  });

  it('reports progress through the parts and the recalculation', async () => {
    const seen: XlsxProgress[] = [];

    await opened({}, { recalc: 'chunked', onProgress: (progress) => seen.push(progress) });

    const reading = seen.filter((progress) => progress.phase === 'read');

    expect(reading.at(-1)?.done).toBe(reading.at(-1)?.total);
    expect(seen.at(-1)).toMatchObject({ phase: 'recalculate' });
  });

  it('refuses what is not an openable workbook', async () => {
    const encoder = new TextEncoder();

    expect(
      await Promise.all([
        reasonOf(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])),
        reasonOf(encoder.encode('just text')),
        reasonOf(xlsxPackage({ 'xl/workbook.xml': undefined })),
        reasonOf(xlsxPackage({ 'xl/worksheets/sheet1.xml': '<worksheet><sheetData>' })),
        reasonOf(writeZip([{ name: 'xl/workbook.bin', data: encoder.encode('binary') }])),
      ]),
    ).toEqual(['encrypted', 'not-xlsx', 'damaged', 'damaged', 'binary']);
  });

  it('reads the book in the locale it is given', async () => {
    const sales = viewOf(await opened({}, { locale: RU_LOCALE }));

    expect([sales.shown('H2'), sales.shown('C2')]).toEqual(['01.01.2025', '75,0%']);
  });
});
