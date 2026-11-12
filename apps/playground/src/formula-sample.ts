import {
  EN_LOCALE,
  RU_LOCALE,
  createCalculator,
  createCellEditor,
  createWorkbook,
  currencyFormat,
  lineLayoutsOf,
  parseCell,
  parseRange,
  type CellDecoration,
  type CellEditor,
  type LineLayout,
  type Sheet,
  type Workbook,
} from '@numior/spreadsheet/core';
import type { SampleBook } from './book-sample';

type Entries = readonly (readonly [string, string | number])[];

const BUDGET: Entries = [
  ['A1', 'Статья'],
  ['B1', 'Кол-во'],
  ['C1', 'Цена'],
  ['D1', 'Сумма'],
  ['E1', 'В долларах'],
  ['F1', 'Размер'],
  ['A2', 'Ноутбуки'],
  ['B2', 4],
  ['C2', 85_000],
  ['A3', 'Мониторы'],
  ['B3', 6],
  ['C3', 21_000],
  ['A4', 'Кресла'],
  ['B4', 8],
  ['C4', 14_500],
  ['A5', 'Лицензии'],
  ['B5', 12],
  ['C5', 6900],
  ['A6', 'Обучение'],
  ['B6', 1],
  ['C6', 120_000],
  ['A8', 'Итого'],
  ['D8', '=SUM(D2:D6)'],
  ['E8', '=SUM(E2:E6)'],
  ['A9', 'Средняя'],
  ['D9', '=AVERAGE(D2:D6)'],
  ['A10', 'Дороже 50 000'],
  ['D10', '=COUNTIF(D2:D6,">50000")'],
  ['A12', 'Статьи'],
  ['B12', '=TEXTJOIN(", ",TRUE,A2:A6)'],
  ['A14', 'Квадраты'],
  ['B14', '=SEQUENCE(1,5)^2'],
  ['A15', 'Случайное'],
  ['B15', '=RANDBETWEEN(1,100)'],
  ['A16', 'Сегодня'],
  ['B16', '=TODAY()'],
  ['A17', 'Через квартал'],
  ['B17', '=EDATE(B16,3)'],
  ['A18', 'Доля ноутбуков'],
  ['B18', '=D2/D8'],
  ['A19', 'Платёж в месяц'],
  ['B19', '=PMT(12%/12,24,D8)'],
];

const RATES: Entries = [
  ['A1', 'Валюта'],
  ['B1', 'Курс'],
  ['A2', 'USD'],
  ['B2', 92.4],
  ['A3', 'EUR'],
  ['B3', 100.6],
  ['A4', 'CNY'],
  ['B4', 12.8],
];

const FORMATS: readonly (readonly [string, string])[] = [
  ['C2:D9', currencyFormat(RU_LOCALE.numbers, 2)],
  ['E2:E8', '"$"#,##0.00'],
  ['B18', '0.0%'],
];

const HEAD: CellDecoration = {
  font: { bold: true },
  fill: { pattern: 'solid', foreground: { kind: 'theme', theme: 0, tint: -0.0499893185216834 } },
};

const COLUMNS = 6;

const WIDE: LineLayout = {
  size: 16,
  custom: true,
  hidden: false,
  level: 0,
  collapsed: false,
  style: undefined,
  extra: [],
};

const VALUE: LineLayout = { ...WIDE, size: 15 };

const rowFormulas = (row: number): Entries => {
  const at = String(row + 1);

  return [
    [`D${at}`, `=B${at}*C${at}`],
    [`E${at}`, `=ROUND(D${at}/VLOOKUP("USD",Курсы!$A$2:$B$4,2,FALSE),2)`],
    [`F${at}`, `=IF(D${at}>=100000,"крупная","обычная")`],
  ];
};

const place = (editor: CellEditor, sheet: Sheet, entries: Entries): void => {
  entries.forEach(([address, input]) => {
    const cell = parseCell(address);

    if (cell === undefined) {
      return;
    }

    editor.enter(sheet, cell.row, cell.col, String(input), EN_LOCALE);
  });
};

const headOf = (book: Workbook, sheet: Sheet, count: number): void => {
  const head = book.decorations.id(HEAD);

  for (let col = 0; col < count; col += 1) {
    sheet.decorations.set(0, col, head);
  }
};

export const LOAD_SHEET = 'Нагрузка';

export const formulaSample = (): SampleBook => {
  const book = createWorkbook();
  const calculator = createCalculator(book, { locale: RU_LOCALE });
  const editor = createCellEditor(book, calculator);
  const budget = book.addSheet('Бюджет');
  const rates = book.addSheet('Курсы');

  book.addSheet(LOAD_SHEET);

  FORMATS.forEach(([address, code]) => {
    const range = parseRange(address);

    if (range === undefined) {
      return;
    }

    editor.setFormat(budget, range, code);
  });

  place(editor, rates, RATES);
  place(editor, budget, BUDGET);

  for (let row = 1; row <= 5; row += 1) {
    place(editor, budget, rowFormulas(row));
  }
  headOf(book, budget, COLUMNS);
  headOf(book, rates, 2);

  budget.layout = {
    ...budget.layout,
    cols: lineLayoutsOf([
      [0, WIDE],
      [1, VALUE],
      [2, VALUE],
      [3, VALUE],
      [4, VALUE],
      [5, VALUE],
    ]),
  };

  calculator.recalculate();
  return { book, calculator };
};
