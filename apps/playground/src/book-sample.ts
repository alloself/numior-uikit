import {
  DrawingAnchorKind,
  DrawingKind,
  DrawingPlacement,
  EN_FORMULAS,
  RU_LOCALE,
  SheetChartGaps,
  SheetChartKind,
  SheetChartStacking,
  createCalculator,
  createCellEditor,
  columnName,
  createWorkbook,
  lineLayoutsOf,
  numberValue,
  parseFormula,
  textValue,
  type Calculator,
  type CellDecoration,
  type ConditionalFormat,
  type FormulaNode,
  type LineLayout,
  type Sheet,
  type SheetDrawing,
  type Workbook,
} from '@numior/spreadsheet/core';
import type { LimitationsReport } from '@numior/spreadsheet/xlsx';

export interface SampleBook {
  readonly book: Workbook;
  readonly calculator: Calculator;
  readonly report?: LimitationsReport | undefined;
}

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь'];

const LINES = [
  { name: 'Выручка', base: 1240, step: 85 },
  { name: 'Себестоимость', base: -610, step: -32 },
  { name: 'Маркетинг', base: -140, step: -6 },
  { name: 'Аренда', base: -95, step: 0 },
  { name: 'Зарплаты', base: -310, step: -12 },
];

const SALES_HEADER = ['Регион', 'Город', 'Менеджер', 'Квартал', 'Сумма'];

const CITIES = [
  { region: 'Центр', city: 'Москва', manager: 'Иванова' },
  { region: 'Центр', city: 'Тула', manager: 'Петров' },
  { region: 'Северо-Запад', city: 'Санкт-Петербург', manager: 'Смирнова' },
  { region: 'Северо-Запад', city: 'Псков', manager: 'Петров' },
  { region: 'Урал', city: 'Екатеринбург', manager: 'Козлов' },
  { region: 'Урал', city: 'Пермь', manager: 'Иванова' },
];

const QUARTERS = ['I кв.', 'II кв.', 'III кв.', 'IV кв.'];

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

const GROWTH: ConditionalFormat = {
  ranges: [{ top: 2, left: 1, bottom: 2, right: MONTHS.length }],
  rules: [
    {
      rule: {
        kind: 'colorScale',
        stops: [
          { threshold: { kind: 'min' }, color: { kind: 'rgb', argb: 'FFFFFFFF' } },
          { threshold: { kind: 'max' }, color: { kind: 'rgb', argb: 'FF63BE7B' } },
        ],
      },
      priority: 2,
      stopIfTrue: false,
    },
  ],
};

const OVERSPEND: ConditionalFormat = {
  ranges: [{ top: 3, left: 1, bottom: 3, right: MONTHS.length }],
  rules: [
    {
      rule: {
        kind: 'cellIs',
        operator: 'lessThan',
        formulas: [{ kind: 'number', value: -650 }],
        style: {
          fill: { pattern: 'solid', background: { kind: 'rgb', argb: 'FFFFC7CE' } },
          font: { color: { kind: 'rgb', argb: 'FF9C0006' } },
        },
      },
      priority: 1,
      stopIfTrue: false,
    },
  ],
};

const MARKETING: ConditionalFormat = {
  ranges: [{ top: 4, left: 1, bottom: 4, right: MONTHS.length }],
  rules: [
    {
      rule: {
        kind: 'dataBar',
        min: { kind: 'max' },
        max: { kind: 'min' },
        color: { kind: 'rgb', argb: 'FF638EC6' },
        showValue: true,
      },
      priority: 3,
      stopIfTrue: false,
    },
  ],
};

const PROFIT: ConditionalFormat = {
  ranges: [{ top: LINES.length + 2, left: 1, bottom: LINES.length + 2, right: MONTHS.length }],
  rules: [
    {
      rule: {
        kind: 'iconSet',
        set: '3Arrows',
        thresholds: [
          { kind: 'min' },
          { kind: 'percent', value: { kind: 'number', value: 33 } },
          { kind: 'percent', value: { kind: 'number', value: 67 } },
        ],
        reverse: false,
        showValue: true,
      },
      priority: 4,
      stopIfTrue: false,
    },
  ],
};

const WIDE: LineLayout = {
  size: 18,
  custom: true,
  hidden: false,
  level: 0,
  collapsed: false,
  style: undefined,
  extra: [],
};

const LOGO =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><rect width="120" height="60" rx="10" fill="#2563eb"/><text x="60" y="38" font-family="sans-serif" font-size="22" font-weight="700" fill="#fff" text-anchor="middle">Numior</text></svg>';

const reference = (text: string): FormulaNode => {
  const parsed = parseFormula(text, EN_FORMULAS);

  if (!parsed.ok) {
    throw new Error(`${text} is not a reference`);
  }
  return parsed.ast;
};

const budgetChart = (total: number): SheetDrawing => ({
  id: 'sample#chart',
  name: 'Выручка и прибыль',
  alt: '',
  anchor: {
    kind: DrawingAnchorKind.Cells,
    placement: DrawingPlacement.TwoCell,
    from: { row: total + 10, col: 0, dx: 0, dy: 0 },
    to: { row: total + 26, col: 7, dx: 0, dy: 0 },
  },
  content: {
    kind: DrawingKind.Chart,
    chart: {
      kind: SheetChartKind.Column,
      title: 'Выручка и прибыль по месяцам',
      legend: true,
      stacking: SheetChartStacking.None,
      gaps: SheetChartGaps.Break,
      hole: undefined,
      series: [3, total + 1].map((row) => ({
        name: reference(`'Бюджет'!$A$${String(row)}`),
        categories: reference(`'Бюджет'!$B$2:$G$2`),
        values: reference(`'Бюджет'!$B$${String(row)}:$G$${String(row)}`),
      })),
    },
  },
});

const NOTE_DRAWINGS: readonly SheetDrawing[] = [
  {
    id: 'sample#logo',
    name: 'Логотип',
    alt: 'Логотип Numior',
    anchor: {
      kind: DrawingAnchorKind.Cell,
      from: { row: 2, col: 1, dx: 8, dy: 4 },
      width: 120,
      height: 60,
    },
    content: {
      kind: DrawingKind.Picture,
      media: 'xl/media/logo.svg',
      type: 'image/svg+xml',
      bytes: new TextEncoder().encode(LOGO),
    },
  },
  {
    id: 'sample#shape',
    name: 'Схема',
    alt: '',
    anchor: {
      kind: DrawingAnchorKind.Cells,
      placement: DrawingPlacement.OneCell,
      from: { row: 2, col: 4, dx: 0, dy: 0 },
      to: { row: 8, col: 7, dx: 0, dy: 0 },
    },
    content: { kind: DrawingKind.Foreign, label: 'smartArt' },
  },
];

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
    drawings: [budgetChart(total)],
  };

  sheet.conditional = [OVERSPEND, GROWTH, MARKETING, PROFIT];
};

const fillSales = (book: Workbook, sheet: Sheet): void => {
  const money = book.formats.id(MONEY);

  SALES_HEADER.forEach((name, col) => {
    sheet.cells.set(0, col, textValue(name));
    decorate(book, sheet, 0, col, HEAD);
  });

  CITIES.forEach((place, at) => {
    QUARTERS.forEach((quarter, index) => {
      const row = 1 + at * QUARTERS.length + index;

      sheet.cells.set(row, 0, textValue(place.region));
      sheet.cells.set(row, 1, textValue(place.city));
      sheet.cells.set(row, 2, textValue(place.manager));
      sheet.cells.set(row, 3, textValue(quarter));
      sheet.cells.set(row, 4, numberValue(320 + ((at * 7 + index * 11) % 13) * 45));
      sheet.formats.set(row, 4, money);
    });
  });

  sheet.layout = {
    ...sheet.layout,
    cols: lineLayoutsOf([
      [0, WIDE],
      [1, WIDE],
      [2, WIDE],
    ]),
    view: { ...sheet.layout.view, frozenRows: 1 },
  };
};

const sumTotals = (book: Workbook, calculator: Calculator, sheet: Sheet): void => {
  const editor = createCellEditor(book, calculator);
  const total = LINES.length + 2;

  MONTHS.forEach((_month, index) => {
    const column = columnName(index + 1);

    editor.enter(sheet, total, index + 1, `=СУММ(${column}3:${column}${String(total)})`);
  });
};

export const sampleBook = (): SampleBook => {
  const book = createWorkbook();
  const calculator = createCalculator(book, { locale: RU_LOCALE });
  const budget = book.addSheet('Бюджет');
  const notes = book.addSheet('Заметки');
  const sales = book.addSheet('Продажи');

  fillBudget(book, budget);
  fillSales(book, sales);
  sumTotals(book, calculator, budget);
  calculator.recalculate();
  notes.cells.set(0, 0, textValue('Второй лист без сетки'));

  notes.layout = {
    ...notes.layout,
    view: { ...notes.layout.view, gridlines: false },
    drawings: NOTE_DRAWINGS,
  };

  return { book, calculator };
};
