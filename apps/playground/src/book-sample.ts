import {
  createWorkbook,
  lineLayoutsOf,
  numberValue,
  textValue,
  type CellDecoration,
  type LineLayout,
  type Sheet,
  type Workbook,
} from '@numior/spreadsheet/core';

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь'];

const LINES = [
  { name: 'Выручка', base: 1240, step: 85 },
  { name: 'Себестоимость', base: -610, step: -32 },
  { name: 'Маркетинг', base: -140, step: -6 },
  { name: 'Аренда', base: -95, step: 0 },
  { name: 'Зарплаты', base: -310, step: -12 },
];

const TITLE: CellDecoration = {
  font: { bold: true, size: 14 },
  alignment: { horizontal: 'center' },
};

const HEAD: CellDecoration = {
  font: { bold: true, color: { kind: 'theme', theme: 0, tint: 0 } },
  fill: { pattern: 'solid', foreground: { kind: 'theme', theme: 4, tint: 0 } },
  alignment: { horizontal: 'center' },
};

const TOTAL: CellDecoration = {
  font: { bold: true },
  fill: { pattern: 'solid', foreground: { kind: 'theme', theme: 4, tint: 0.7999816888943144 } },
  border: {
    top: { style: 'thin', color: { kind: 'theme', theme: 4, tint: 0 } },
    bottom: { style: 'double', color: { kind: 'theme', theme: 4, tint: 0 } },
  },
};

const MONEY = '#,##0';

const WIDE: LineLayout = {
  size: 18,
  custom: true,
  hidden: false,
  level: 0,
  collapsed: false,
  style: undefined,
  extra: [],
};

const decorate = (
  book: Workbook,
  sheet: Sheet,
  row: number,
  col: number,
  look: CellDecoration,
): void => {
  sheet.decorations.set(row, col, book.decorations.id(look));
};

const fillBudget = (book: Workbook, sheet: Sheet): void => {
  const money = book.formats.id(MONEY);

  sheet.cells.set(0, 0, textValue('Бюджет на первое полугодие, тыс. ₽'));
  decorate(book, sheet, 0, 0, TITLE);
  sheet.cells.set(1, 0, textValue('Статья'));
  decorate(book, sheet, 1, 0, HEAD);

  MONTHS.forEach((month, index) => {
    sheet.cells.set(1, index + 1, textValue(month));
    decorate(book, sheet, 1, index + 1, HEAD);
  });

  LINES.forEach((line, row) => {
    sheet.cells.set(row + 2, 0, textValue(line.name));

    MONTHS.forEach((_month, index) => {
      sheet.cells.set(row + 2, index + 1, numberValue(line.base + line.step * index));
      sheet.formats.set(row + 2, index + 1, money);
    });
  });

  const total = LINES.length + 2;

  sheet.cells.set(total, 0, textValue('Прибыль'));
  decorate(book, sheet, total, 0, TOTAL);

  MONTHS.forEach((_month, index) => {
    const sum = LINES.reduce((acc, line) => acc + line.base + line.step * index, 0);

    sheet.cells.set(total, index + 1, numberValue(sum));
    sheet.formats.set(total, index + 1, money);
    decorate(book, sheet, total, index + 1, TOTAL);
  });

  sheet.cells.set(
    total + 2,
    0,
    textValue('Цифры условные: лист собран кодом песочницы, а не прочитан из файла'),
  );

  sheet.layout = {
    ...sheet.layout,
    cols: lineLayoutsOf([[0, WIDE]]),
    merges: [{ top: 0, left: 0, bottom: 0, right: MONTHS.length }],
    view: { ...sheet.layout.view, frozenRows: 2 },
  };
};

export const sampleBook = (): Workbook => {
  const book = createWorkbook();
  const budget = book.addSheet('Бюджет');
  const notes = book.addSheet('Заметки');

  fillBudget(book, budget);
  notes.cells.set(0, 0, textValue('Второй лист без сетки'));
  notes.layout = { ...notes.layout, view: { ...notes.layout.view, gridlines: false } };
  return book;
};
