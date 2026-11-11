import { describe, expect, it } from 'vite-plus/test';
import {
  EN_FORMULAS,
  createCellEditor,
  createStepper,
  formatRange,
  numberValue,
  pivotCaptions,
  textValue,
  type PivotDefinition,
  parseCell,
  parseFormula,
  type Sheet,
} from '../src/core';
import {
  readWorkbook,
  readZip,
  writeWorkbook,
  writeZip,
  type Bytes,
  type XlsxRead,
} from '../src/xlsx';
import { openBook } from './book-harness';
import { corpusSource } from './corpus-files';
import { corpusPackage, layoutOf } from './xlsx-corpus';
import { SALES_SHEET, workbookWith, xlsxPackage } from './xlsx-package';

type Opened = Extract<XlsxRead, { readonly kind: 'editable' | 'read-only' }>;

const opened = async (bytes: Bytes): Promise<Opened> => {
  const read = await readWorkbook(bytes);

  if (read.kind === 'rejected') {
    throw new Error(`the package was rejected: ${read.reason} ${read.detail ?? ''}`);
  }
  return read;
};

const written = async (
  read: Pick<Opened, 'book' | 'calculator'>,
  source?: Opened['source'],
): Promise<Bytes> => {
  const result = await writeWorkbook(read.book, read.calculator, { source });

  if (!result.ok) {
    throw new Error(`the book was refused: ${JSON.stringify(result.report.losses)}`);
  }
  return result.bytes;
};

const partOf = async (bytes: Bytes, part: string): Promise<string> => {
  const zip = readZip(bytes);

  if (!zip.ok) {
    throw new Error('not a zip');
  }
  return zip.archive.has(part) ? zip.archive.text(part) : '';
};

const at = (address: string): { readonly row: number; readonly col: number } => {
  const cell = parseCell(address);

  if (cell === undefined) {
    throw new Error(`${address} is not a cell`);
  }
  return cell;
};

const sheetOf = (read: Pick<Opened, 'book'>, name: string): Sheet => {
  const sheet = read.book.sheet(name);

  if (sheet === undefined) {
    throw new Error(`${name} is missing`);
  }
  return sheet;
};

const viewOf = (read: Pick<Opened, 'book' | 'calculator'>, name: string) => {
  const sheet = sheetOf(read, name);
  const editor = createCellEditor(read.book, read.calculator);

  return {
    shown: (address: string): string => editor.shown(sheet, at(address).row, at(address).col).text,
    input: (address: string): string => editor.inputText(sheet, at(address).row, at(address).col),
    decoration: (address: string) =>
      read.book.decorations.get(sheet.decorations.get(at(address).row, at(address).col)),
  };
};

const newBook = () => {
  const sheet = openBook();

  [
    ['A1', 'Item'],
    ['B1', 'Amount'],
    ['A2', ' padded '],
    ['B2', '2'],
    ['A3', 'Bell\u0007'],
    ['B3', '3'],
    ['C1', '=XLOOKUP("Amount",A1:B1,A1:B1)'],
    ['C2', '=SEQUENCE(3)'],
    ['D1', '=Total*2'],
    ['D2', 'TRUE'],
    ['D3', '=1/0'],
    ['E1', '12.5%'],
  ].forEach(([address = '', text = '']) => {
    sheet.type(address, text);
  });

  sheet.name('Total', '=SUM(Sheet1!$B$2:$B$3)');

  sheet.commit({
    kind: 'setCells',
    sheet: 'Sheet1',
    cells: [
      {
        ...at('B1'),
        decoration: {
          font: { bold: true, color: { kind: 'theme', theme: 4, tint: 0.4 } },
          fill: { pattern: 'solid', foreground: { kind: 'rgb', argb: 'FFDDEBF7' } },
          border: { bottom: { style: 'medium', color: { kind: 'auto' } } },
          alignment: { horizontal: 'right' },
        },
      },
    ],
  });

  sheet.table('A1:B3', { name: 'Orders' });
  sheet.shown('A1');
  return sheet;
};

describe('writing xlsx', () => {
  it('writes a new book that reads back the same', async () => {
    const book = newBook();
    const bytes = await written({ book: book.book, calculator: book.calculator });
    const read = await opened(bytes);
    const view = viewOf(read, 'Sheet1');
    const before = viewOf({ book: book.book, calculator: book.calculator }, 'Sheet1');
    const cells = ['A1', 'A2', 'A3', 'B2', 'C1', 'C2', 'C3', 'C4', 'D1', 'D2', 'D3', 'E1'];

    expect(read.kind).toBe('editable');
    expect(cells.map(view.shown)).toEqual(cells.map(before.shown));

    expect(['C1', 'C2', 'D1', 'D3'].map(view.input)).toEqual(
      ['C1', 'C2', 'D1', 'D3'].map(before.input),
    );

    expect(view.decoration('B1')).toEqual(before.decoration('B1'));
    expect(read.book.names.get('Total', undefined)).toBeDefined();
    expect(read.book.tables.get('Orders')?.columns).toEqual(['Item', 'Amount']);
    expect(await partOf(bytes, 'xl/worksheets/sheet1.xml')).toContain('_xlfn.XLOOKUP(');
    expect(await partOf(bytes, 'xl/worksheets/sheet1.xml')).toContain('cm="1"');
    expect(await partOf(bytes, 'xl/metadata.xml')).toContain('XLDAPR');
  });

  it('marks formulas that need array evaluation and writes the file syntax of this-row references', async () => {
    const book = openBook();

    [
      ['A1', 'Qty'],
      ['B1', 'Price'],
      ['A2', '2'],
      ['B2', '3'],
      ['A3', '4'],
      ['B3', '5'],
    ].forEach(([address = '', text = '']) => {
      book.type(address, text);
    });

    book.table('A1:B3', { name: 'Lines' });
    book.name('Prices', '=Sheet1!$B$2:$B$3');
    book.type('D1', '=SUM(A2:A3*B2:B3)');
    book.type('D2', '=SUM(A2:A3)');
    book.type('D3', '=SUMPRODUCT(A2:A3,Prices)');
    book.type('D4', '=MAX(Prices*2)');
    book.type('C2', '=Lines[@Qty]*Lines[@Price]');
    book.shown('D1');

    const sheet = await partOf(
      await written({ book: book.book, calculator: book.calculator }),
      'xl/worksheets/sheet1.xml',
    );

    expect(sheet).toContain('<c r="D1" cm="1"><f t="array" ref="D1">SUM(A2:A3*B2:B3)</f>');
    expect(sheet).toContain('<c r="D2"><f>SUM(A2:A3)</f>');
    expect(sheet).toContain('<c r="D3"><f>SUMPRODUCT(A2:A3,Prices)</f>');
    expect(sheet).toContain('<c r="D4" cm="1"><f t="array" ref="D4">MAX(Prices*2)</f>');
    expect(sheet).toContain('<f>Lines[[#This Row],[Qty]]*Lines[[#This Row],[Price]]</f>');
  });

  it('reads legacy formulas with implicit intersection and writes them back the way it read them', async () => {
    const source = await xlsxPackage({
      'xl/worksheets/sheet1.xml': SALES_SHEET.replace(
        '<c r="H2" s="1"><v>45658</v></c>',
        '<c r="H2"><f>B2:B4*2</f><v>6</v></c><c r="I2"><f>SUM(B2:B4*2)</f><v>6</v></c><c r="K2"><f>SUMPRODUCT(--(B2:B4&gt;1))</f><v>2</v></c>',
      ),
    });

    const read = await opened(source);
    const view = viewOf(read, 'Sales');
    const sales = sheetOf(read, 'Sales');

    expect([view.input('H2'), view.input('I2'), view.shown('I2')]).toEqual([
      '=@B2:B4*2',
      '=SUM(@B2:B4*2)',
      '6',
    ]);

    expect([view.input('K2'), view.shown('K2')]).toEqual(['=SUMPRODUCT(--(B2:B4>1))', '2']);

    read.calculator.setFormula(sales, at('J2').row, at('J2').col, '=SUM(@B2:B4)');
    read.calculator.recalculate({ budgetMs: Number.POSITIVE_INFINITY });

    const sheet = await partOf(await written(read, read.source), 'xl/worksheets/sheet1.xml');

    expect(sheet).toContain('<c r="H2"><f>B2:B4*2</f>');
    expect(sheet).toContain('<c r="I2"><f>SUM(B2:B4*2)</f>');
    expect(sheet).toContain('<c r="J2"><f>SUM(_xlfn.SINGLE(B2:B4))</f>');
    expect(sheet).toContain('<c r="K2"><f>SUMPRODUCT(--(B2:B4&gt;1))</f>');
  });

  it('writes conditional formats from the model once they change and reads them back the same', async () => {
    const read = await opened(await corpusPackage('conditional'));
    const rules = sheetOf(read, 'Rules');
    const stepper = createStepper(read.book, read.calculator);

    stepper.apply({
      kind: 'setConditional',
      sheet: 'Rules',
      formats: [
        ...rules.conditional.filter((format) => format.extension !== true),
        {
          ranges: [{ top: 0, left: 5, bottom: 5, right: 5 }],
          rules: [
            {
              rule: { kind: 'errors', style: { font: { italic: true } } },
              priority: 13,
              stopIfTrue: false,
            },
          ],
        },
        ...rules.conditional.filter((format) => format.extension === true),
      ],
    });

    const bytes = await written(read, read.source);
    const sheet = await partOf(bytes, 'xl/worksheets/sheet1.xml');
    const styles = await partOf(bytes, 'xl/styles.xml');

    expect(sheet).toContain('<conditionalFormatting sqref="A1:A6">');
    expect(sheet).toContain('<conditionalFormatting sqref="C1:C3 E1">');
    expect(sheet).toContain('<formula>$A1&gt;$D$1</formula>');

    expect(sheet).toContain(
      '<cfRule type="expression" dxfId="0" priority="12"><formula>NOPE(</formula></cfRule>',
    );

    expect(sheet).toContain('<x14:id>{78C3B1A1-0000-4000-8000-000000000001}</x14:id>');

    expect(sheet).toContain(
      '<cfRule type="containsErrors" dxfId="4" priority="13"><formula>ISERROR(F1)</formula></cfRule>',
    );

    expect(sheet.indexOf('<conditionalFormatting')).toBeLessThan(sheet.indexOf('<pageMargins'));
    expect(styles).toContain('<dxfs count="5">');

    const again = await opened(bytes);

    expect(JSON.stringify(sheetOf(again, 'Rules').conditional)).toBe(
      JSON.stringify(sheetOf(read, 'Rules').conditional),
    );
  });

  it('moves the Excel 2010 rule extensions with inserted rows', async () => {
    const read = await opened(await corpusPackage('conditional'));

    createStepper(read.book, read.calculator).apply({
      kind: 'insertLines',
      sheet: 'Rules',
      axis: 'rows',
      at: 0,
      count: 1,
    });

    const bytes = await written(read, read.source);
    const sheet = await partOf(bytes, 'xl/worksheets/sheet1.xml');
    const again = await opened(bytes);

    expect(sheet).toContain('<conditionalFormatting sqref="D2:D7">');
    expect(sheet).toContain('<xm:f>$A$2&lt;D2</xm:f>');
    expect(sheet.match(/<xm:sqref>D2:D7<\/xm:sqref>/gu)?.length).toBe(2);
    expect(sheet).toContain('<x14:id>{78C3B1A1-0000-4000-8000-000000000001}</x14:id>');

    expect(JSON.stringify(sheetOf(again, 'Rules').conditional)).toBe(
      JSON.stringify(sheetOf(read, 'Rules').conditional),
    );
  });

  it('keeps row heights, hidden lines and line styles and moves them with lines', async () => {
    const sheet = SALES_SHEET.replace(
      '<cols><col min="1" max="1" width="14" customWidth="1"/></cols>',
      '<cols><col min="1" max="1" width="14" customWidth="1"/><col min="3" max="4" width="9" style="2" hidden="1" outlineLevel="1"/></cols>',
    )
      .replace(
        '<row r="3" spans="1:8">',
        '<row r="3" spans="1:8" ht="30" customHeight="1" x14ac:dyDescent="0.3">',
      )
      .replace('</sheetData>', '<row r="9" s="3" customFormat="1" hidden="1"/></sheetData>');

    const read = await opened(await xlsxPackage({ 'xl/worksheets/sheet1.xml': sheet }));
    const sales = sheetOf(read, 'Sales');
    const before = layoutOf(read.book, sales);

    expect(before).toMatchObject({
      rows: {
        '3': { size: 30, custom: true, extra: [['x14ac:dyDescent', '0.3']] },
        '9': { hidden: true, style: { format: '0.0%' } },
      },
      cols: { A: { size: 14 }, C: { hidden: true, level: 1, style: { format: '0.0%' } } },
    });

    const stepper = createStepper(read.book, read.calculator);

    stepper.apply({
      kind: 'setCells',
      sheet: 'Sales',
      cells: [
        { ...at('A1'), content: { kind: 'value', value: { kind: 'string', value: 'Name' } } },
      ],
    });

    const again = await opened(await written(read, read.source));

    expect(layoutOf(again.book, sheetOf(again, 'Sales'))).toEqual(before);

    const moved = stepper.apply({
      kind: 'insertLines',
      sheet: 'Sales',
      axis: 'rows',
      at: 1,
      count: 2,
    });

    expect(moved.ok).toBe(true);
    expect(sales.layout.rows.get(4)?.size).toBe(30);
    expect(sales.layout.rows.get(10)?.hidden).toBe(true);

    const narrowed = stepper.apply({
      kind: 'deleteLines',
      sheet: 'Sales',
      axis: 'cols',
      at: 2,
      count: 1,
    });

    expect([sales.layout.cols.get(2)?.hidden, sales.layout.cols.get(3)]).toEqual([true, undefined]);

    [narrowed, moved].forEach((result) => {
      expect(result.ok && stepper.apply(result.inverse).ok).toBe(true);
    });

    expect(layoutOf(read.book, sales)).toEqual(before);
  });

  it('moves merged cells with lines, drops the ones that shrink to a cell and restores them', async () => {
    const read = await opened(await xlsxPackage());
    const sales = sheetOf(read, 'Sales');
    const stepper = createStepper(read.book, read.calculator);
    const merges = (): string[] => sales.layout.merges.map(formatRange);

    expect(merges()).toEqual(['F4:G4']);

    const moved = stepper.apply({
      kind: 'insertLines',
      sheet: 'Sales',
      axis: 'rows',
      at: 1,
      count: 1,
    });

    expect(merges()).toEqual(['F5:G5']);

    const lossy = await writeWorkbook(read.book, read.calculator, {
      source: read.source,
      lossy: true,
    });

    const text = lossy.ok ? await partOf(lossy.bytes, 'xl/worksheets/sheet1.xml') : '';

    expect(text).toMatch(
      /<mergeCells count="1"><mergeCell ref="F5:G5"\/><\/mergeCells><conditionalFormatting/u,
    );

    const narrowed = stepper.apply({
      kind: 'deleteLines',
      sheet: 'Sales',
      axis: 'cols',
      at: 5,
      count: 1,
    });

    expect(merges()).toEqual([]);

    [narrowed, moved].forEach((result) => {
      expect(result.ok && stepper.apply(result.inverse).ok).toBe(true);
    });

    expect(merges()).toEqual(['F4:G4']);
  });

  it('writes the conditional formats of a new book with their styles', async () => {
    const book = openBook();

    book.type('A1', '5');
    book.type('A2', '15');

    const parsed = parseFormula('=10', EN_FORMULAS);

    book.commit({
      kind: 'setConditional',
      sheet: 'Sheet1',
      formats: [
        {
          ranges: [{ top: 0, left: 0, bottom: 1, right: 0 }],
          rules: [
            {
              rule: {
                kind: 'cellIs',
                operator: 'greaterThan',
                formulas: parsed.ok ? [parsed.ast] : [],
                style: {
                  font: { bold: true },
                  fill: { pattern: 'solid', background: { kind: 'rgb', argb: 'FFFFC7CE' } },
                },
              },
              priority: 1,
              stopIfTrue: true,
            },
            {
              rule: { kind: 'text', operator: 'beginsWith', text: 'a"b', style: { format: '0.0' } },
              priority: 2,
              stopIfTrue: false,
            },
          ],
        },
      ],
    });

    const bytes = await written({ book: book.book, calculator: book.calculator });
    const again = await opened(bytes);

    expect(await partOf(bytes, 'xl/worksheets/sheet1.xml')).toContain(
      '<formula>LEFT(A1,LEN("a""b"))="a""b"</formula>',
    );

    expect(JSON.stringify(sheetOf(again, 'Sheet1').conditional)).toBe(
      JSON.stringify(book.first.conditional),
    );
  });

  it('keeps what it does not understand byte for byte when nothing changed', async () => {
    const source = await xlsxPackage();
    const read = await opened(source);
    const bytes = await written(read, read.source);
    const again = await opened(bytes);
    const sales = viewOf(again, 'Sales');
    const sourceZip = readZip(source);
    const writtenZip = readZip(bytes);

    if (!sourceZip.ok || !writtenZip.ok) {
      throw new Error('not a zip');
    }

    expect(writtenZip.archive.raw('docProps/app.xml')?.data).toEqual(
      sourceZip.archive.raw('docProps/app.xml')?.data,
    );

    expect(writtenZip.archive.raw('xl/tables/table1.xml')?.data).toEqual(
      sourceZip.archive.raw('xl/tables/table1.xml')?.data,
    );

    expect(['C2', 'D3', 'E3', 'G3', 'B5'].map(sales.shown)).toEqual(['75.0%', '2', '2', '42', '6']);
    expect(again.report.items.map((item) => item.code)).toContain('merged-cells');

    expect(await partOf(bytes, 'xl/worksheets/sheet1.xml')).toContain(
      '<hyperlink ref="A2" r:id="rId2"/>',
    );

    expect(await partOf(bytes, 'xl/workbook.xml')).not.toContain('fullCalcOnLoad');
  });

  it('leaves out values it did not compute and asks Excel to recalculate', async () => {
    const read = await opened(await xlsxPackage());

    read.calculator.setValue(sheetOf(read, 'Rates'), 0, 1, { kind: 'number', value: 0.5 });

    const result = await writeWorkbook(read.book, read.calculator, { source: read.source });
    const bytes = result.ok ? result.bytes : new Uint8Array();

    expect(result.report.staleFormulas).toBe(3);
    expect(await partOf(bytes, 'xl/workbook.xml')).toContain('fullCalcOnLoad="1"');

    expect(await partOf(bytes, 'xl/worksheets/sheet1.xml')).toMatch(
      /<c r="C2" s="\d+"><f>B2\*Rate<\/f><\/c>/u,
    );
  });

  it('refuses to move rows under elements it does not model unless losses are allowed', async () => {
    const scenarios =
      '<scenarios><scenario name="Low" count="1"><inputCell r="B2" val="1"/></scenario></scenarios><mergeCells';

    const read = await opened(
      await xlsxPackage({
        'xl/worksheets/sheet1.xml': SALES_SHEET.replace('<mergeCells', scenarios),
      }),
    );

    const moved = createStepper(read.book, read.calculator).apply({
      kind: 'insertLines',
      sheet: 'Sales',
      axis: 'rows',
      at: 10,
      count: 1,
    });

    expect(moved.ok).toBe(true);

    expect(await writeWorkbook(read.book, read.calculator, { source: read.source })).toMatchObject({
      ok: false,
      report: { losses: [{ sheet: 'Sales', reason: 'moved-lines' }] },
    });

    const lossy = await writeWorkbook(read.book, read.calculator, {
      source: read.source,
      lossy: true,
    });

    const bytes = lossy.ok ? lossy.bytes : new Uint8Array();

    expect(lossy.ok).toBe(true);
    expect(await partOf(bytes, 'xl/worksheets/sheet1.xml')).not.toContain('scenario');
  });

  it('writes back as they were the formulas it could not read', async () => {
    const sheet = SALES_SHEET.replace('B2*Rate', 'SUM(Sales:Rates!B1)')
      .replace('B3*Rate', '_xlfn.XLOOKUP(1,B2:B4 B3:C3,1)')
      .replace('B4*Rate', 'Rates!#REF!+1');

    const read = await opened(await xlsxPackage({ 'xl/worksheets/sheet1.xml': sheet }));
    const text = await partOf(await written(read, read.source), 'xl/worksheets/sheet1.xml');

    [
      '<f>SUM(Sales:Rates!B1)</f><v>0.75</v>',
      '<f>_xlfn.XLOOKUP(1,B2:B4 B3:C3,1)</f><v>0.25</v>',
      '<f>Rates!#REF!+1</f>',
    ].forEach((piece) => {
      expect(text).toContain(piece);
    });
  });

  it('moves the sheet view, validations, links, breaks and filters with lines and sheet names', async () => {
    const validations = `<dataValidations count="2"><dataValidation type="list" sqref="B2:B4"><formula1>$A$2:$A$4</formula1></dataValidation><dataValidation type="whole" sqref="H9"><formula1>B2</formula1></dataValidation></dataValidations>`;
    const links = `<hyperlinks><hyperlink ref="A2" r:id="rId2"/><hyperlink ref="A4" location="Rates!B1" display="Rate"/></hyperlinks>`;
    const breaks = `<rowBreaks count="2" manualBreakCount="2"><brk id="3" max="16383" man="1"/><brk id="9" max="16383" man="1"/></rowBreaks>`;
    const filter = `<autoFilter ref="F1:H4"><filterColumn colId="2"><filters><filter val="6"/></filters></filterColumn></autoFilter>`;
    const extension = `<extLst><ext uri="{CCE6A557-97BC-4b89-ADB6-D9C93CAAB3DF}" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main"><x14:dataValidations count="1" xmlns:xm="http://schemas.microsoft.com/office/excel/2006/main"><x14:dataValidation type="list"><x14:formula1><xm:f>Rates!$A$1:$A$3</xm:f></x14:formula1><xm:sqref>C2:C4</xm:sqref></x14:dataValidation></x14:dataValidations></ext></extLst>`;

    const sheet = SALES_SHEET.replace(
      'state="frozen"/>',
      'state="frozen"/><selection pane="bottomLeft" activeCell="B3" sqref="B3:C4"/>',
    )
      .replace('<mergeCells', `${filter}<mergeCells`)
      .replace('<hyperlinks><hyperlink ref="A2" r:id="rId2"/></hyperlinks>', validations + links)
      .replace('<tableParts', `${breaks}<tableParts`)
      .replace('</worksheet>', `${extension}</worksheet>`);

    const read = await opened(await xlsxPackage({ 'xl/worksheets/sheet1.xml': sheet }));
    const stepper = createStepper(read.book, read.calculator);
    const original = sheetOf(read, 'Sales').layout.xml;

    const results = [
      stepper.apply({ kind: 'insertLines', sheet: 'Sales', axis: 'rows', at: 2, count: 2 }),
      stepper.apply({ kind: 'deleteLines', sheet: 'Sales', axis: 'cols', at: 5, count: 1 }),
      stepper.apply({ kind: 'insertLines', sheet: 'Rates', axis: 'rows', at: 0, count: 1 }),
      stepper.apply({ kind: 'renameSheet', from: 'Rates', to: 'Prices' }),
    ];

    expect(results.every((result) => result.ok)).toBe(true);

    const text = await partOf(await written(read, read.source), 'xl/worksheets/sheet1.xml');

    [
      '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"></pane><selection pane="bottomLeft" activeCell="B5" sqref="B5:C6"></selection>',
      '<autoFilter ref="F1:G6"><filterColumn colId="1">',
      '<dataValidation type="list" sqref="B2:B6"><formula1>$A$2:$A$6</formula1>',
      '<dataValidation type="whole" sqref="G11"><formula1>B2</formula1>',
      '<hyperlink ref="A6" location="Prices!B2" display="Rate">',
      '<brk id="5" max="16383" man="1"></brk><brk id="11" max="16383" man="1"></brk>',
      '<xm:f>Prices!$A$2:$A$4</xm:f></x14:formula1><xm:sqref>C2:C6</xm:sqref>',
    ].forEach((piece) => {
      expect(text).toContain(piece);
    });

    results.toReversed().forEach((result) => {
      expect(result.ok && stepper.apply(result.inverse).ok).toBe(true);
    });

    expect(sheetOf(read, 'Sales').layout.xml).toEqual(original);
  });

  it('moves pictures and comments with lines and drops the comments of deleted rows', async () => {
    const read = await opened(await corpusPackage('extras'));
    const stepper = createStepper(read.book, read.calculator);
    const parts = ['xl/drawings/drawing1.xml', 'xl/comments1.xml', 'xl/drawings/vmlDrawing1.vml'];

    const texts = async (): Promise<string[]> => {
      const bytes = await written(read, read.source);

      expect(readZip(bytes).ok && (await partOf(bytes, 'xl/media/image1.png')) !== '').toBe(true);
      return Promise.all(parts.map((part) => partOf(bytes, part)));
    };

    const inserted = stepper.apply({
      kind: 'insertLines',
      sheet: 'Data',
      axis: 'rows',
      at: 0,
      count: 2,
    });

    const [drawing = '', comments = '', vml = ''] = await texts();

    expect([drawing, comments, vml]).toEqual([
      expect.stringContaining('<xdr:row>3</xdr:row>'),
      expect.stringContaining('<comment ref="B3" authorId="0">'),
      expect.stringContaining('<x:Row>2</x:Row><x:Column>1</x:Column>'),
    ]);

    expect(inserted.ok && stepper.apply(inserted.inverse).ok).toBe(true);

    stepper.apply({ kind: 'deleteLines', sheet: 'Data', axis: 'rows', at: 0, count: 1 });

    const [moved = '', emptied = '', shapes = ''] = await texts();

    expect(moved).toContain('<xdr:row>0</xdr:row>');
    expect(emptied).not.toContain('<comment ');
    expect(shapes).not.toContain('<v:shape');
  });

  it('keeps the size of one-cell anchors and moves chart series and linked text', async () => {
    const drawing = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>5</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>2</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>8</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>6</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:sp macro="" textlink="$B$3"><xdr:nvSpPr><xdr:cNvPr id="2" name="Total"/><xdr:cNvSpPr/></xdr:nvSpPr><xdr:spPr/></xdr:sp><xdr:clientData/></xdr:twoCellAnchor><xdr:twoCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>3</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>4</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>9</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="3" name="Chart"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>`;

    const chart = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart><c:plotArea><c:barChart><c:ser><c:val><c:numRef><c:f>Sales!$B$2:$B$6</c:f></c:numRef></c:val></c:ser></c:barChart></c:plotArea></c:chart></c:chartSpace>`;

    const office = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    const packageRelationships = 'http://schemas.openxmlformats.org/package/2006/relationships';

    const read = await opened(
      await xlsxPackage({
        'xl/worksheets/sheet1.xml': SALES_SHEET.replace(
          '<tableParts',
          '<drawing r:id="rId3"/><tableParts',
        ),
        'xl/worksheets/_rels/sheet1.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${packageRelationships}"><Relationship Id="rId1" Type="${office}/table" Target="../tables/table1.xml"/><Relationship Id="rId2" Type="${office}/hyperlink" Target="https://example.com/" TargetMode="External"/><Relationship Id="rId3" Type="${office}/drawing" Target="../drawings/drawing1.xml"/></Relationships>`,
        'xl/drawings/drawing1.xml': drawing,
        'xl/drawings/_rels/drawing1.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${packageRelationships}"><Relationship Id="rId1" Type="${office}/chart" Target="../charts/chart1.xml"/></Relationships>`,
        'xl/charts/chart1.xml': chart,
      }),
    );

    expect(
      createStepper(read.book, read.calculator).apply({
        kind: 'insertLines',
        sheet: 'Sales',
        axis: 'rows',
        at: 4,
        count: 3,
      }).ok,
    ).toBe(true);

    const bytes = await written(read, read.source);
    const shapes = await partOf(bytes, 'xl/drawings/drawing1.xml');

    expect(shapes).toContain(
      '<xdr:from><xdr:col>5</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>2</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>8</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>6</xdr:row>',
    );

    expect(shapes).toContain('textlink="$B$3"');

    expect(shapes).toContain(
      '<xdr:row>3</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>4</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>12</xdr:row>',
    );

    expect(shapes.startsWith('<?xml')).toBe(true);
    expect(await partOf(bytes, 'xl/charts/chart1.xml')).toContain('<c:f>Sales!$B$2:$B$9</c:f>');
  });

  it('writes pivot tables with their caches and reads them back as the same definitions', async () => {
    const sheet = openBook();

    [
      ['Region', 'City', 'Year', 'Sales'],
      ['East', 'Boston', '2021', '100'],
      ['East', 'NYC', '2021', '200'],
      ['West', 'LA', '2022', '70'],
    ].forEach((row, index) => {
      row.forEach((text, col) => {
        sheet.type(`${'ABCD'.charAt(col)}${String(index + 1)}`, text);
      });
    });

    const definition: PivotDefinition = {
      source: { kind: 'range', sheet: 'Sheet1', range: { top: 0, left: 0, bottom: 3, right: 3 } },
      rows: [0, 1],
      columns: [2],
      filters: [],
      values: [
        {
          field: 3,
          aggregate: 'sum',
          name: 'Sum of Sales',
          showAs: { kind: 'normal' },
          format: '#,##0.00',
        },
      ],
      fields: [
        { order: [textValue('West')], hidden: [], sort: 'manual', subtotal: true },
        { order: [], hidden: [textValue('NYC')], sort: 'descending', subtotal: true },
      ],
      layout: 'outline',
      rowTotals: true,
      columnTotals: false,
      autofit: false,
      captions: pivotCaptions('en'),
    };

    expect(
      sheet.commit({
        kind: 'setPivot',
        sheet: 'Rates',
        name: 'Sales',
        pivot: { anchor: { row: 3, col: 1 }, definition },
      }).ok,
    ).toBe(true);

    const bytes = await written(sheet);
    const again = await opened(bytes);
    const pivot = again.book.pivots.get(sheetOf(again, 'Rates'), 'Sales');

    expect(again.kind).toBe('editable');
    expect(pivot?.anchor).toEqual({ row: 3, col: 1 });
    expect(pivot?.footprint).toEqual(sheet.book.pivots.get(sheet.rates, 'Sales')?.footprint);

    expect(pivot?.definition).toEqual({
      ...definition,
      fields: [
        {
          order: [textValue('West'), textValue('East')],
          hidden: [],
          sort: 'manual',
          subtotal: true,
        },
        {
          order: [textValue('NYC'), textValue('LA'), textValue('Boston')],
          hidden: [textValue('NYC')],
          sort: 'descending',
          subtotal: true,
        },
        {
          order: [numberValue(2021), numberValue(2022)],
          hidden: [],
          sort: 'manual',
          subtotal: true,
        },
        { order: [], hidden: [], sort: 'manual', subtotal: true },
      ],
    });

    expect(await partOf(bytes, 'xl/workbook.xml')).toContain(
      '<pivotCaches><pivotCache cacheId="1" r:id="',
    );

    expect(viewOf(again, 'Rates').shown('B6')).toBe('West');
  });

  it('reads back page filters and values shown against a base item', async () => {
    const sheet = openBook();

    [
      ['Region', 'Year', 'Sales'],
      ['East', '2021', '100'],
      ['West', '2021', '150'],
      ['East', '2022', '50'],
    ].forEach((row, index) => {
      row.forEach((text, col) => {
        sheet.type(`${'ABC'.charAt(col)}${String(index + 1)}`, text);
      });
    });

    const values: PivotDefinition['values'] = [
      {
        field: 2,
        aggregate: 'sum',
        name: 'Change',
        showAs: { kind: 'difference', field: 1, item: 'previous' },
        format: undefined,
      },
      {
        field: 2,
        aggregate: 'sum',
        name: 'Against 2021',
        showAs: { kind: 'percent', field: 1, item: numberValue(2021) },
        format: undefined,
      },
    ];

    sheet.commit({
      kind: 'setPivot',
      sheet: 'Rates',
      name: 'Years',
      pivot: {
        anchor: { row: 0, col: 0 },
        definition: {
          source: {
            kind: 'range',
            sheet: 'Sheet1',
            range: { top: 0, left: 0, bottom: 3, right: 2 },
          },
          rows: [1],
          columns: [],
          filters: [{ field: 0, selected: textValue('East') }],
          values,
          fields: [],
          layout: 'compact',
          rowTotals: true,
          columnTotals: true,
          autofit: false,
          captions: pivotCaptions('en'),
        },
      },
    });

    const again = await opened(await written(sheet));
    const definition = again.book.pivots.get(sheetOf(again, 'Rates'), 'Years')?.definition;

    expect(definition?.filters).toEqual([{ field: 0, selected: textValue('East') }]);
    expect(definition?.values).toEqual(values);
  });

  it('writes a pivot that has no values yet without an empty list of them', async () => {
    const sheet = openBook();

    [
      ['Region', 'Sales'],
      ['East', '100'],
      ['West', '150'],
    ].forEach((row, index) => {
      row.forEach((text, col) => {
        sheet.type(`${'AB'.charAt(col)}${String(index + 1)}`, text);
      });
    });

    sheet.commit({
      kind: 'setPivot',
      sheet: 'Rates',
      name: 'Regions',
      pivot: {
        anchor: { row: 0, col: 0 },
        definition: {
          source: {
            kind: 'range',
            sheet: 'Sheet1',
            range: { top: 0, left: 0, bottom: 2, right: 1 },
          },
          rows: [0],
          columns: [],
          filters: [],
          values: [],
          fields: [],
          layout: 'compact',
          rowTotals: true,
          columnTotals: true,
          autofit: false,
          captions: pivotCaptions('en'),
        },
      },
    });

    const bytes = await written(sheet);
    const part = await partOf(bytes, 'xl/pivotTables/pivotTable1.xml');
    const again = await opened(bytes);

    expect(part).toContain('<rowFields count="1">');
    expect(part).not.toContain('<dataFields');

    expect(again.book.pivots.get(sheetOf(again, 'Rates'), 'Regions')?.definition.values).toEqual(
      [],
    );
  });

  it('refreshes a pivot read from a file into the cells the file shows', async () => {
    const read = await opened(await corpusPackage('pivot-tables'));
    const report = sheetOf(read, 'Report');
    const view = viewOf(read, 'Report');
    const shown = (): string[] => ['A3', 'B3', 'A4', 'B4', 'A5', 'B5', 'A6', 'B6'].map(view.shown);
    const before = shown();

    expect(read.kind).toBe('editable');

    expect(
      createStepper(read.book, read.calculator).apply({
        kind: 'refreshPivot',
        sheet: 'Report',
        name: 'PivotTable1',
      }).ok,
    ).toBe(true);

    expect(shown()).toEqual(before);
    expect(read.book.pivots.on(report)).toHaveLength(1);
    expect(read.book.pivots.on(report)[0]?.definition.autofit).toBe(true);
  });

  it('keeps Russian default captions and rewrites a moved pivot without its old cache', async () => {
    const source = corpusSource('pivot-tables');
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const parts =
      source.kind === 'parts'
        ? source.parts.map((part) =>
            part.name === 'xl/worksheets/sheet2.xml'
              ? {
                  name: part.name,
                  data: encoder.encode(
                    decoder
                      .decode(part.data)
                      .replace('Row Labels', 'Названия строк')
                      .replace('Grand Total', 'Общий итог'),
                  ),
                }
              : part,
          )
        : [];

    const read = await opened(await writeZip(parts));
    const stepper = createStepper(read.book, read.calculator);

    expect(
      read.book.pivots.get(sheetOf(read, 'Report'), 'PivotTable1')?.definition.captions,
    ).toEqual({ ...pivotCaptions('ru'), values: 'Values' });

    stepper.apply({ kind: 'insertLines', sheet: 'Report', axis: 'rows', at: 0, count: 1 });

    const bytes = await written(read, read.source);
    const zip = readZip(bytes);
    const again = await opened(bytes);
    const pivot = again.book.pivots.get(sheetOf(again, 'Report'), 'PivotTable1');

    expect(zip.ok && zip.archive.names.some((name) => name.includes('pivotCacheRecords'))).toBe(
      false,
    );

    expect(pivot?.footprint === undefined ? '' : formatRange(pivot.footprint)).toBe('A4:B7');
    expect(pivot?.definition.captions.rows).toBe('Названия строк');
  });

  it('keeps a book read-only when a pivot shows values through Excel 2010 extensions', async () => {
    const source = corpusSource('pivot-tables');
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const x14 = 'http://schemas.microsoft.com/office/spreadsheetml/2009/9/main';

    const parts =
      source.kind === 'parts'
        ? source.parts.map((part) =>
            part.name === 'xl/pivotTables/pivotTable1.xml'
              ? {
                  name: part.name,
                  data: encoder.encode(
                    decoder
                      .decode(part.data)
                      .replace(
                        'baseItem="0"/>',
                        `baseItem="0"><extLst><ext uri="{E15A36E0-9728-4e99-A89B-3F7291B0FE68}" xmlns:x14="${x14}"><x14:dataField pivotShowAs="percentOfParentRow"/></ext></extLst></dataField>`,
                      ),
                  ),
                }
              : part,
          )
        : [];

    const read = await readWorkbook(await writeZip(parts));

    expect(read).toMatchObject({
      kind: 'read-only',
      report: { items: [{ code: 'pivot-tables', names: ['PivotTable1'] }] },
    });
  });

  it('gives back the original bytes of a read-only book', async () => {
    const source = await xlsxPackage({ 'xl/workbook.xml': workbookWith(' date1904="1"') });
    const read = await opened(source);
    const result = await writeWorkbook(read.book, read.calculator, { source: read.source });

    expect(result.ok && result.bytes).toBe(source);
  });
});
