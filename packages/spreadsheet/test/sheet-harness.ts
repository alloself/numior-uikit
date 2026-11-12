import { expect } from 'vite-plus/test';
import {
  booleanValue,
  createCalculator,
  createWorkbook,
  formatRange,
  numberValue,
  parseCell,
  parseRange,
  textValue,
  type CalculatorOptions,
  type CellValue,
  type FormulaState,
  type RecalcOptions,
  type Sheet,
} from '../src/core';

type Shown = number | string | boolean | null;

type Input = number | string | boolean;

const at = (address: string): { readonly row: number; readonly col: number } => {
  const ref = parseCell(address);

  if (ref === undefined) {
    throw new Error(`${address} is not a cell`);
  }
  return ref;
};

const shown = (value: CellValue): Shown => {
  switch (value.kind) {
    case 'empty':
      return null;
    case 'error':
      return value.code;
    default:
      return value.value;
  }
};

export const openSheet = (options: CalculatorOptions = {}) => {
  const workbook = createWorkbook();
  const sheet = workbook.addSheet();
  const calculator = createCalculator(workbook, options);

  const place = (target: Sheet, address: string, input: Input): void => {
    const { row, col } = at(address);

    if (typeof input === 'number') {
      calculator.setValue(target, row, col, numberValue(input));
    } else if (typeof input === 'boolean') {
      calculator.setValue(target, row, col, booleanValue(input));
    } else if (input.startsWith('=')) {
      expect(calculator.setFormula(target, row, col, input).ok).toBe(true);
    } else {
      calculator.setValue(target, row, col, textValue(input));
    }
  };

  return {
    workbook,
    sheet,
    calculator,
    enter: (address: string, input: Input, target: Sheet = sheet): void => {
      place(target, address, input);
    },
    clear: (address: string): void => {
      const { row, col } = at(address);

      calculator.setValue(sheet, row, col, { kind: 'empty' });
    },
    recalc: (run: RecalcOptions = { budgetMs: Number.POSITIVE_INFINITY }) =>
      calculator.recalculate(run),
    value: (address: string, target: Sheet = sheet): CellValue => {
      const { row, col } = at(address);

      return target.cells.get(row, col);
    },
    grid: (address: string): Shown[][] => {
      const range = parseRange(address);

      if (range === undefined) {
        throw new Error(`${address} is not a range`);
      }
      return Array.from({ length: range.bottom - range.top + 1 }, (_, row) =>
        Array.from({ length: range.right - range.left + 1 }, (_item, col) =>
          shown(sheet.cells.get(range.top + row, range.left + col)),
        ),
      );
    },
    spill: (address: string): string | undefined => {
      const { row, col } = at(address);
      const range = calculator.spillOf(sheet, row, col);

      return range === undefined ? undefined : formatRange(range);
    },
    stale: (address: string): boolean => {
      const { row, col } = at(address);

      return calculator.staleAt(sheet, row, col);
    },
    state: (address: string): FormulaState | undefined => {
      const { row, col } = at(address);

      return calculator.formulaAt(sheet, row, col)?.state;
    },
  };
};

export const evaluated = (formula: string): CellValue => {
  const sheet = openSheet();

  sheet.enter('Z1', formula);
  sheet.recalc();
  return sheet.value('Z1');
};
