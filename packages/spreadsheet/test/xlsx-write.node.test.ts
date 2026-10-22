import { describe, expect, it } from 'vite-plus/test';
import { createCellEditor, createStepper, parseCell, type Sheet } from '../src/core';
import { readWorkbook, readZip, writeWorkbook, type Bytes, type XlsxRead } from '../src/xlsx';
import { openBook } from './book-harness';
import { workbookWith, xlsxPackage } from './xlsx-package';

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

  it('refuses to move rows under positioned parts unless losses are allowed', async () => {
    const read = await opened(await xlsxPackage());

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
    expect(await partOf(bytes, 'xl/worksheets/sheet1.xml')).not.toContain('mergeCell');
  });

  it('gives back the original bytes of a read-only book', async () => {
    const source = await xlsxPackage({ 'xl/workbook.xml': workbookWith(' date1904="1"') });
    const read = await opened(source);
    const result = await writeWorkbook(read.book, read.calculator, { source: read.source });

    expect(result.ok && result.bytes).toBe(source);
  });
});
