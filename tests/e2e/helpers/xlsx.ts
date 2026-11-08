import {
  EN_LOCALE,
  createCalculator,
  createWorkbook,
  numberValue,
  textValue,
} from '../../../packages/spreadsheet/src/core';
import { readZip, writeWorkbook, writeZip } from '../../../packages/spreadsheet/src/xlsx';

export interface XlsxFile {
  readonly name: string;
  readonly mimeType: string;
  readonly buffer: Buffer;
}

const FIRST_SHEET = 'xl/worksheets/sheet1.xml';

const RIGHT_TO_LEFT_VIEW =
  '<sheetViews><sheetView rightToLeft="1" workbookViewId="0"/></sheetViews>';

const AFTER_SHEET_VIEWS = /<(?:sheetFormatPr|cols|sheetData)\b/u;

const fileOf = async (
  name: string,
  book: ReturnType<typeof createWorkbook>,
  calculator: ReturnType<typeof createCalculator>,
): Promise<XlsxFile> => {
  const written = await writeWorkbook(book, calculator);

  if (!written.ok) {
    throw new Error(`the ${name} book was not written`);
  }
  return {
    name,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(written.bytes),
  };
};

export const ordersXlsx = async (): Promise<XlsxFile> => {
  const book = createWorkbook();
  const orders = book.addSheet('Orders');

  orders.cells.set(0, 0, textValue('Order'));
  orders.cells.set(0, 1, textValue('Total'));
  orders.cells.set(1, 0, textValue('A-17'));
  orders.cells.set(1, 1, numberValue(1250.5));
  orders.formats.set(1, 1, book.formats.id('#,##0.00'));

  return fileOf('orders.xlsx', book, createCalculator(book, { locale: EN_LOCALE }));
};

const withRightToLeftSheet = async (file: XlsxFile): Promise<XlsxFile> => {
  const read = readZip(new Uint8Array(file.buffer));

  if (!read.ok) {
    throw new Error(`the ${file.name} book is not a zip: ${read.reason}`);
  }

  const { archive } = read;
  const encoder = new TextEncoder();

  const entries = await Promise.all(
    archive.names.map(async (name) => ({
      name,
      data:
        name === FIRST_SHEET
          ? encoder.encode(
              (await archive.text(name)).replace(AFTER_SHEET_VIEWS, `${RIGHT_TO_LEFT_VIEW}$&`),
            )
          : await archive.bytes(name),
    })),
  );

  return { ...file, buffer: Buffer.from(await writeZip(entries)) };
};

export const rightToLeftXlsx = async (): Promise<XlsxFile> => {
  const book = createWorkbook();
  const months = book.addSheet('Months');

  months.cells.set(0, 0, textValue('Month'));
  months.cells.set(0, 1, textValue('Total'));

  for (let row = 1; row <= 6; row += 1) {
    months.cells.set(row, 0, textValue(`M${String(row)}`));
    months.cells.set(row, 1, numberValue(row * 10));
  }

  return withRightToLeftSheet(
    await fileOf('months.xlsx', book, createCalculator(book, { locale: EN_LOCALE })),
  );
};

export const pricesXlsx = async (): Promise<XlsxFile> => {
  const book = createWorkbook();
  const calculator = createCalculator(book, { locale: EN_LOCALE });
  const prices = book.addSheet('Prices');

  prices.cells.set(0, 0, textValue('Price'));
  prices.cells.set(0, 1, textValue('Twice'));
  prices.cells.set(1, 0, numberValue(21));
  calculator.setFormula(prices, 1, 1, '=A2*2');
  calculator.recalculate({ budgetMs: Number.POSITIVE_INFINITY });

  return fileOf('prices.xlsx', book, calculator);
};
