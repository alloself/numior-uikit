import { createWorkbook, numberValue, textValue, type Workbook } from '../../src/core';

const ROWS = [
  ['Region', 'City', 'Amount'],
  ['East', 'Boston', 100],
  ['East', 'NYC', 200],
  ['West', 'LA', 150],
] as const;

export const salesBook = (): Workbook => {
  const book = createWorkbook();
  const sales = book.addSheet('Sales');

  ROWS.forEach((row, at) => {
    row.forEach((value, col) => {
      sales.cells.set(at, col, typeof value === 'number' ? numberValue(value) : textValue(value));
    });
  });

  return book;
};
