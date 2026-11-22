import * as fc from 'fast-check';
import { describe, expect, it } from 'vite-plus/test';
import {
  EN_FORMULAS,
  columnName,
  createCalculator,
  createStepper,
  createWorkbook,
  createWorkbookHistory,
  parseFormula,
  printFormula,
  type Calculator,
  type CellEdit,
  type CellRange,
  type Sheet,
  type Workbook,
  type WorkbookStep,
} from '../src/core';

interface Desk {
  readonly book: Workbook;
  readonly calculator: Calculator;
  readonly history: ReturnType<typeof createWorkbookHistory>;
  added: number;
}

interface Difference {
  readonly cell: string;
  readonly live: string | undefined;
  readonly fresh: string | undefined;
}

type Axis = 'rows' | 'cols';

type MoveKind = (typeof MoveKind)[keyof typeof MoveKind];

type Move =
  | {
      readonly kind: typeof MoveKind.Value;
      readonly sheet: number;
      readonly row: number;
      readonly col: number;
      readonly value: number;
    }
  | {
      readonly kind: typeof MoveKind.Formula;
      readonly sheet: number;
      readonly row: number;
      readonly col: number;
      readonly text: string;
      readonly other: number;
    }
  | {
      readonly kind: typeof MoveKind.Lines;
      readonly sheet: number;
      readonly insert: boolean;
      readonly axis: Axis;
      readonly at: number;
      readonly count: number;
    }
  | { readonly kind: typeof MoveKind.Rename; readonly sheet: number }
  | { readonly kind: typeof MoveKind.Add; readonly index: number }
  | { readonly kind: typeof MoveKind.Remove; readonly sheet: number }
  | { readonly kind: typeof MoveKind.Undo }
  | { readonly kind: typeof MoveKind.Redo };

type Slice = (typeof Slice)[keyof typeof Slice];

interface Area {
  readonly sheet: number;
  readonly top: number;
  readonly left: number;
  readonly height: number;
  readonly width: number;
}

interface ReachTurn {
  readonly move: Move;
  readonly area: Area;
}

interface Turn {
  readonly move: Move;
  readonly slice: Slice;
}

const MoveKind = {
  Value: 'value',
  Formula: 'formula',
  Lines: 'lines',
  Rename: 'rename',
  Add: 'add',
  Remove: 'remove',
  Undo: 'undo',
  Redo: 'redo',
} as const;

const Slice = {
  Running: 'running',
  Ticks: 'ticks',
  Cancel: 'cancel',
  Settle: 'settle',
} as const;

const PROPERTY_TIMEOUT = 60_000;

const RUNS = 300;

const MOVES = 30;

const OTHER = '§';

const PLAIN_SHEET = /^[A-Za-z]+$/u;

const WHOLE = { top: 0, left: 0, bottom: 1_048_575, right: 16_383 };

const SETTLED = { budgetMs: Number.POSITIVE_INFINITY, volatile: false };

const SLICED = { budgetMs: -1, yieldTo: () => Promise.resolve(), volatile: false };

const SLICED_RUNS = 60;

const SLICED_MOVES = 40;

const DRAIN_ROUNDS = 10_000;

const REACH_RUNS = 150;

const REACH_MOVES = 30;

const SEED_TOP = 12;

const SEED_ROWS = 25;

const SEED_COLUMNS = 6;

const COLUMN = fc.integer({ min: 0, max: 5 });

const ROW = fc.integer({ min: 1, max: 10 });

const SMALL = fc.integer({ min: 1, max: 5 });

const SHEET = fc.integer({ min: 0, max: 3 });

const CELL_REF = fc
  .tuple(fc.boolean(), COLUMN, fc.boolean(), ROW)
  .map(
    ([fixedCol, col, fixedRow, row]) =>
      `${fixedCol ? '$' : ''}${columnName(col)}${fixedRow ? '$' : ''}${String(row)}`,
  );

const RANGE_REF = fc
  .tuple(COLUMN, COLUMN, ROW, fc.integer({ min: 0, max: 3 }))
  .map(
    ([left, width, top, height]) =>
      `${columnName(left)}${String(top)}:${columnName(Math.min(5, left + width))}${String(top + height)}`,
  );

const COLUMNS_REF = fc
  .tuple(COLUMN, COLUMN)
  .map(([from, to]) => `${columnName(from)}:${columnName(to)}`);

const ROWS_REF = fc
  .tuple(fc.integer({ min: 1, max: 9 }), fc.integer({ min: 1, max: 9 }))
  .map(([from, to]) => `${String(from)}:${String(to)}`);

const FORMULA: fc.Arbitrary<string> = fc.oneof(
  fc.tuple(CELL_REF, CELL_REF).map(([left, right]) => `=${left}+${right}*2`),
  RANGE_REF.map((area) => `=SUM(${area})`),
  COLUMNS_REF.map((area) => `=SUM(${area})`),
  ROWS_REF.map((area) => `=SUM(${area})`),
  CELL_REF.map((ref) => `=${OTHER}${ref}+1`),
  COLUMNS_REF.map((area) => `=SUM(${OTHER}${area})`),
  fc.tuple(CELL_REF, CELL_REF, CELL_REF).map(([test, yes, no]) => `=IF(${test}>2,${yes},${no})`),
  COLUMNS_REF.map((area) => `=COUNTIF(${area},">1")`),
  fc.tuple(COLUMNS_REF, COLUMNS_REF).map(([test, sum]) => `=SUMIF(${test},">0",${sum})`),
  RANGE_REF.map((area) => `=INDEX(${area},1,1)`),
  fc.tuple(SMALL, COLUMNS_REF).map(([wanted, area]) => `=MATCH(${String(wanted)},${area},0)`),
  fc.tuple(SMALL, RANGE_REF).map(([wanted, area]) => `=VLOOKUP(${String(wanted)},${area},1,FALSE)`),
  RANGE_REF.map((area) => `=AVERAGE(${area})`),
  RANGE_REF.map((area) => `=ROWS(${area})+ROW()`),
  RANGE_REF.map((area) => `=MAX(${OTHER}${area})`),
  CELL_REF.map((ref) => `=${ref}&"x"`),
  fc.constant('=ROW()-1'),
  CELL_REF.map((ref) => `=COLUMN(${ref})`),
  COLUMNS_REF.map((area) => `=@${OTHER}${area}`),
  fc.constant('=INDIRECT("R[-1]C",FALSE)'),
  CELL_REF.map((ref) => `=OFFSET(${ref},1,0)`),
);

const place = { sheet: SHEET, row: fc.integer({ min: 0, max: 9 }), col: COLUMN };

const MOVE: fc.Arbitrary<Move> = fc.oneof(
  {
    weight: 6,
    arbitrary: fc
      .record({ ...place, value: fc.integer({ min: 0, max: 8 }) })
      .map((picked): Move => ({ kind: MoveKind.Value, ...picked })),
  },
  {
    weight: 6,
    arbitrary: fc
      .record({ ...place, text: FORMULA, other: SHEET })
      .map((picked): Move => ({ kind: MoveKind.Formula, ...picked })),
  },
  {
    weight: 4,
    arbitrary: fc
      .record({
        sheet: SHEET,
        insert: fc.boolean(),
        axis: fc.constantFrom<Axis>('rows', 'cols'),
        at: fc.integer({ min: 0, max: 6 }),
        count: fc.integer({ min: 1, max: 2 }),
      })
      .map((picked): Move => ({ kind: MoveKind.Lines, ...picked })),
  },
  { weight: 1, arbitrary: SHEET.map((sheet): Move => ({ kind: MoveKind.Rename, sheet })) },
  { weight: 1, arbitrary: SHEET.map((index): Move => ({ kind: MoveKind.Add, index })) },
  { weight: 1, arbitrary: SHEET.map((sheet): Move => ({ kind: MoveKind.Remove, sheet })) },
  { weight: 1, arbitrary: fc.constant<Move>({ kind: MoveKind.Undo }) },
  { weight: 1, arbitrary: fc.constant<Move>({ kind: MoveKind.Redo }) },
);

const TURN: fc.Arbitrary<Turn> = fc.record({
  move: MOVE,
  slice: fc.constantFrom(Slice.Running, Slice.Ticks, Slice.Cancel, Slice.Settle),
});

const REACH_TURN: fc.Arbitrary<ReachTurn> = fc.record({
  move: MOVE,
  area: fc.record({
    sheet: SHEET,
    top: fc.integer({ min: 0, max: 9 }),
    left: COLUMN,
    height: fc.integer({ min: 0, max: 3 }),
    width: fc.integer({ min: 0, max: 3 }),
  }),
});

const desk = (): Desk => {
  const book = createWorkbook();
  const calculator = createCalculator(book);

  book.addSheet('Main');
  book.addSheet('Other');
  return {
    book,
    calculator,
    history: createWorkbookHistory(createStepper(book, calculator)),
    added: 0,
  };
};

const sheetAt = (table: Desk, index: number): Sheet => {
  const found = table.book.sheets[index % table.book.sheets.length];

  if (found === undefined) {
    throw new Error('the book has no sheets');
  }
  return found;
};

const prefixOf = (sheet: Sheet): string =>
  PLAIN_SHEET.test(sheet.name) ? `${sheet.name}!` : `'${sheet.name}'!`;

const linesStep = (
  sheet: string,
  move: Extract<Move, { kind: typeof MoveKind.Lines }>,
): WorkbookStep =>
  move.insert
    ? { kind: 'insertLines', sheet, axis: move.axis, at: move.at, count: move.count }
    : { kind: 'deleteLines', sheet, axis: move.axis, at: move.at, count: move.count };

const formulaStep = (
  table: Desk,
  sheet: string,
  move: Extract<Move, { kind: typeof MoveKind.Formula }>,
): WorkbookStep => {
  const text = move.text.replaceAll(OTHER, prefixOf(sheetAt(table, move.other)));
  const parsed = parseFormula(text, EN_FORMULAS, move);

  if (!parsed.ok) {
    throw new Error(`${text} does not parse`);
  }
  return {
    kind: 'setCells',
    sheet,
    cells: [{ row: move.row, col: move.col, content: { kind: 'formula', ast: parsed.ast } }],
  };
};

const stepOf = (table: Desk, move: Move): WorkbookStep | undefined => {
  switch (move.kind) {
    case MoveKind.Value:
      return {
        kind: 'setCells',
        sheet: sheetAt(table, move.sheet).name,
        cells: [
          {
            row: move.row,
            col: move.col,
            content: { kind: 'value', value: { kind: 'number', value: move.value } },
          },
        ],
      };
    case MoveKind.Formula:
      return formulaStep(table, sheetAt(table, move.sheet).name, move);
    case MoveKind.Lines:
      return linesStep(sheetAt(table, move.sheet).name, move);
    case MoveKind.Rename:
      table.added += 1;
      return {
        kind: 'renameSheet',
        from: sheetAt(table, move.sheet).name,
        to: `Tab ${String(table.added)}`,
      };
    case MoveKind.Add:
      table.added += 1;
      return {
        kind: 'addSheet',
        name: `S${String(table.added)}`,
        index: move.index % (table.book.sheets.length + 1),
      };
    case MoveKind.Remove:
      return table.book.sheets.length > 1
        ? { kind: 'removeSheet', name: sheetAt(table, move.sheet).name }
        : undefined;
    default:
      return undefined;
  }
};

const play = (table: Desk, move: Move): void => {
  if (move.kind === MoveKind.Undo) {
    table.history.undo();
    return;
  }
  if (move.kind === MoveKind.Redo) {
    table.history.redo();
    return;
  }

  const step = stepOf(table, move);

  if (step === undefined) {
    return;
  }

  table.history.commit([step]);
};

const valuesOf = (calculator: Calculator): Map<string, string> => {
  const found = new Map<string, string>();

  calculator.forEachFormula((sheet, row, col, ast) => {
    found.set(
      `${sheet.name}!${columnName(col)}${String(row + 1)}`,
      `${JSON.stringify(sheet.cells.get(row, col))} =${printFormula(ast, EN_FORMULAS, { row, col })}`,
    );
  });

  return found;
};

const fromScratch = (table: Desk): Map<string, string> => {
  const book = createWorkbook();
  const calculator = createCalculator(book);
  const stepper = createStepper(book, calculator);

  table.book.sheets.forEach((sheet) => book.addSheet(sheet.name));

  table.book.sheets.forEach((sheet) => {
    const cells = new Map<string, CellEdit>();

    const take = (row: number, col: number): void => {
      cells.set(`${String(row)}:${String(col)}`, {
        row,
        col,
        content: table.calculator.contentAt(sheet, row, col),
      });
    };

    sheet.cells.forEachInRange(WHOLE, take);

    table.calculator.forEachFormula((owner, row, col) => {
      if (owner !== sheet) {
        return;
      }

      take(row, col);
    });

    stepper.apply({ kind: 'setCells', sheet: sheet.name, cells: [...cells.values()] });
  });

  calculator.recalculate(SETTLED);
  return valuesOf(calculator);
};

const differencesOf = (live: Map<string, string>, fresh: Map<string, string>): Difference[] =>
  [...new Set([...live.keys(), ...fresh.keys()])].reduce<Difference[]>((found, cell) => {
    if (live.get(cell) === fresh.get(cell)) {
      return found;
    }

    found.push({ cell, live: live.get(cell), fresh: fresh.get(cell) });
    return found;
  }, []);

const rangeOf = (area: Area): CellRange => ({
  top: area.top,
  left: area.left,
  bottom: area.top + area.height,
  right: area.left + area.width,
});

const keysIn = (sheet: Sheet, range: CellRange): ReadonlySet<string> => {
  const keys = new Set<string>();

  for (let row = range.top; row <= range.bottom; row += 1) {
    for (let col = range.left; col <= range.right; col += 1) {
      keys.add(`${sheet.name}!${columnName(col)}${String(row + 1)}`);
    }
  }
  return keys;
};

const shownIn = (values: Map<string, string>, keys: ReadonlySet<string>): Map<string, string> =>
  new Map([...values].filter(([cell]) => keys.has(cell)));

const seedText = (row: number, col: number): string =>
  row === SEED_TOP
    ? `=SUM(A1:F10)+${String(col)}`
    : `=${columnName(col)}${String(row)}+${columnName((col + 1) % SEED_COLUMNS)}${String(row)}`;

const seededDesk = (): Desk => {
  const table = desk();
  const cells: CellEdit[] = [];

  for (let row = SEED_TOP; row < SEED_TOP + SEED_ROWS; row += 1) {
    for (let col = 0; col < SEED_COLUMNS; col += 1) {
      const parsed = parseFormula(seedText(row, col), EN_FORMULAS, { row, col });

      if (!parsed.ok) {
        throw new Error(`${seedText(row, col)} does not parse`);
      }

      cells.push({ row, col, content: { kind: 'formula', ast: parsed.ast } });
    }
  }

  table.history.commit([{ kind: 'setCells', sheet: 'Main', cells }]);
  return table;
};

const sliced = async (table: Desk, slice: Slice): Promise<boolean> => {
  const run = table.calculator.recalculate(SLICED);

  switch (slice) {
    case Slice.Cancel:
      run.cancel();
      await run.settled;
      return true;
    case Slice.Settle:
      await run.settled;
      return true;
    case Slice.Ticks:
      await Promise.resolve();
      await Promise.resolve();
      return false;
    default:
      return false;
  }
};

const drained = async (calculator: Calculator): Promise<number> => {
  for (let round = 0; calculator.pending > 0 && round < DRAIN_ROUNDS; round += 1) {
    await calculator.recalculate(SLICED).settled;
  }

  return calculator.pending;
};

describe('values of formulas after edits', () => {
  it(
    'equal the values of the same book calculated from scratch after every edit, line move, sheet change, undo and redo',
    () => {
      fc.assert(
        fc.property(fc.array(MOVE, { maxLength: MOVES, size: 'max' }), (moves) => {
          const table = desk();

          moves.forEach((each) => {
            play(table, each);
            table.calculator.recalculate(SETTLED);

            expect(differencesOf(valuesOf(table.calculator), fromScratch(table))).toEqual([]);
          });
        }),
        { numRuns: RUNS },
      );
    },
    PROPERTY_TIMEOUT,
  );
});

describe('values of formulas after a recalculation cut into slices', () => {
  it(
    'equal the values calculated from scratch when edits come while slices run, a run is cancelled or left behind',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(TURN, { maxLength: SLICED_MOVES, size: 'max' }),
          async (turns) => {
            const table = seededDesk();

            for (const turn of turns) {
              play(table, turn.move);

              const checked = await sliced(table, turn.slice);

              if (!checked) {
                continue;
              }

              expect(await drained(table.calculator)).toBe(0);
              expect(differencesOf(valuesOf(table.calculator), fromScratch(table))).toEqual([]);
            }

            expect(await drained(table.calculator)).toBe(0);
            expect(differencesOf(valuesOf(table.calculator), fromScratch(table))).toEqual([]);
          },
        ),
        { numRuns: SLICED_RUNS },
      );
    },
    PROPERTY_TIMEOUT,
  );
});

describe('values a range shows after only what reaches it is settled', () => {
  it(
    'equal the values calculated from scratch inside the range, and everywhere once the rest is settled',
    () => {
      fc.assert(
        fc.property(fc.array(REACH_TURN, { maxLength: REACH_MOVES, size: 'max' }), (turns) => {
          const table = desk();

          turns.forEach(({ move, area }) => {
            play(table, move);

            const sheet = sheetAt(table, area.sheet);
            const range = rangeOf(area);
            const keys = keysIn(sheet, range);

            table.calculator.recalculate({ ...SETTLED, reaching: { sheet, range } });

            expect(
              differencesOf(
                shownIn(valuesOf(table.calculator), keys),
                shownIn(fromScratch(table), keys),
              ),
            ).toEqual([]);
          });

          table.calculator.recalculate(SETTLED);

          expect(differencesOf(valuesOf(table.calculator), fromScratch(table))).toEqual([]);
        }),
        { numRuns: REACH_RUNS },
      );
    },
    PROPERTY_TIMEOUT,
  );
});
