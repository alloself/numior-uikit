import { describe, expect, it } from 'vite-plus/test';
import {
  OFFICE_THEME,
  RU_LOCALE,
  colorHex,
  createCellEditor,
  parseCell,
  type Sheet,
} from '../src/core';
import {
  readWorkbook,
  writeZip,
  type ReadOptions,
  type XlsxProgress,
  type XlsxRead,
} from '../src/xlsx';
import {
  RATES_SHEET_WITH_SPLIT,
  SALES_SHEET,
  THEME,
  WORKBOOK_RELATIONSHIPS_WITH_THEME,
  sheetWith,
  workbookWith,
  xlsxPackage,
} from './xlsx-package';

type Opened = Extract<XlsxRead, { readonly kind: 'editable' | 'read-only' }>;

const UNREAD_FORMULAS = SALES_SHEET.replace('B2*Rate', 'SUM(Sales:Rates!B1)')
  .replace('B3*Rate', 'B2:B4 B3:C3')
  .replace('B4*Rate', 'Rates!#REF!+1');

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

  it('recalculates values from the file on request and keeps formulas it cannot compute', async () => {
    const read = await opened();
    const sales = viewOf(read);

    const run = read.calculator.recalculate({
      imported: true,
      budgetMs: Number.POSITIVE_INFINITY,
    });

    await run.settled;

    expect([sales.state('C2'), sales.state('G3'), sales.shown('G3')]).toEqual([
      'fresh',
      'imported',
      '42',
    ]);

    expect(read.calculator.pending).toBe(0);
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

  it('recalculates a book that asks for it on load instead of trusting its cached values', async () => {
    const read = await opened({
      'xl/workbook.xml': workbookWith('').replace(
        '<calcPr calcId="191029"/>',
        '<calcPr calcId="191029" fullCalcOnLoad="1"/>',
      ),
      'xl/worksheets/sheet1.xml': SALES_SHEET.replace(
        '<f>B2*Rate</f><v>0.75</v>',
        '<f>B2*Rate</f><v>0</v>',
      ),
    });

    expect(viewOf(read).shown('C2')).toBe('75.0%');
    expect(viewOf(read).state('C2')).toBe('fresh');
    expect(read.report.items.map((item) => item.code)).toContain('recalc-on-load');
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

  it('reads fonts, fills, borders and alignment into cell decorations', async () => {
    const read = await opened();
    const sheet = sheetOf(read, 'Sales');

    const decorationAt = (address: string) =>
      read.book.decorations.get(sheet.decorations.get(at(address).row, at(address).col));

    expect(decorationAt('C4')).toEqual({
      font: {
        bold: true,
        size: 11,
        name: 'Calibri',
        color: { kind: 'theme', theme: 1, tint: -0.25 },
      },
      fill: { pattern: 'solid', foreground: { kind: 'rgb', argb: 'FFFFFF00' } },
      border: { bottom: { style: 'thin', color: { kind: 'indexed', index: 64 } } },
      alignment: { horizontal: 'center', wrap: true },
    });

    expect(decorationAt('C2')).toEqual({});
    expect(read.book.decorations.defaultFont).toEqual({ size: 11, name: 'Calibri' });
  });

  it('reads the first sheet view, its frozen pane and the default line sizes', async () => {
    const plain = await opened();

    expect(sheetOf(plain, 'Sales').layout.view).toEqual({
      frozenRows: 1,
      frozenCols: 0,
      gridlines: true,
      rightToLeft: false,
      zoom: 100,
    });

    expect(sheetOf(plain, 'Sales').layout.defaults).toEqual({
      rowHeight: 15,
      colWidth: undefined,
      baseColWidth: 8,
    });

    expect(sheetOf(plain, 'Rates').layout.view.frozenRows).toBe(0);

    const viewed = await opened({
      'xl/worksheets/sheet1.xml': SALES_SHEET.replace(
        /<sheetViews>.*<\/sheetViews>/u,
        '<sheetViews><sheetView showGridLines="0" rightToLeft="1" zoomScale="85" workbookViewId="0"><pane xSplit="2" ySplit="3" topLeftCell="C4" state="frozen"/></sheetView><sheetView workbookViewId="1"><pane ySplit="9" state="frozen"/></sheetView></sheetViews>',
      ).replace(
        '<sheetFormatPr defaultRowHeight="15"',
        '<sheetFormatPr baseColWidth="10" defaultColWidth="12.5" defaultRowHeight="18"',
      ),
      'xl/worksheets/sheet2.xml': RATES_SHEET_WITH_SPLIT,
    });

    expect(sheetOf(viewed, 'Sales').layout.view).toEqual({
      frozenRows: 3,
      frozenCols: 2,
      gridlines: false,
      rightToLeft: true,
      zoom: 85,
    });

    expect(sheetOf(viewed, 'Sales').layout.defaults).toEqual({
      rowHeight: 18,
      colWidth: 12.5,
      baseColWidth: 10,
    });

    expect(sheetOf(viewed, 'Rates').layout.view.frozenRows).toBe(0);
  });

  it('reads the colour scheme of the book theme and falls back to the Office palette', async () => {
    expect((await opened()).book.decorations.theme[4]).toBe('4472C4');

    const themed = await opened({
      'xl/_rels/workbook.xml.rels': WORKBOOK_RELATIONSHIPS_WITH_THEME,
      'xl/theme/theme1.xml': THEME,
    });

    expect(themed.book.decorations.theme.slice(0, 5)).toEqual([
      '101010',
      'FAFAFA',
      '44546A',
      'E7E6E6',
      '112233',
    ]);

    expect(colorHex({ kind: 'theme', theme: 0, tint: 0 }, themed.book.decorations.theme)).toBe(
      'FAFAFA',
    );
  });

  it('turns theme, indexed and rgb colours into hex with Excel tints', () => {
    expect(colorHex({ kind: 'theme', theme: 0, tint: -0.0499893185216834 }, OFFICE_THEME)).toBe(
      'F2F2F2',
    );

    expect(colorHex({ kind: 'theme', theme: 4, tint: -0.249977111117893 }, OFFICE_THEME)).toBe(
      '2F5597',
    );

    expect(colorHex({ kind: 'theme', theme: 5, tint: 0.3999755851924192 }, OFFICE_THEME)).toBe(
      'F4B183',
    );

    expect(colorHex({ kind: 'indexed', index: 10 }, OFFICE_THEME)).toBe('FF0000');
    expect(colorHex({ kind: 'indexed', index: 64 }, OFFICE_THEME)).toBeUndefined();
    expect(colorHex({ kind: 'rgb', argb: 'ff00b050' }, OFFICE_THEME)).toBe('00B050');
    expect(colorHex({ kind: 'auto' }, OFFICE_THEME)).toBeUndefined();
  });

  it('reports what the book holds beyond the model', async () => {
    const { report } = await opened();

    expect(
      Object.fromEntries(report.items.map((item) => [item.code, [item.severity, item.count]])),
    ).toEqual({
      'unsupported-functions': ['info', 1],
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
        await opened({
          'xl/worksheets/sheet1.xml': SALES_SHEET.replace('si="0">B2*2</f>', 'si="1"/>'),
        })
      ).report.items.find((item) => item.code === 'formula-syntax'),
    ).toMatchObject({ severity: 'read-only', count: 3, sheets: ['Sales'] });
  });

  it('keeps a formula it cannot read with the value saved in the file', async () => {
    const read = await opened({ 'xl/worksheets/sheet1.xml': UNREAD_FORMULAS });
    const sales = viewOf(read);

    read.calculator.recalculate({ imported: true, budgetMs: Number.POSITIVE_INFINITY });

    expect(read.kind).toBe('editable');

    expect(read.report.items.find((item) => item.code === 'formula-kept')).toMatchObject({
      severity: 'info',
      count: 1,
      sheets: ['Sales'],
    });

    expect(['C2', 'C3', 'C4'].map(sales.input)).toEqual([
      '=SUM(Sales:Rates!B1)',
      '=@B2:B4 B3:C3',
      '=Rates!#REF!+1',
    ]);

    expect(['C2', 'C3', 'C4'].map(sales.shown)).toEqual(['75.0%', '100.0%', '#REF!']);
  });

  it('keeps every cell of a shared formula whose first cell it cannot read', async () => {
    const read = await opened({
      'xl/worksheets/sheet1.xml': SALES_SHEET.replace('>B2*2<', ">SUM('Sales:Rates'!B2,$B$2)+B$3<"),
    });

    const sales = viewOf(read);

    expect(read.kind).toBe('editable');

    expect(['D2', 'D3', 'D4'].map(sales.input)).toEqual([
      "=SUM('Sales:Rates'!B2,$B$2)+B$3",
      "=SUM('Sales:Rates'!B3,$B$2)+B$3",
      "=SUM('Sales:Rates'!B4,$B$2)+B$3",
    ]);

    expect(['D2', 'D3', 'D4'].map(sales.shown)).toEqual(['6', '2', '4']);

    expect(read.report.items.find((item) => item.code === 'formula-kept')).toMatchObject({
      count: 3,
    });
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

  it('skips cells and rows placed outside the sheet', async () => {
    const read = await opened({
      'xl/worksheets/sheet2.xml': sheetWith(
        [
          '<row r="0"><c><v>1</v></c></row>',
          '<row r="1.5"><c><v>2</v></c></row>',
          '<row r="2"><c r="XFD2"><v>3</v></c><c><v>4</v></c></row>',
          '<row r="1048577"><c><v>5</v></c></row>',
          '<row r="3"><c r="A3"><v>6</v></c><c><v>7</v></c></row>',
        ].join(''),
      ),
    });

    const rates = viewOf(read, 'Rates');

    expect(['XFD2', 'A3', 'B3'].map(rates.shown)).toEqual(['3', '6', '7']);
    expect(sheetOf(read, 'Rates').cells.size).toBe(3);
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
