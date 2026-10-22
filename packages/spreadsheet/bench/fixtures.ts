import {
  columnName,
  createCalculator,
  createCellEditor,
  createStepper,
  createWorkbook,
  numberValue,
  textValue,
  type Calculator,
  type CellEditor,
  type CellValue,
  type Sheet,
  type Stepper,
  type Workbook,
} from '@numior/spreadsheet/core';

export interface FilledSheet {
  readonly workbook: Workbook;
  readonly sheet: Sheet;
}

export interface Ledger {
  readonly workbook: Workbook;
  readonly sheet: Sheet;
  readonly rates: Sheet;
  readonly calculator: Calculator;
  readonly formulas: readonly LedgerFormula[];
}

export interface OrderTable {
  readonly workbook: Workbook;
  readonly sheet: Sheet;
  readonly calculator: Calculator;
  readonly editor: CellEditor;
  readonly stepper: Stepper;
}

export interface LedgerFormula {
  readonly row: number;
  readonly col: number;
  readonly text: string;
}

const UNIQUE_TEXTS = 10_000;

const FIRST_SERIAL = 43_831;

const LOOKUP_ROWS = 5000;

const TOTALS = 50;

const splitmix = (seed: number): (() => number) => {
  let state = Math.trunc(seed);

  return () => {
    state = (state + 0x9e3779b9) | 0;
    let mixed = Math.imul(state ^ (state >>> 16), 0x21f0aaad);

    mixed = Math.imul(mixed ^ (mixed >>> 15), 0x735a2d97);
    return ((mixed ^ (mixed >>> 15)) >>> 0) / 4_294_967_296;
  };
};

const texts = Array.from(
  { length: UNIQUE_TEXTS },
  (_, index) => `Item ${String(index).padStart(5, '0')} ${columnName(index % 700)}`,
);

const cellValue = (random: () => number): CellValue => {
  const roll = random();

  if (roll < 0.7) {
    return numberValue(Math.round(random() * 1_000_000) / 100);
  }
  if (roll < 0.95) {
    return textValue(texts[Math.floor(random() * UNIQUE_TEXTS)] ?? '');
  }
  return numberValue(FIRST_SERIAL + Math.floor(random() * 3650));
};

export const filledSheet = (rows: number, cols: number, seed = 1): FilledSheet => {
  const random = splitmix(seed);
  const workbook = createWorkbook();
  const sheet = workbook.addSheet('Data');

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      sheet.cells.set(row, col, cellValue(random));
    }
  }
  return { workbook, sheet };
};

const rowFormulas = (row: number): LedgerFormula[] => {
  const at = String(row + 1);

  const formulas: LedgerFormula[] = [
    { row, col: 2, text: `=A${at}*B${at}` },
    { row, col: 3, text: row === 0 ? '=C1' : `=D${String(row)}+C${at}` },
    { row, col: 5, text: `=IF(AND(A${at}>10,B${at}<5),C${at},0)` },
    { row, col: 6, text: `=ROUND(D${at}/1.2,2)` },
  ];

  return row % 2 === 0
    ? [
        ...formulas,
        { row, col: 4, text: `=VLOOKUP(A${at},Rates!$A$1:$B$${String(LOOKUP_ROWS)},2,FALSE)` },
        { row, col: 7, text: `=C${at}+E${at}` },
      ]
    : formulas;
};

export const ledgerFormulas = (rows: number): readonly LedgerFormula[] => [
  ...Array.from({ length: rows }, (_, row) => rowFormulas(row)).flat(),
  ...Array.from({ length: TOTALS }, (_, index) => {
    const column = columnName(index % 8);

    return { row: rows + 1, col: index, text: `=SUM(${column}1:${column}${String(rows)})` };
  }),
];

export const ledger = (rows: number, seed = 1): Ledger => {
  const random = splitmix(seed);
  const workbook = createWorkbook();
  const sheet = workbook.addSheet('Ledger');
  const rates = workbook.addSheet('Rates');
  const calculator = createCalculator(workbook);
  const formulas = ledgerFormulas(rows);

  for (let row = 0; row < LOOKUP_ROWS; row += 1) {
    calculator.setValue(rates, row, 0, numberValue(row));
    calculator.setValue(rates, row, 1, numberValue(Math.round(random() * 10_000) / 100));
  }
  for (let row = 0; row < rows; row += 1) {
    calculator.setValue(sheet, row, 0, numberValue(Math.floor(random() * LOOKUP_ROWS)));
    calculator.setValue(sheet, row, 1, numberValue(Math.floor(random() * 10)));
  }

  formulas.forEach((formula) => {
    calculator.setFormula(sheet, formula.row, formula.col, formula.text);
  });

  return { workbook, sheet, rates, calculator, formulas };
};

export const orderTable = (rows: number): OrderTable => {
  const workbook = createWorkbook();
  const sheet = workbook.addSheet('Orders');
  const calculator = createCalculator(workbook);
  const editor = createCellEditor(workbook, calculator);
  const stepper = createStepper(workbook, calculator);

  ['Amount', 'Price', 'Total'].forEach((name, col) => {
    calculator.setValue(sheet, 0, col, textValue(name));
  });

  for (let row = 1; row <= rows; row += 1) {
    calculator.setValue(sheet, row, 0, numberValue(row % 97));
    calculator.setValue(sheet, row, 1, numberValue(row % 13));
  }
  stepper.apply(editor.tableStep(sheet, { top: 0, left: 0, bottom: rows, right: 2 }));
  for (let row = 1; row <= rows; row += 1) {
    calculator.setFormula(sheet, row, 2, '=[@Amount]*[@Price]');
  }

  return { workbook, sheet, calculator, editor, stepper };
};
