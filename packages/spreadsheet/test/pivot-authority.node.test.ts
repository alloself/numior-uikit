import { isEqual, min } from 'lodash-es';
import { describe, expect, it } from 'vite-plus/test';
import {
  EN_FORMULAS,
  createCalculator,
  createStepCodec,
  createStepper,
  createWorkbook,
  numberValue,
  parseFormula,
  textValue,
  workbookAuthority,
  type CellEdit,
  type CellValue,
  type PivotDefinition,
  type Workbook,
  type WorkbookStep,
} from '../src/core';

interface Shared {
  readonly apply: (steps: readonly WorkbookStep[]) => boolean;
  readonly opened: () => Workbook;
}

const RATE_COL = 25;

const KEYS = 50;

const BIG_ROWS = 20_000;

const OUTSIDE_COLUMNS = 5;

const REFRESH_BUDGET_MS = 100;

const REFRESH_RUNS = 3;

const GRAND_TOTAL = 'g';

const definitionOf = (bottom: number, right: number, field: number): PivotDefinition => ({
  source: { kind: 'range', sheet: 'Data', range: { top: 0, left: 0, bottom, right } },
  rows: [0],
  columns: [],
  filters: [],
  values: [
    { field, aggregate: 'sum', name: 'Total', showAs: { kind: 'normal' }, format: undefined },
  ],
  fields: [],
  layout: 'compact',
  rowTotals: true,
  columnTotals: true,
  autofit: false,
  captions: {
    rows: 'r',
    columns: 'c',
    values: 'v',
    total: 't',
    grandTotal: GRAND_TOTAL,
    blank: 'b',
    all: 'a',
    multiple: 'm',
  },
});

const formulaCell = (row: number, col: number, text: string): CellEdit => {
  const parsed = parseFormula(text, EN_FORMULAS, { row, col });

  if (!parsed.ok) {
    throw new Error(`${text} does not parse`);
  }
  return { row, col, content: { kind: 'formula', ast: parsed.ast } };
};

const valueCell = (row: number, col: number, value: CellValue): CellEdit => ({
  row,
  col,
  content: { kind: 'value', value },
});

const rateStep = (rate: number): WorkbookStep => ({
  kind: 'setCells',
  sheet: 'Data',
  cells: [valueCell(0, RATE_COL, numberValue(rate))],
});

const REFRESH: WorkbookStep = { kind: 'refreshPivot', sheet: 'Pivot', name: 'Sales' };

const bookSeed = (cells: readonly CellEdit[], definition: PivotDefinition): WorkbookStep[] => [
  { kind: 'addSheet', name: 'Data', index: 0 },
  { kind: 'setCells', sheet: 'Data', cells: [valueCell(0, RATE_COL, numberValue(2)), ...cells] },
  { kind: 'addSheet', name: 'Pivot', index: 1 },
  {
    kind: 'setPivot',
    sheet: 'Pivot',
    name: 'Sales',
    pivot: { anchor: { row: 0, col: 0 }, definition },
  },
];

const shared = (seed: readonly WorkbookStep[]): Shared => {
  const mirror = createWorkbook();
  const stepper = createStepper(mirror, createCalculator(mirror));
  const codec = createStepCodec(mirror);

  seed.forEach((step) => {
    stepper.apply(step);
  });

  const authority = workbookAuthority(seed);

  return {
    apply: (steps) => authority.apply(steps.map((step) => codec.encode(step))),
    opened: () => {
      const book = createWorkbook();
      const into = createStepper(book, createCalculator(book));
      const reader = createStepCodec(book);

      for (const wire of authority.snapshot().steps) {
        const step = reader.decode(wire);

        if (step === undefined) {
          throw new Error('the snapshot does not read');
        }

        into.apply(step);
      }
      return book;
    },
  };
};

const grandTotalOf = (book: Workbook): CellValue | undefined => {
  const pivot = book.sheet('Pivot');

  const row = Array.from({ length: KEYS + 4 }, (_, at) => at).find((at) =>
    isEqual(pivot?.cells.get(at, 0), textValue(GRAND_TOTAL)),
  );

  return row === undefined ? undefined : pivot?.cells.get(row, 1);
};

const smallSeed = (): WorkbookStep[] => {
  const cells = [
    valueCell(0, 0, textValue('Key')),
    valueCell(0, 1, textValue('Number')),
    valueCell(0, 2, textValue('Amount')),
  ];

  for (let row = 1; row <= 3; row += 1) {
    cells.push(valueCell(row, 0, textValue('k')));
    cells.push(valueCell(row, 1, numberValue(row)));
    cells.push(formulaCell(row, 2, `=B${String(row + 1)}*$Z$1`));
  }
  return bookSeed(cells, definitionOf(3, 2, 2));
};

const bigSeed = (): WorkbookStep[] => {
  const cells = [valueCell(0, 0, textValue('Key')), valueCell(0, 1, textValue('Number'))];

  for (let row = 1; row <= BIG_ROWS; row += 1) {
    cells.push(valueCell(row, 0, textValue(`k${String(row % KEYS)}`)));
    cells.push(valueCell(row, 1, numberValue(row)));
    for (let col = 3; col < 3 + OUTSIDE_COLUMNS; col += 1) {
      cells.push(formulaCell(row, col, `=$Z$1*B${String(row + 1)}`));
    }
  }
  return bookSeed(cells, definitionOf(BIG_ROWS, 1, 1));
};

describe('a pivot in a shared workbook', () => {
  it('shows on the server the values of formulas its source reads after an edit they depend on', () => {
    const book = shared(smallSeed());

    expect(book.apply([rateStep(3), REFRESH])).toBe(true);

    expect(grandTotalOf(book.opened())).toEqual(numberValue(18));
  });

  it(
    'refreshes a pivot whose source holds no formulas within the budget while the formulas of the book wait',
    { tags: ['budget'] },
    () => {
      const book = shared(bigSeed());
      const spent: number[] = [];

      for (let run = 0; run < REFRESH_RUNS; run += 1) {
        book.apply([rateStep(3 + run)]);

        const started = performance.now();

        expect(book.apply([REFRESH])).toBe(true);

        spent.push(performance.now() - started);
      }

      expect(grandTotalOf(book.opened())).toEqual(numberValue((BIG_ROWS * (BIG_ROWS + 1)) / 2));
      expect(min(spent)).toBeLessThan(REFRESH_BUDGET_MS);
    },
  );
});
