import { describe, expect, it } from 'vite-plus/test';
import {
  EN_FORMULAS,
  columnName,
  parseCell,
  parseFormula,
  type ConditionalFormat,
  type DifferentialStyle,
  type FormulaNode,
} from '../src/core';
import { sheetCells } from '../src';
import { openBook } from './book-harness';

const PINK: DifferentialStyle = {
  fill: { pattern: 'solid', background: { kind: 'rgb', argb: 'FFFFC7CE' } },
  font: { bold: true, color: { kind: 'rgb', argb: 'FF9C0006' } },
};

const PERCENT: DifferentialStyle = { format: '0%' };

const formula = (text: string): FormulaNode => {
  const parsed = parseFormula(text, EN_FORMULAS, { row: 0, col: 0 });

  if (!parsed.ok) {
    throw new Error(`${text} does not parse`);
  }
  return parsed.ast;
};

const span = (from: string, to: string) => {
  const start = parseCell(from);
  const end = parseCell(to);

  if (start === undefined || end === undefined) {
    throw new Error(`${from}:${to} is not a range`);
  }
  return { top: start.row, left: start.col, bottom: end.row, right: end.col };
};

const paintedBook = (formats: readonly ConditionalFormat[]) => {
  const sheet = openBook();

  ['5', '12', '30'].forEach((value, index) => {
    sheet.type(`A${String(index + 1)}`, value);
    sheet.type(`B${String(index + 1)}`, value);
  });

  sheet.type('C1', '0.25');
  sheet.commit({ kind: 'setConditional', sheet: 'Sheet1', formats });

  const cells = sheetCells({ book: sheet.book, sheet: sheet.first, calculator: sheet.calculator });

  const styleAt = (address: string) => {
    const cell = parseCell(address);

    if (cell === undefined) {
      throw new Error(`${address} is not a cell`);
    }
    return cells.source.cellAt(cell.row, cell.col);
  };

  return { ...sheet, styleAt };
};

const MANY_SHEETS = 2000;

const SCREEN_ROWS = 60;

const SCREEN_COLS = 40;

const LOOKS_BUDGET_MS = 40;

const greaterThanTen: ConditionalFormat = {
  ranges: [span('A1', 'A3')],
  rules: [
    {
      rule: { kind: 'cellIs', operator: 'greaterThan', formulas: [formula('10')], style: PINK },
      priority: 1,
      stopIfTrue: false,
    },
  ],
};

const redToGreen: ConditionalFormat = {
  ranges: [span('B1', 'B3')],
  rules: [
    {
      rule: {
        kind: 'colorScale',
        stops: [
          { threshold: { kind: 'min' }, color: { kind: 'rgb', argb: 'FFFF0000' } },
          { threshold: { kind: 'max' }, color: { kind: 'rgb', argb: 'FF00FF00' } },
        ],
      },
      priority: 2,
      stopIfTrue: false,
    },
  ],
};

const asPercent: ConditionalFormat = {
  ranges: [span('C1', 'C1')],
  rules: [
    {
      rule: { kind: 'expression', formula: formula('=TRUE'), style: PERCENT },
      priority: 3,
      stopIfTrue: false,
    },
  ],
};

const barsAndArrows: ConditionalFormat = {
  ranges: [span('B1', 'B3')],
  rules: [
    {
      rule: {
        kind: 'dataBar',
        min: { kind: 'min' },
        max: { kind: 'max' },
        color: { kind: 'rgb', argb: 'FF638EC6' },
        showValue: false,
      },
      priority: 1,
      stopIfTrue: false,
    },
    {
      rule: {
        kind: 'iconSet',
        set: '3Arrows',
        thresholds: [
          { kind: 'min' },
          { kind: 'percent', value: formula('33') },
          { kind: 'percent', value: formula('67') },
        ],
        reverse: false,
        showValue: true,
      },
      priority: 2,
      stopIfTrue: false,
    },
  ],
};

describe('conditional formats in sheet cells', () => {
  it('paints the differential style of matching cells and leaves the rest as they are', () => {
    const sheet = paintedBook([greaterThanTen]);

    expect(sheet.styleAt('A1')?.style?.fill).toBeUndefined();

    expect(sheet.styleAt('A2')?.style).toMatchObject({
      fill: '#FFC7CE',
      color: '#9C0006',
      style: { 'font-weight': '700' },
    });
  });

  it('blends colour scale fills between the stops by the value', () => {
    const sheet = paintedBook([redToGreen]);

    expect(['B1', 'B2', 'B3'].map((address) => sheet.styleAt(address)?.style?.fill)).toEqual([
      '#FF0000',
      '#B84700',
      '#00FF00',
    ]);
  });

  it('draws solid data bars in the rule colour and icons from the set, hiding the value when asked', () => {
    const sheet = paintedBook([barsAndArrows]);
    const cells = ['B1', 'B3'].map((address) => sheet.styleAt(address));

    expect(cells.map((cell) => cell?.style?.bar)).toEqual([
      { length: 0.1, color: '#638EC6' },
      { length: 0.9, color: '#638EC6' },
    ]);

    expect(cells.map((cell) => cell?.style?.icon?.color)).toEqual([
      'var(--color-error)',
      'var(--color-success)',
    ]);

    expect(cells.map((cell) => cell?.text)).toEqual(['', '']);
  });

  it('formats values through a rule number format', () => {
    const sheet = paintedBook([asPercent]);

    expect(sheet.styleAt('C1')?.text).toBe('25%');
  });

  it('follows edits of the painted values', () => {
    const sheet = paintedBook([greaterThanTen]);
    const before = sheet.styleAt('A1')?.style?.fill;

    sheet.type('A1', '50');

    expect(before).toBeUndefined();

    expect(sheet.styleAt('A1')?.style?.fill).toBe('#FFC7CE');
  });

  it(
    'reads the looks of a screen of cells in a book of many sheets within the budget',
    { tags: ['budget'] },
    () => {
      const book = paintedBook([greaterThanTen]);

      for (let index = 0; index < MANY_SHEETS; index += 1) {
        book.book.addSheet(`Extra${String(index)}`);
      }

      const screen = (): number => {
        const started = performance.now();

        for (let row = 0; row < SCREEN_ROWS; row += 1) {
          for (let col = 0; col < SCREEN_COLS; col += 1) {
            book.styleAt(`${columnName(col)}${String(row + 1)}`);
          }
        }
        return performance.now() - started;
      };

      screen();

      expect(screen()).toBeLessThan(LOOKS_BUDGET_MS);
    },
  );
});
