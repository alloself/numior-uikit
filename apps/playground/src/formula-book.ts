import {
  EMPTY,
  booleanValue,
  createCalculator,
  createWorkbook,
  formulaReferences,
  numberValue,
  parseCell,
  parseFormula,
  rangeOf,
  textValue,
  type CellRange,
  type CellValue,
  type FormulaReference,
  type Sheet,
} from '@numior/spreadsheet/core';
import type { NuiTableCellStyle, NuiTableRange } from '@numior/table';

export const FORMULA_ROWS = 50_000;
export const FORMULA_COLS = 26;
const LOAD_ROWS = 20_000;

const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/iu;

const BUDGET: readonly (readonly [string, string | number])[] = [
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
];

const RATES: readonly (readonly [string, string | number])[] = [
  ['A1', 'Валюта'],
  ['B1', 'Курс'],
  ['A2', 'USD'],
  ['B2', 92.4],
  ['A3', 'EUR'],
  ['B3', 100.6],
  ['A4', 'CNY'],
  ['B4', 12.8],
];

const HEAD: NuiTableCellStyle = {
  fill: 'var(--nui-surface-muted)',
  style: { 'font-weight': 'var(--nui-font-weight-semibold)' },
};

const ALIGN: Readonly<Record<CellValue['kind'], NuiTableCellStyle['align']>> = {
  number: 'end',
  boolean: 'center',
  error: 'center',
  string: undefined,
  empty: undefined,
};

const logicalInput = (upper: string): CellValue | undefined =>
  upper === 'TRUE' || upper === 'FALSE' ? booleanValue(upper === 'TRUE') : undefined;

const numericInput = (trimmed: string): CellValue | undefined =>
  NUMBER.test(trimmed) ? numberValue(Number(trimmed)) : undefined;

const valueOfInput = (text: string): CellValue => {
  const trimmed = text.trim();

  if (trimmed === '') {
    return EMPTY;
  }
  return logicalInput(trimmed.toUpperCase()) ?? numericInput(trimmed) ?? textValue(text);
};

const logicalText = (value: CellValue): string => {
  if (value.kind !== 'boolean') {
    return '';
  }
  return value.value ? 'TRUE' : 'FALSE';
};

const shown = (value: CellValue): string => {
  if (value.kind === 'number') {
    return String(Number(value.value.toPrecision(11)));
  }
  if (value.kind === 'error') {
    return value.code;
  }
  return value.kind === 'string' ? value.value : logicalText(value);
};

const cellStyle = (value: CellValue, stale: boolean): NuiTableCellStyle => ({
  align: ALIGN[value.kind],
  color: stale ? 'var(--nui-text-muted)' : undefined,
  overflow: value.kind === 'string',
});

const referenceRange = (found: FormulaReference): CellRange | undefined => {
  switch (found.kind) {
    case 'range':
      return rangeOf(found.from, found.to);
    case 'cell':
    case 'spill':
      return rangeOf(found.ref, found.ref);
    default:
      return undefined;
  }
};

const rowFormulas = (row: number): readonly (readonly [string, string])[] => {
  const at = String(row + 1);

  return [
    [`D${at}`, `=B${at}*C${at}`],
    [`E${at}`, `=ROUND(D${at}/VLOOKUP("USD",Курсы!$A$2:$B$4,2,FALSE),2)`],
    [`F${at}`, `=IF(D${at}>=100000,"крупная","обычная")`],
  ];
};

const asRange = (range: CellRange): NuiTableRange => ({
  from: { row: range.top, col: range.left },
  to: { row: range.bottom, col: range.right },
});

const keyOf = (row: number, col: number): number => row * FORMULA_COLS + col;

const onSheet = (sheet: Sheet, name: string | undefined): boolean =>
  name === undefined || name === sheet.name;

const visibleRange = (sheet: Sheet, found: FormulaReference): NuiTableRange[] => {
  const range = referenceRange(found);

  return range !== undefined && found.kind !== 'name' && onSheet(sheet, found.sheet)
    ? [asRange(range)]
    : [];
};

export const createFormulaBook = () => {
  const workbook = createWorkbook();
  const budget = workbook.addSheet('Бюджет');
  const rates = workbook.addSheet('Курсы');
  const load = workbook.addSheet('Нагрузка');
  const calculator = createCalculator(workbook);
  const inputs = new Map<Sheet, Map<number, string>>();

  const inputsOf = (sheet: Sheet): Map<number, string> => {
    const known = inputs.get(sheet) ?? new Map<number, string>();

    inputs.set(sheet, known);
    return known;
  };

  const staleAt = (sheet: Sheet, row: number, col: number): boolean =>
    calculator.formulaAt(sheet, row, col)?.state === 'stale';

  const enter = (sheet: Sheet, row: number, col: number, text: string): string | undefined => {
    inputsOf(sheet).set(keyOf(row, col), text);
    if (!text.startsWith('=') || text.length === 1) {
      calculator.setValue(sheet, row, col, valueOfInput(text));
      return undefined;
    }
    const parsed = calculator.setFormula(sheet, row, col, text);

    if (parsed.ok) {
      return undefined;
    }
    calculator.setValue(sheet, row, col, textValue(text));
    return `символ ${String(parsed.error.position + 1)}`;
  };

  const place = (sheet: Sheet, entries: readonly (readonly [string, string | number])[]): void => {
    entries.forEach(([address, input]) => {
      const cell = parseCell(address);

      if (cell !== undefined) {
        enter(sheet, cell.row, cell.col, String(input));
      }
    });
  };

  place(rates, RATES);
  place(budget, BUDGET);
  for (let row = 1; row <= 5; row += 1) {
    place(budget, rowFormulas(row));
  }

  return {
    calculator,
    sheets: [budget, rates, load],
    enter,
    inputAt: (sheet: Sheet, row: number, col: number): string =>
      inputsOf(sheet).get(keyOf(row, col)) ?? '',
    displayAt: (sheet: Sheet, row: number, col: number): string => shown(sheet.cells.get(row, col)),
    styleAt: (sheet: Sheet, row: number, col: number): NuiTableCellStyle => {
      const value = sheet.cells.get(row, col);

      return row === 0 && value.kind === 'string'
        ? HEAD
        : cellStyle(value, staleAt(sheet, row, col));
    },
    referencesOf: (sheet: Sheet, text: string): NuiTableRange[] => {
      const parsed = parseFormula(text);

      return parsed.ok
        ? formulaReferences(parsed.ast).flatMap((found) => visibleRange(sheet, found))
        : [];
    },
    fillLoad: (): Sheet => {
      for (let row = 0; row < LOAD_ROWS; row += 1) {
        const at = String(row + 1);

        enter(load, row, 0, String(row + 1));
        enter(load, row, 1, `=A${at}*2`);
        enter(load, row, 2, row === 0 ? '=B1' : `=C${String(row)}+B${at}`);
      }
      return load;
    },
  };
};

export type FormulaBook = ReturnType<typeof createFormulaBook>;
