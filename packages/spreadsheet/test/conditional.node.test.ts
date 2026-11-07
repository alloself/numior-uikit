import { describe, expect, it } from 'vite-plus/test';
import {
  EN_FORMULAS,
  MAX_COLS,
  createCalculator,
  createConditionalPainter,
  createWorkbook,
  numberValue,
  parseCell,
  parseFormula,
  printFormula,
  type ConditionalEntry,
  type ConditionalFormat,
  type ConditionalRule,
  type DifferentialStyle,
  type FormulaNode,
  type Threshold,
} from '../src/core';
import { openBook } from './book-harness';

const RED: DifferentialStyle = {
  fill: { pattern: 'solid', background: { kind: 'rgb', argb: 'FFFFC7CE' } },
};

const BOLD: DifferentialStyle = { font: { bold: true } };

const LOW = { kind: 'rgb', argb: 'FFF8696B' } as const;

const HIGH = { kind: 'rgb', argb: 'FF63BE7B' } as const;

const at = (address: string): { readonly row: number; readonly col: number } => {
  const cell = parseCell(address);

  if (cell === undefined) {
    throw new Error(`${address} is not a cell`);
  }
  return cell;
};

const formula = (text: string, anchor = 'A1'): FormulaNode => {
  const parsed = parseFormula(text, EN_FORMULAS, at(anchor));

  if (!parsed.ok) {
    throw new Error(`${text} does not parse`);
  }
  return parsed.ast;
};

const number = (value: number): Threshold => ({
  kind: 'number',
  value: { kind: 'number', value },
});

const entry = (rule: ConditionalRule, priority = 1, stopIfTrue = false): ConditionalEntry => ({
  rule,
  priority,
  stopIfTrue,
});

const span = (address: string) => {
  const [from = '', to = from] = address.split(':');
  const start = at(from);
  const end = at(to);

  return { top: start.row, left: start.col, bottom: end.row, right: end.col };
};

const withRules = () => {
  const sheet = openBook();
  const painter = createConditionalPainter(sheet.calculator);

  const lookAt = (address: string) => {
    const cell = at(address);

    sheet.calculator.recalculate({ budgetMs: Number.POSITIVE_INFINITY });
    return painter.looks(sheet.first, span(address)).get(cell.row * MAX_COLS + cell.col);
  };

  return {
    ...sheet,
    fill: (column: string, values: readonly (number | string)[]) => {
      values.forEach((value, index) => {
        sheet.type(`${column}${String(index + 1)}`, String(value));
      });
    },
    rules: (formats: readonly ConditionalFormat[]) =>
      sheet.commit({ kind: 'setConditional', sheet: 'Sheet1', formats }),
    lookAt,
    styled: (addresses: readonly string[]) =>
      addresses.map((address) => lookAt(address)?.style !== undefined),
    formulasOf: (index = 0) => {
      const rule = sheet.first.conditional[index]?.rules[0]?.rule;
      const anchor = sheet.first.conditional[index]?.ranges[0];
      const origin = { row: anchor?.top ?? 0, col: anchor?.left ?? 0 };

      return rule?.kind === 'expression' ? printFormula(rule.formula, EN_FORMULAS, origin) : '';
    },
  };
};

describe('conditional formats', () => {
  it('compares cell values and evaluates expressions relative to each cell', () => {
    const sheet = withRules();

    sheet.fill('A', [5, 12, 30]);
    sheet.fill('B', [1, 20, 2]);

    sheet.rules([
      {
        ranges: [span('A1:A3')],
        rules: [
          entry({
            kind: 'cellIs',
            operator: 'between',
            formulas: [formula('10'), formula('20')],
            style: RED,
          }),
        ],
      },
      {
        ranges: [span('B1:B3')],
        rules: [entry({ kind: 'expression', formula: formula('=A1>B1', 'B1'), style: BOLD }, 2)],
      },
    ]);

    expect(sheet.styled(['A1', 'A2', 'A3'])).toEqual([false, true, false]);
    expect(sheet.styled(['B1', 'B2', 'B3'])).toEqual([true, false, true]);
    expect(sheet.lookAt('A2')?.style).toEqual(RED);
  });

  it('applies rules by priority, merges their parts and stops where asked', () => {
    const sheet = withRules();

    sheet.fill('A', [1, 2, 3]);

    sheet.rules([
      {
        ranges: [span('A1:A3')],
        rules: [
          entry(
            { kind: 'cellIs', operator: 'greaterThan', formulas: [formula('1')], style: BOLD },
            2,
          ),
          entry(
            { kind: 'cellIs', operator: 'equal', formulas: [formula('3')], style: RED },
            1,
            true,
          ),
          entry(
            { kind: 'expression', formula: formula('=TRUE'), style: { font: { italic: true } } },
            3,
          ),
        ],
      },
    ]);

    expect(sheet.lookAt('A1')?.style).toEqual({ font: { italic: true } });

    expect(sheet.lookAt('A2')?.style).toEqual({
      font: { bold: true },
      fill: undefined,
      border: undefined,
      format: undefined,
    });

    expect(sheet.lookAt('A3')?.style).toEqual(RED);
  });

  it('lets the fill of the rule with the higher priority win over a colour scale', () => {
    const sheet = withRules();

    const scale = entry(
      {
        kind: 'colorScale',
        stops: [
          { threshold: { kind: 'min' }, color: LOW },
          { threshold: { kind: 'max' }, color: HIGH },
        ],
      },
      2,
    );

    const pink = {
      kind: 'cellIs',
      operator: 'greaterThan',
      formulas: [formula('1')],
      style: { ...RED, ...BOLD },
    } as const;

    sheet.fill('A', [1, 2, 3]);
    sheet.rules([{ ranges: [span('A1:A3')], rules: [entry(pink, 1), scale] }]);

    const above = sheet.lookAt('A2');

    sheet.rules([{ ranges: [span('A1:A3')], rules: [entry(pink, 3), scale] }]);

    expect([above?.style?.fill, above?.scale]).toEqual([RED.fill, undefined]);

    expect([sheet.lookAt('A2')?.style, sheet.lookAt('A2')?.scale?.amount]).toEqual([
      { font: { bold: true }, fill: undefined },
      0.5,
    ]);
  });

  it('scales colours, sizes bars and picks icons from the numbers of the range', () => {
    const sheet = withRules();

    sheet.fill('A', [0, 25, 50, 75, 100]);

    sheet.rules([
      {
        ranges: [span('A1:A5')],
        rules: [
          entry({
            kind: 'colorScale',
            stops: [
              { threshold: { kind: 'min' }, color: LOW },
              { threshold: { kind: 'max' }, color: HIGH },
            ],
          }),
          entry(
            {
              kind: 'dataBar',
              min: { kind: 'min' },
              max: { kind: 'max' },
              color: HIGH,
              showValue: false,
            },
            2,
          ),
          entry(
            {
              kind: 'iconSet',
              set: '3Arrows',
              thresholds: [
                number(0),
                { kind: 'percent', value: formula('33') },
                { kind: 'percent', value: formula('67') },
              ],
              reverse: false,
              showValue: true,
            },
            3,
          ),
        ],
      },
    ]);

    expect(sheet.lookAt('A2')?.scale).toEqual({ from: LOW, to: HIGH, amount: 0.25 });
    expect(sheet.lookAt('A5')?.bar).toEqual({ length: 0.9, color: HIGH });
    expect(sheet.lookAt('A1')?.bar?.length).toBeCloseTo(0.1);
    expect(sheet.lookAt('A1')?.hideValue).toBe(true);

    expect(['A1', 'A3', 'A5'].map((address) => sheet.lookAt(address)?.icon?.index)).toEqual([
      0, 1, 2,
    ]);
  });

  it('ranks, averages, finds repeats, texts, blanks and errors', () => {
    const sheet = withRules();

    sheet.fill('A', [10, 20, 30, 40, 50]);
    sheet.fill('B', ['pen', 'Ink', 'pen', 'ink pot', '']);
    sheet.type('C1', '=1/0');

    sheet.rules([
      {
        ranges: [span('A1:A5')],
        rules: [entry({ kind: 'top', rank: 2, percent: false, bottom: false, style: RED })],
      },
      {
        ranges: [span('A1:A5')],
        rules: [
          entry({ kind: 'aboveAverage', below: true, equal: false, deviations: 0, style: BOLD }, 2),
        ],
      },
      {
        ranges: [span('B1:B5')],
        rules: [
          entry({ kind: 'duplicates', style: RED }, 3),
          entry({ kind: 'text', operator: 'contains', text: 'INK', style: BOLD }, 4),
          entry({ kind: 'blanks', style: { format: '@' } }, 5),
        ],
      },
      {
        ranges: [span('C1:C2')],
        rules: [entry({ kind: 'errors', style: RED }, 6)],
      },
    ]);

    expect(['A3', 'A4', 'A5'].map((address) => sheet.lookAt(address)?.style?.fill)).toEqual([
      undefined,
      RED.fill,
      RED.fill,
    ]);

    expect(sheet.styled(['A1', 'A2', 'A3'])).toEqual([true, true, false]);
    expect(sheet.styled(['B1', 'B2', 'B3', 'B4', 'B5'])).toEqual([true, true, true, true, true]);
    expect(sheet.lookAt('B2')?.style).toEqual(BOLD);
    expect(sheet.lookAt('B5')?.style?.format).toBe('@');
    expect(sheet.styled(['C1', 'C2'])).toEqual([true, false]);
  });

  it('ranks numbers spread over several storage chunks', () => {
    const sheet = withRules();

    [1, 7, 3, 9, 5, 2].forEach((value, index) => {
      sheet.type(`A${String(index < 3 ? index + 1 : index + 998)}`, String(value));
    });

    sheet.rules([
      {
        ranges: [span('A1:A1003')],
        rules: [
          entry({ kind: 'top', rank: 2, percent: false, bottom: false, style: RED }),
          entry({ kind: 'top', rank: 1, percent: false, bottom: true, style: BOLD }, 2),
          entry(
            {
              kind: 'colorScale',
              stops: [
                { threshold: { kind: 'min' }, color: LOW },
                { threshold: { kind: 'percentile', value: formula('50') }, color: LOW },
                { threshold: { kind: 'max' }, color: HIGH },
              ],
            },
            3,
          ),
        ],
      },
    ]);

    expect(sheet.styled(['A1', 'A2', 'A3', 'A1001', 'A1002'])).toEqual([
      true,
      true,
      false,
      true,
      false,
    ]);

    expect(sheet.lookAt('A2')?.style).toEqual(RED);
    expect(sheet.lookAt('A1')?.style).toEqual(BOLD);
    expect(sheet.lookAt('A1001')?.scale).toBeUndefined();
    expect(sheet.lookAt('A1')?.scale?.amount).toBeCloseTo(0);
    expect(sheet.lookAt('A3')?.scale?.amount).toBeCloseTo(2 / 3);
  });

  it('follows edits of the range it summarises', () => {
    const sheet = withRules();

    sheet.fill('A', [1, 2, 3]);

    sheet.rules([
      {
        ranges: [span('A1:A3')],
        rules: [entry({ kind: 'top', rank: 1, percent: false, bottom: false, style: RED })],
      },
    ]);

    expect(sheet.styled(['A1', 'A3'])).toEqual([false, true]);

    sheet.type('A1', '9');

    expect(sheet.styled(['A1', 'A3'])).toEqual([true, false]);
  });

  it('matches dates against periods around today', () => {
    const book = createWorkbook();
    const target = book.addSheet('Sheet1');
    const calculator = createCalculator(book, { clock: () => new Date(2026, 9, 22, 12) });
    const painter = createConditionalPainter(calculator);

    [46317, 46316, 46310, 46300, 46288].forEach((serial, row) => {
      calculator.setValue(target, row, 0, numberValue(serial));
    });

    target.conditional = [
      {
        ranges: [span('A1:A5')],
        rules: [
          entry({ kind: 'timePeriod', period: 'last7Days', style: RED }),
          entry({ kind: 'timePeriod', period: 'lastMonth', style: BOLD }, 2),
        ],
      },
    ];

    const looks = painter.looks(target, span('A1:A5'));

    expect([0, 1, 2, 3, 4].map((row) => looks.get(row * MAX_COLS)?.style)).toEqual([
      RED,
      RED,
      undefined,
      undefined,
      BOLD,
    ]);
  });

  it('moves ranges and formulas with inserted and deleted rows and restores them on undo', () => {
    const sheet = withRules();

    sheet.fill('A', [1, 2, 3, 4]);

    sheet.rules([
      {
        ranges: [span('A2:A4')],
        rules: [entry({ kind: 'expression', formula: formula('=A2>$A$1', 'A2'), style: RED })],
      },
    ]);

    sheet.insert('1', 2);

    expect(sheet.first.conditional[0]?.ranges).toEqual([span('A4:A6')]);
    expect(sheet.formulasOf()).toBe('A4>$A$3');
    expect(sheet.styled(['A4', 'A6'])).toEqual([true, true]);

    sheet.remove('4');

    expect(sheet.first.conditional[0]?.ranges).toEqual([span('A4:A5')]);
    expect(sheet.formulasOf()).toBe('A4>$A$3');

    sheet.history.undo();
    sheet.history.undo();

    expect(sheet.first.conditional[0]?.ranges).toEqual([span('A2:A4')]);
    expect(sheet.formulasOf()).toBe('A2>$A$1');
  });

  it('stretches relative references over columns inserted between the cell and its target', () => {
    const sheet = withRules();

    sheet.rules([
      {
        ranges: [span('A1:A3')],
        rules: [entry({ kind: 'expression', formula: formula('=B1>0'), style: RED })],
      },
    ]);

    sheet.insert('B');

    expect(sheet.formulasOf()).toBe('C1>0');

    sheet.remove('A');

    expect(sheet.first.conditional).toEqual([]);
  });

  it('renames and drops sheets in rule formulas', () => {
    const sheet = withRules();

    sheet.rules([
      {
        ranges: [span('A1')],
        rules: [entry({ kind: 'expression', formula: formula('=Rates!B1>0'), style: RED })],
      },
    ]);

    sheet.commit({ kind: 'renameSheet', from: 'Rates', to: 'Prices' });

    expect(sheet.formulasOf()).toBe('Prices!B1>0');

    sheet.commit({ kind: 'removeSheet', name: 'Prices' });

    expect(sheet.formulasOf()).toBe('#REF!>0');

    sheet.history.undo();

    expect(sheet.formulasOf()).toBe('Prices!B1>0');
  });
});
