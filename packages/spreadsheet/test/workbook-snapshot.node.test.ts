import { describe, expect, it } from 'vite-plus/test';
import {
  EN_FORMULAS,
  createCalculator,
  createCellEditor,
  createStepCodec,
  createStepper,
  createWorkbook,
  createWorkbookDocument,
  createWorkbookHistory,
  lineLayoutsOf,
  parseCell,
  parseFormula,
  parseRange,
  pivotCaptions,
  printFormula,
  textValue,
  workbookAuthority,
  type Calculator,
  type CellRange,
  type FormulaNode,
  type Sheet,
  type Workbook,
  type WorkbookStep,
} from '../src/core';

const WHOLE: CellRange = { top: 0, left: 0, bottom: 1_048_575, right: 16_383 };

const ORIGIN = { row: 0, col: 0 };

const SALES: readonly (readonly string[])[] = [
  ['Region', 'City', 'Amount'],
  ['East', 'Boston', '100'],
  ['East', 'NYC', '200'],
  ['West', 'LA', '150'],
];

const REWRITES = 40;

const LOAD_BUDGET_MS = 100;

const BIG_ROWS = 20_000;

const at = (address: string): { readonly row: number; readonly col: number } => {
  const cell = parseCell(address);

  if (cell === undefined) {
    throw new Error(`${address} is not a cell`);
  }
  return cell;
};

const span = (address: string): CellRange => {
  const range = parseRange(address);

  if (range === undefined) {
    throw new Error(`${address} is not a range`);
  }
  return range;
};

const astOf = (text: string): FormulaNode => {
  const parsed = parseFormula(text, EN_FORMULAS, ORIGIN);

  if (!parsed.ok) {
    throw new Error(`${text} does not parse`);
  }
  return parsed.ast;
};

const placed = (row: number, col: number): string => `${String(row)}:${String(col)}`;

const cellsOf = (calculator: Calculator, sheet: Sheet): string[] => {
  const found = new Map<string, string>();

  sheet.cells.forEachInRange(WHOLE, (row, col, value) => {
    found.set(placed(row, col), JSON.stringify(value));
  });

  calculator.forEachFormula((owner, row, col, ast) => {
    if (owner !== sheet) {
      return;
    }

    const key = placed(row, col);

    found.set(key, `${found.get(key) ?? ''} =${printFormula(ast, EN_FORMULAS, { row, col })}`);
  });

  return [...found].map(([key, text]) => `${key} ${text}`).toSorted();
};

const looksOf = (book: Workbook, sheet: Sheet): string[] => {
  const looks: string[] = [];

  sheet.formats.forEachInRange(WHOLE, (row, col, id) => {
    looks.push(`${placed(row, col)} ${book.formats.code(id)}`);
  });

  sheet.decorations.forEachInRange(WHOLE, (row, col, id) => {
    looks.push(`${placed(row, col)} ${JSON.stringify(book.decorations.get(id))}`);
  });

  return looks.toSorted();
};

const namesOf = (book: Workbook): string[] => {
  const names: string[] = [];

  book.names.forEach((defined) => {
    names.push(
      `${defined.scope?.name ?? ''}!${defined.name}=${printFormula(defined.ast, EN_FORMULAS, ORIGIN)}`,
    );
  });

  return names.toSorted();
};

const tablesOf = (book: Workbook): unknown[] => {
  const tables: unknown[] = [];

  book.tables.forEach((table) => {
    tables.push({
      name: table.name,
      sheet: table.sheet.name,
      range: table.range,
      columns: table.columns,
      headers: table.headers,
      totals: table.totals,
    });
  });

  return tables;
};

const pivotsOf = (book: Workbook): unknown[] => {
  const pivots: unknown[] = [];

  book.pivots.forEach((pivot) => {
    pivots.push({
      name: pivot.name,
      sheet: pivot.sheet.name,
      anchor: pivot.anchor,
      footprint: pivot.footprint,
      definition: pivot.definition,
    });
  });

  return pivots;
};

const described = (book: Workbook, calculator: Calculator): unknown => {
  const codec = createStepCodec(book);

  calculator.recalculate({ budgetMs: Number.POSITIVE_INFINITY });

  return {
    sheets: book.sheets.map((sheet) => ({
      name: sheet.name,
      cells: cellsOf(calculator, sheet),
      looks: looksOf(book, sheet),
      conditional: codec.encode({
        kind: 'setConditional',
        sheet: sheet.name,
        formats: sheet.conditional,
      }),
      layout: codec.encode({ kind: 'setLayout', sheet: sheet.name, layout: sheet.layout }),
    })),
    names: namesOf(book),
    tables: tablesOf(book),
    pivots: pivotsOf(book),
  };
};

const openShared = () => {
  const book = createWorkbook();
  const calculator = createCalculator(book);
  const editor = createCellEditor(book, calculator);
  const stepper = createStepper(book, calculator);
  const codec = createStepCodec(book);
  const authority = workbookAuthority();

  const sheetNamed = (name: string): Sheet => {
    const found = book.sheet(name);

    if (found === undefined) {
      throw new Error(`${name} is missing`);
    }
    return found;
  };

  const take = (step: WorkbookStep): void => {
    const wire = codec.encode(step);

    calculator.recalculate({ budgetMs: Number.POSITIVE_INFINITY });

    if (!stepper.apply(step).ok || !authority.apply([wire])) {
      throw new Error(`The step ${step.kind} was refused`);
    }
  };

  const type = (sheet: string, address: string, text: string): void => {
    const { row, col } = at(address);
    const result = editor.input(sheetNamed(sheet), row, col, text);

    if (!result.ok) {
      throw new Error(`${text} does not parse`);
    }
    take(result.step);
  };

  return {
    book,
    calculator,
    authority,
    take,
    type,
    sheetNamed,
    name: (name: string, text: string, scope?: string): void => {
      take({ kind: 'setName', name, scope, ast: astOf(text) });
    },
    table: (sheet: string, range: string): void => {
      take(editor.tableStep(sheetNamed(sheet), span(range)));
    },
    newcomer: () => {
      const fresh = createWorkbook();
      const reckoner = createCalculator(fresh);
      const document = createWorkbookDocument({ book: fresh, calculator: reckoner });
      const loaded = document.load(authority.snapshot(), 1);

      return { book: fresh, calculator: reckoner, document, loaded };
    },
  };
};

const fullBook = () => {
  const shared = openShared();

  shared.take({ kind: 'addSheet', name: 'Data', index: 0 });
  shared.take({ kind: 'addSheet', name: 'Report', index: 1 });

  SALES.forEach((row, line) => {
    row.forEach((text, col) => {
      shared.type('Data', `${'ABC'.charAt(col)}${String(line + 1)}`, text);
    });
  });

  shared.type('Data', 'E1', '=SUM(C2:C4)');
  shared.type('Data', 'F1', '12.5%');
  shared.type('Report', 'A1', '=Data!E1*2');
  shared.name('Total', '=Data!$E$1');
  shared.name('Local', '=Report!$A$1', 'Report');
  shared.type('Report', 'A2', '=Total+Local');
  shared.table('Data', 'A1:C4');
  shared.type('Report', 'A3', '=SUM(Table1[Amount])');

  shared.take({
    kind: 'setCells',
    sheet: 'Data',
    cells: [{ row: 0, col: 6, decoration: { font: { bold: true } } }],
  });

  shared.take({
    kind: 'setConditional',
    sheet: 'Data',
    formats: [
      {
        ranges: [span('C2:C4')],
        rules: [
          {
            rule: {
              kind: 'cellIs',
              operator: 'greaterThan',
              formulas: [astOf('=Report!$A$1/10')],
              style: { font: { italic: true } },
            },
            priority: 1,
            stopIfTrue: false,
          },
        ],
      },
    ],
  });

  shared.take({
    kind: 'setLayout',
    sheet: 'Data',
    layout: {
      ...shared.sheetNamed('Data').layout,
      cols: lineLayoutsOf([
        [
          1,
          {
            size: 180,
            custom: true,
            hidden: false,
            level: 0,
            collapsed: false,
            style: undefined,
            extra: [],
          },
        ],
      ]),
    },
  });

  shared.take({
    kind: 'setPivot',
    sheet: 'Report',
    name: 'ByRegion',
    pivot: {
      anchor: { row: 0, col: 3 },
      definition: {
        source: { kind: 'range', sheet: 'Data', range: span('A1:C4') },
        rows: [0],
        columns: [],
        filters: [],
        values: [
          {
            field: 2,
            aggregate: 'sum',
            name: 'Sum of Amount',
            showAs: { kind: 'normal' },
            format: undefined,
          },
        ],
        fields: [],
        layout: 'compact',
        rowTotals: true,
        columnTotals: true,
        autofit: false,
        captions: pivotCaptions('en'),
      },
    },
  });

  shared.take({ kind: 'insertLines', sheet: 'Data', axis: 'rows', at: 2, count: 2 });
  shared.take({ kind: 'renameSheet', from: 'Data', to: 'Sales' });
  shared.take({ kind: 'addSheet', name: 'Spare', index: 0 });
  shared.take({ kind: 'removeSheet', name: 'Spare' });

  return shared;
};

const cellText = (book: Workbook, sheet: string, address: string): string => {
  const { row, col } = at(address);
  const value = book.sheet(sheet)?.cells.get(row, col);

  return value?.kind === 'string' ? value.value : '';
};

describe('snapshot of a shared workbook', () => {
  it('hands a newcomer everything the book holds', () => {
    const shared = fullBook();

    const newcomer = shared.newcomer();

    expect(newcomer.loaded).toBe(true);

    expect(described(newcomer.book, newcomer.calculator)).toEqual(
      described(shared.book, shared.calculator),
    );
  });

  it('describes the book as it is now and not the edits that led to it', () => {
    const shared = openShared();

    shared.take({ kind: 'addSheet', name: 'Data', index: 0 });
    shared.type('Data', 'A1', 'kept');

    const once = shared.authority.snapshot();

    Array.from({ length: REWRITES }).forEach(() => {
      shared.type('Data', 'A1', 'draft');
      shared.type('Data', 'B7', 'gone');
      shared.type('Data', 'B7', '');
      shared.type('Data', 'A1', 'kept');
    });

    expect(shared.authority.snapshot()).toEqual(once);
  });

  it('keeps the snapshot of a book nobody changed and makes a new one after a change', () => {
    const shared = openShared();

    shared.take({ kind: 'addSheet', name: 'Data', index: 0 });

    const first = shared.authority.snapshot();
    const again = shared.authority.snapshot();

    shared.type('Data', 'A1', 'next');

    expect(again).toBe(first);
    expect(shared.authority.snapshot()).not.toEqual(first);
  });

  it('opens a book of many rows within the budget of one action', { tags: ['budget'] }, () => {
    const shared = openShared();

    shared.take({ kind: 'addSheet', name: 'Data', index: 0 });

    shared.take({
      kind: 'setCells',
      sheet: 'Data',
      cells: Array.from({ length: BIG_ROWS }, (_unused, row) => ({
        row,
        col: 0,
        content: { kind: 'value', value: textValue(`row ${String(row)}`) },
      })),
    });

    const snapshot = shared.authority.snapshot();
    const fresh = createWorkbook();
    const document = createWorkbookDocument({ book: fresh, calculator: createCalculator(fresh) });
    const started = performance.now();
    const loaded = document.load(snapshot, 2);
    const spent = performance.now() - started;

    expect(loaded).toBe(true);
    expect(cellText(fresh, 'Data', `A${String(BIG_ROWS)}`)).toBe(`row ${String(BIG_ROWS - 1)}`);
    expect(spent).toBeLessThan(LOAD_BUDGET_MS);
  });
});

const stale = () => {
  const shared = fullBook();
  const client = shared.newcomer();
  const history = createWorkbookHistory(client.document.stepper);
  const heard: number[] = [];

  client.document.follow(history);

  client.document.subscribe((steps) => {
    heard.push(steps.length);
  });

  history.commit([
    {
      kind: 'setCells',
      sheet: 'Sales',
      cells: [{ row: 0, col: 0, content: { kind: 'value', value: textValue('unsent') } }],
    },
    { kind: 'addSheet', name: 'Mine', index: 0 },
  ]);

  return { shared, client, history, heard };
};

describe('a workbook opened again from the server', () => {
  it('replaces a live book with unsent edits by the book of the server', () => {
    const { shared, client, history, heard } = stale();

    shared.type('Report', 'A9', 'newer');
    client.document.reset();

    const version = client.document.version();
    const loaded = client.document.load(shared.authority.snapshot(), 40);

    expect(version).toBeNull();
    expect(loaded).toBe(true);

    expect(described(client.book, client.calculator)).toEqual(
      described(shared.book, shared.calculator),
    );

    expect(client.document.pending()).toEqual([]);
    expect(client.document.version()).toBe(40);
    expect(history.canUndo).toBe(false);
    expect(heard).toHaveLength(1);
  });

  it('leaves the live book as it was when the snapshot does not apply', () => {
    const { client } = stale();
    const before = described(client.book, client.calculator);

    client.document.reset();

    const loaded = client.document.load(
      {
        steps: [
          { kind: 'addSheet', name: 'One', index: 0 },
          { kind: 'addSheet', name: 'One', index: 1 },
        ],
      },
      3,
    );

    expect(loaded).toBe(false);
    expect(described(client.book, client.calculator)).toEqual(before);
    expect(client.document.version()).toBeNull();
  });
});
