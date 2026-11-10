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

export const citiesBook = (count: number): Workbook => {
  const book = createWorkbook();
  const sales = book.addSheet('Sales');

  sales.cells.set(0, 0, textValue('City'));
  sales.cells.set(0, 1, textValue('Amount'));

  for (let row = 1; row <= count; row += 1) {
    sales.cells.set(row, 0, textValue(`City ${String(row)}`));
    sales.cells.set(row, 1, numberValue(row));
  }

  return book;
};
