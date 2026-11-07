import {
  EN_LOCALE,
  createCalculator,
  createWorkbook,
  numberValue,
  textValue,
} from '../../../packages/spreadsheet/src/core';
import { writeWorkbook } from '../../../packages/spreadsheet/src/xlsx';

export interface XlsxFile {
  readonly name: string;
  readonly mimeType: string;
  readonly buffer: Buffer;
}

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
