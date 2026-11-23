import * as fc from 'fast-check';
import {
  EN_FORMULAS,
  columnName,
  createCalculator,
  createCellEditor,
  createStepper,
  createWorkbook,
  createWorkbookHistory,
  parseFormula,
  printFormula,
  type Calculator,
  type CellEditor,
  type CellRange,
  type Sheet,
  type Workbook,
  type WorkbookHistory,
  type WorkbookStep,
} from '../src/core';

type Axis = 'rows' | 'cols';

interface Place {
  readonly sheet: number;
  readonly row: number;
  readonly col: number;
}

export interface BookSeed extends Place {
  readonly value: number;
}

export type BookMove =
  | (Place & { readonly kind: typeof BookMoveKind.Value; readonly value: number })
  | (Place & {
      readonly kind: typeof BookMoveKind.Formula;
      readonly text: string;
      readonly other: number;
    })
  | (Place & { readonly kind: typeof BookMoveKind.Clear })
  | {
      readonly kind: typeof BookMoveKind.Lines;
      readonly sheet: number;
      readonly insert: boolean;
      readonly axis: Axis;
      readonly at: number;
      readonly count: number;
    }
  | (Place & {
      readonly kind: typeof BookMoveKind.Format;
      readonly height: number;
      readonly width: number;
      readonly format: string;
    })
  | { readonly kind: typeof BookMoveKind.Rename; readonly sheet: number }
  | { readonly kind: typeof BookMoveKind.Add; readonly index: number }
  | { readonly kind: typeof BookMoveKind.Remove; readonly sheet: number }
  | (Place & { readonly kind: typeof BookMoveKind.Name; readonly whole: boolean })
  | (Place & { readonly kind: typeof BookMoveKind.Table; readonly height: number })
  | (Place & { readonly kind: typeof BookMoveKind.Merge });

type BookMoveKind = (typeof BookMoveKind)[keyof typeof BookMoveKind];

type BookMoveOf<K extends BookMoveKind> = Extract<BookMove, { readonly kind: K }>;

type SheetsMove = BookMoveOf<
  | typeof BookMoveKind.Rename
  | typeof BookMoveKind.Add
  | typeof BookMoveKind.Remove
  | typeof BookMoveKind.Name
  | typeof BookMoveKind.Table
  | typeof BookMoveKind.Merge
>;

export interface BookDesk {
  readonly book: Workbook;
  readonly calculator: Calculator;
  readonly editor: CellEditor;
  readonly history: WorkbookHistory;
  added: number;
}

const BookMoveKind = {
  Value: 'value',
  Formula: 'formula',
  Clear: 'clear',
  Lines: 'lines',
  Format: 'format',
  Rename: 'rename',
  Add: 'add',
  Remove: 'remove',
  Name: 'name',
  Table: 'table',
  Merge: 'merge',
} as const;

const OTHER = '§';

const PLAIN_SHEET = /^[A-Za-z]+$/u;

const WHOLE = { top: 0, left: 0, bottom: 1_048_575, right: 16_383 };

const SETTLED = { budgetMs: Number.POSITIVE_INFINITY, volatile: false };

const ORIGIN = { row: 0, col: 0 };

const LAST_COLUMN = 5;

const FORMATS = ['0.00', '0%', '#,##0', 'General'];

const COLUMN = fc.integer({ min: 0, max: LAST_COLUMN });

const ROW = fc.integer({ min: 0, max: 9 });

const SHEET = fc.integer({ min: 0, max: 3 });

const PLACE = { sheet: SHEET, row: ROW, col: COLUMN };

const CELL_REF = fc
  .tuple(fc.boolean(), COLUMN, fc.boolean(), ROW)
  .map(
    ([fixedCol, col, fixedRow, row]) =>
      `${fixedCol ? '$' : ''}${columnName(col)}${fixedRow ? '$' : ''}${String(row + 1)}`,
  );

const RANGE_REF = fc
  .tuple(COLUMN, COLUMN, fc.integer({ min: 1, max: 8 }), fc.integer({ min: 0, max: 3 }))
  .map(
    ([left, width, top, height]) =>
      `${columnName(left)}${String(top)}:${columnName(Math.min(LAST_COLUMN, left + width))}${String(top + height)}`,
  );

const COLUMNS_REF = fc
  .tuple(COLUMN, COLUMN)
  .map(([from, to]) => `${columnName(from)}:${columnName(to)}`);

const ROWS_REF = fc
  .tuple(fc.integer({ min: 1, max: 9 }), fc.integer({ min: 1, max: 9 }))
  .map(([from, to]) => `${String(from)}:${String(to)}`);

const TABLE_REF = fc
  .tuple(fc.integer({ min: 1, max: 3 }), fc.constantFrom('', '[Column1]', '[Column2]'))
  .map(([table, column]) => `Sales${String(table)}${column}`);

const FORMULA = fc.oneof(
  fc.tuple(CELL_REF, CELL_REF).map(([left, right]) => `=${left}+${right}`),
  RANGE_REF.map((area) => `=SUM(${area})`),
  COLUMNS_REF.map((area) => `=SUM(${area})`),
  CELL_REF.map((ref) => `=${OTHER}${ref}*2`),
  RANGE_REF.map((area) => `=SUM(${OTHER}${area})`),
  ROWS_REF.map((area) => `=SUM(${area})`),
  fc.tuple(CELL_REF, CELL_REF).map(([test, yes]) => `=IF(${test}>2,${yes},Total)`),
  CELL_REF.map((ref) => `=ROW()+COLUMN(${ref})`),
  TABLE_REF.map((column) => `=SUM(${column})`),
);

export const BOOK_SEEDS: fc.Arbitrary<readonly BookSeed[]> = fc.array(
  fc.record({
    ...PLACE,
    sheet: fc.integer({ min: 0, max: 1 }),
    value: fc.integer({ min: 0, max: 8 }),
  }),
  { maxLength: 24 },
);

export const BOOK_MOVE: fc.Arbitrary<BookMove> = fc.oneof(
  {
    weight: 18,
    arbitrary: fc
      .record({ ...PLACE, value: fc.integer({ min: 0, max: 8 }) })
      .map((picked): BookMove => ({ kind: BookMoveKind.Value, ...picked })),
  },
  {
    weight: 22,
    arbitrary: fc
      .record({ ...PLACE, text: FORMULA, other: SHEET })
      .map((picked): BookMove => ({ kind: BookMoveKind.Formula, ...picked })),
  },
  {
    weight: 6,
    arbitrary: fc
      .record(PLACE)
      .map((picked): BookMove => ({ kind: BookMoveKind.Clear, ...picked })),
  },
  {
    weight: 24,
    arbitrary: fc
      .record({
        sheet: SHEET,
        insert: fc.boolean(),
        axis: fc.constantFrom<Axis>('rows', 'cols'),
        at: fc.integer({ min: 0, max: 7 }),
        count: fc.integer({ min: 1, max: 2 }),
      })
      .map((picked): BookMove => ({ kind: BookMoveKind.Lines, ...picked })),
  },
  {
    weight: 6,
    arbitrary: fc
      .record({
        ...PLACE,
        height: fc.integer({ min: 0, max: 2 }),
        width: fc.integer({ min: 0, max: 1 }),
        format: fc.constantFrom(...FORMATS),
      })
      .map((picked): BookMove => ({ kind: BookMoveKind.Format, ...picked })),
  },
  {
    weight: 4,
    arbitrary: SHEET.map((sheet): BookMove => ({ kind: BookMoveKind.Rename, sheet })),
  },
  {
    weight: 3,
    arbitrary: fc.nat({ max: 4 }).map((index): BookMove => ({ kind: BookMoveKind.Add, index })),
  },
  {
    weight: 3,
    arbitrary: SHEET.map((sheet): BookMove => ({ kind: BookMoveKind.Remove, sheet })),
  },
  {
    weight: 4,
    arbitrary: fc
      .record({ ...PLACE, whole: fc.boolean() })
      .map((picked): BookMove => ({ kind: BookMoveKind.Name, ...picked })),
  },
  {
    weight: 4,
    arbitrary: fc
      .record({
        ...PLACE,
        row: fc.integer({ min: 0, max: 5 }),
        height: fc.integer({ min: 2, max: 4 }),
      })
      .map((picked): BookMove => ({ kind: BookMoveKind.Table, ...picked })),
  },
  {
    weight: 7,
    arbitrary: fc
      .record({ ...PLACE, row: fc.integer({ min: 0, max: 7 }) })
      .map((picked): BookMove => ({ kind: BookMoveKind.Merge, ...picked })),
  },
);

const sheetAt = (desk: BookDesk, index: number): Sheet => {
  const found = desk.book.sheets[index % desk.book.sheets.length];

  if (found === undefined) {
    throw new Error('the book has no sheets');
  }
  return found;
};

const prefixOf = (sheet: Sheet): string =>
  PLAIN_SHEET.test(sheet.name) ? `${sheet.name}!` : `'${sheet.name}'!`;

const formulaStep = (
  desk: BookDesk,
  move: Extract<BookMove, { kind: typeof BookMoveKind.Formula }>,
): WorkbookStep => {
  const text = move.text.replaceAll(OTHER, prefixOf(sheetAt(desk, move.other)));
  const parsed = parseFormula(text, EN_FORMULAS, move);

  if (!parsed.ok) {
    throw new Error(`${text} does not parse`);
  }
  return {
    kind: 'setCells',
    sheet: sheetAt(desk, move.sheet).name,
    cells: [{ row: move.row, col: move.col, content: { kind: 'formula', ast: parsed.ast } }],
  };
};

const nameStep = (
  desk: BookDesk,
  move: Extract<BookMove, { kind: typeof BookMoveKind.Name }>,
): WorkbookStep => {
  const sheet = prefixOf(sheetAt(desk, move.sheet));
  const column = `$${columnName(move.col)}`;

  const text = move.whole
    ? `=${sheet}${column}:${column}`
    : `=${sheet}$A$${String(move.row + 1)}:$C$${String(move.row + 6)}`;

  const parsed = parseFormula(text, EN_FORMULAS, ORIGIN);

  if (!parsed.ok) {
    throw new Error(`${text} does not parse`);
  }
  return { kind: 'setName', name: 'Total', ast: parsed.ast };
};

const tableStep = (
  desk: BookDesk,
  move: Extract<BookMove, { kind: typeof BookMoveKind.Table }>,
): WorkbookStep => {
  desk.added += 1;

  return desk.editor.tableStep(
    sheetAt(desk, move.sheet),
    {
      top: move.row,
      left: move.col,
      bottom: move.row + move.height,
      right: Math.min(LAST_COLUMN, move.col + 1),
    },
    { name: `Sales${String(desk.added)}` },
  );
};

const apart = (merge: CellRange, other: CellRange): boolean =>
  other.bottom < merge.top ||
  other.top > merge.bottom ||
  other.right < merge.left ||
  other.left > merge.right;

const mergeStep = (
  desk: BookDesk,
  move: Extract<BookMove, { kind: typeof BookMoveKind.Merge }>,
): WorkbookStep => {
  const sheet = sheetAt(desk, move.sheet);

  const merge = {
    top: move.row,
    left: move.col,
    bottom: move.row + 1,
    right: Math.min(LAST_COLUMN, move.col + 1),
  };

  return {
    kind: 'setLayout',
    sheet: sheet.name,
    layout: {
      ...sheet.layout,
      merges: [...sheet.layout.merges.filter((other) => apart(merge, other)), merge],
    },
    base: sheet.layout,
  };
};

const cellStep = (desk: BookDesk, place: Place, value: number | undefined): WorkbookStep => ({
  kind: 'setCells',
  sheet: sheetAt(desk, place.sheet).name,
  cells: [
    {
      row: place.row,
      col: place.col,
      content: {
        kind: 'value',
        value: value === undefined ? { kind: 'empty' } : { kind: 'number', value },
      },
    },
  ],
});

const linesStep = (desk: BookDesk, move: BookMoveOf<typeof BookMoveKind.Lines>): WorkbookStep => ({
  kind: move.insert ? 'insertLines' : 'deleteLines',
  sheet: sheetAt(desk, move.sheet).name,
  axis: move.axis,
  at: move.at,
  count: move.count,
});

const formatStep = (
  desk: BookDesk,
  move: BookMoveOf<typeof BookMoveKind.Format>,
): WorkbookStep => ({
  kind: 'setFormat',
  sheet: sheetAt(desk, move.sheet).name,
  range: {
    top: move.row,
    left: move.col,
    bottom: move.row + move.height,
    right: move.col + move.width,
  },
  format: move.format,
});

const sheetsStep = (desk: BookDesk, move: SheetsMove): WorkbookStep | undefined => {
  switch (move.kind) {
    case BookMoveKind.Rename:
      desk.added += 1;
      return {
        kind: 'renameSheet',
        from: sheetAt(desk, move.sheet).name,
        to: `Tab ${String(desk.added)}`,
      };
    case BookMoveKind.Add:
      desk.added += 1;
      return {
        kind: 'addSheet',
        name: `S${String(desk.added)}`,
        index: move.index % (desk.book.sheets.length + 1),
      };
    case BookMoveKind.Remove:
      return desk.book.sheets.length > 1
        ? { kind: 'removeSheet', name: sheetAt(desk, move.sheet).name }
        : undefined;
    case BookMoveKind.Name:
      return nameStep(desk, move);
    case BookMoveKind.Table:
      return tableStep(desk, move);
    default:
      return mergeStep(desk, move);
  }
};

const stepOf = (desk: BookDesk, move: BookMove): WorkbookStep | undefined => {
  switch (move.kind) {
    case BookMoveKind.Value:
      return cellStep(desk, move, move.value);
    case BookMoveKind.Clear:
      return cellStep(desk, move, undefined);
    case BookMoveKind.Formula:
      return formulaStep(desk, move);
    case BookMoveKind.Lines:
      return linesStep(desk, move);
    case BookMoveKind.Format:
      return formatStep(desk, move);
    default:
      return sheetsStep(desk, move);
  }
};

export const bookDesk = (seeds: readonly BookSeed[]): BookDesk => {
  const book = createWorkbook();
  const calculator = createCalculator(book);
  const stepper = createStepper(book, calculator);

  book.addSheet('Main');
  book.addSheet('Other');

  const desk = {
    book,
    calculator,
    editor: createCellEditor(book, calculator),
    history: createWorkbookHistory(stepper),
    added: 0,
  };

  seeds.forEach((seed) => {
    stepper.apply(cellStep(desk, seed, seed.value));
  });

  return desk;
};

export const committed = (desk: BookDesk, move: BookMove): boolean => {
  const step = stepOf(desk, move);

  return step !== undefined && desk.history.commit([step]).ok;
};

const cellLines = (book: Workbook, calculator: Calculator, sheet: Sheet): readonly string[] => {
  const cells = new Map<string, string>();

  sheet.cells.forEachInRange(WHOLE, (row, col, value) => {
    cells.set(`${columnName(col)}${String(row + 1)}`, JSON.stringify(value));
  });

  calculator.forEachFormula((owner, row, col, ast) => {
    if (owner !== sheet) {
      return;
    }

    cells.set(
      `${columnName(col)}${String(row + 1)}`,
      `=${printFormula(ast, EN_FORMULAS, { row, col })}`,
    );
  });

  const looks: string[] = [];

  sheet.formats.forEachInRange(WHOLE, (row, col, id) => {
    looks.push(
      `${sheet.name}!${columnName(col)}${String(row + 1)} format ${book.formats.code(id)}`,
    );
  });

  return [
    ...[...cells].map(([cell, text]) => `${sheet.name}!${cell} ${text}`).toSorted(),
    ...looks.toSorted(),
  ];
};

const layoutLines = (sheet: Sheet): readonly string[] => {
  const lines = [
    `${sheet.name} merges ${JSON.stringify(sheet.layout.merges.toSorted((a, b) => a.top - b.top || a.left - b.left))}`,
  ];

  sheet.layout.rows.forEach((line, layout) => {
    lines.push(`${sheet.name} row ${String(line)} ${JSON.stringify(layout)}`);
  });

  sheet.layout.cols.forEach((line, layout) => {
    lines.push(`${sheet.name} col ${String(line)} ${JSON.stringify(layout)}`);
  });

  return lines;
};

const bookLines = (book: Workbook): readonly string[] => {
  const lines: string[] = [];

  book.names.forEach((defined) => {
    lines.push(
      `name ${defined.scope?.name ?? ''}!${defined.name}=${printFormula(defined.ast, EN_FORMULAS, ORIGIN)}`,
    );
  });

  book.tables.forEach((table) => {
    lines.push(
      `table ${table.name} ${table.sheet.name} ${JSON.stringify(table.range)} ${JSON.stringify(table.columns)}`,
    );
  });

  return lines.toSorted();
};

export const pictureOf = (book: Workbook, calculator: Calculator): readonly string[] => {
  calculator.recalculate(SETTLED);

  return [
    ...book.sheets.flatMap((sheet, index) => [
      `sheet ${String(index)} ${sheet.name}`,
      ...cellLines(book, calculator, sheet),
      ...layoutLines(sheet),
    ]),
    ...bookLines(book),
  ];
};

export const formulaValuesOf = (calculator: Calculator): readonly string[] => {
  const found: string[] = [];

  calculator.forEachFormula((sheet, row, col) => {
    found.push(
      `${sheet.name}!${columnName(col)}${String(row + 1)} ${JSON.stringify(sheet.cells.get(row, col))}`,
    );
  });

  return found.toSorted();
};
