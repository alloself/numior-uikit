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

export const ordersXlsx = async (): Promise<XlsxFile> => {
  const book = createWorkbook();
  const orders = book.addSheet('Orders');

  orders.cells.set(0, 0, textValue('Order'));
  orders.cells.set(0, 1, textValue('Total'));
  orders.cells.set(1, 0, textValue('A-17'));
  orders.cells.set(1, 1, numberValue(1250.5));
  orders.formats.set(1, 1, book.formats.id('#,##0.00'));

  const written = await writeWorkbook(book, createCalculator(book, { locale: EN_LOCALE }));

  if (!written.ok) {
    throw new Error('the orders book was not written');
  }
  return {
    name: 'orders.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(written.bytes),
  };
};
