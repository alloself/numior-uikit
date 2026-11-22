import {
  DrawingKind,
  SheetChartKind,
  StepKind,
  chartAnchorAt,
  chartOfRange,
  createStepCodec,
  createWorkbook,
  freshDrawingId,
  insertDrawing,
  layoutDelta,
  lineLayoutsOf,
  moveRule,
  pivotCaptions,
  putRule,
  rulesOf,
  workbookAuthority,
  type ConditionalFormat,
  type LineLayout,
  type LineLayouts,
  type PivotSpec,
  type Sheet,
  type WorkbookStep,
} from '@numior/spreadsheet/core';
import * as fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { CollabStatusKind } from '../src';
import {
  KEY,
  SHEET,
  createBookNetwork,
  formulaCell,
  onWire,
  seedSheet,
  valueCell,
  writeCells,
  type BookClient,
  type BookNetwork,
} from './harness/workbook-network';

type Change = (client: BookClient) => void;

const insertRow = (at: number, count = 1): WorkbookStep => ({
  kind: 'insertLines',
  sheet: SHEET,
  axis: 'rows',
  at,
  count,
});

const deleteRow = (at: number, count = 1): WorkbookStep => ({
  kind: 'deleteLines',
  sheet: SHEET,
  axis: 'rows',
  at,
  count,
});

const REGIONS: PivotSpec = {
  anchor: { row: 0, col: 0 },
  definition: {
    source: { kind: 'range', sheet: SHEET, range: { top: 0, left: 5, bottom: 1, right: 5 } },
    rows: [0],
    columns: [],
    filters: [],
    values: [],
    fields: [],
    layout: 'compact',
    rowTotals: true,
    columnTotals: true,
    autofit: true,
    captions: pivotCaptions('en'),
  },
};

const network = (): BookNetwork => createBookNetwork(['ann', 'bob']);

const pair = ({ clients: [ann, bob] }: BookNetwork): readonly [BookClient, BookClient] => {
  if (ann === undefined || bob === undefined) {
    throw new Error('the network has two clients');
  }
  return [ann, bob];
};

const sizedLine = (size: number): LineLayout => ({
  size,
  custom: true,
  hidden: false,
  level: 0,
  collapsed: false,
  style: undefined,
  extra: [],
});

const sheetOf = (client: BookClient, name: string): Sheet => {
  const sheet = client.book.sheet(name);

  if (sheet === undefined) {
    throw new Error(`the sheet ${name} is missing`);
  }
  return sheet;
};

const withLine = (lines: LineLayouts, line: number, size: number): LineLayouts => {
  const entries: [number, LineLayout][] = [];

  lines.forEach((at, layout) => {
    if (at === line) {
      return;
    }

    entries.push([at, layout]);
  });

  return lineLayoutsOf([...entries, [line, sizedLine(size)]]);
};

const cols = (...sizes: readonly (readonly [number, number])[]): LineLayouts =>
  lineLayoutsOf(sizes.map(([col, size]) => [col, sizedLine(size)]));

const resizedOn = (client: BookClient, name: string, col: number, size: number): void => {
  const { layout } = sheetOf(client, name);

  client.commit([
    {
      kind: 'setLayout',
      sheet: name,
      layout: { ...layout, cols: withLine(layout.cols, col, size) },
    },
  ]);
};

const resized = (client: BookClient, col: number, size: number): void => {
  resizedOn(client, SHEET, col, size);
};

const heightened = (client: BookClient, row: number, size: number): void => {
  const { layout } = sheetOf(client, SHEET);

  client.commit([
    {
      kind: 'setLayout',
      sheet: SHEET,
      layout: { ...layout, rows: withLine(layout.rows, row, size) },
    },
  ]);
};

const chartInserted = (client: BookClient, row: number, name: string): void => {
  const sheet = sheetOf(client, SHEET);
  const area = { top: 0, left: 0, bottom: 1, right: 1 };
  const chart = chartOfRange(sheet.cells, SHEET, area, SheetChartKind.Column);

  if (chart === undefined) {
    throw new Error('the cells make no chart');
  }

  const layout = insertDrawing(sheet.layout, {
    id: freshDrawingId(sheet.layout),
    name,
    alt: '',
    anchor: chartAnchorAt(row, 3),
    content: { kind: DrawingKind.Chart, chart },
  });

  const delta = layoutDelta(sheet.layout, layout);

  if (delta === undefined) {
    throw new Error('the chart changed nothing');
  }

  client.commit([{ kind: StepKind.SetLayout, sheet: SHEET, ...delta }]);
};

const chartsOf = (client: BookClient): readonly string[] =>
  sheetOf(client, SHEET)
    .layout.drawings.map((drawing) => drawing.name)
    .toSorted();

const ruleOn = (top: number, bottom: number): ConditionalFormat => ({
  ranges: [{ top, left: 0, bottom, right: 0 }],
  rules: [
    {
      rule: {
        kind: 'blanks',
        style: { fill: { pattern: 'solid', foreground: { kind: 'rgb', argb: 'FFFF0000' } } },
      },
      priority: 1,
      stopIfTrue: false,
    },
  ],
});

const ruled = (client: BookClient, ...formats: readonly ConditionalFormat[]): void => {
  client.commit([
    {
      kind: 'setConditional',
      sheet: SHEET,
      formats: [...sheetOf(client, SHEET).conditional, ...formats],
    },
  ]);
};

const ruleAdded = (client: BookClient, row: number): void => {
  const current = sheetOf(client, SHEET).conditional;
  const [added] = ruleOn(row, row).rules;

  if (added === undefined) {
    throw new Error('the rule is missing');
  }

  client.commit([
    {
      kind: 'setConditional',
      sheet: SHEET,
      formats: putRule(current, {
        ranges: [{ top: row, left: 0, bottom: row, right: 0 }],
        rule: added.rule,
        stopIfTrue: false,
      }),
      base: current,
    },
  ]);
};

const ruleMovedDown = (client: BookClient, index: number): void => {
  const current = sheetOf(client, SHEET).conditional;

  client.commit([
    {
      kind: 'setConditional',
      sheet: SHEET,
      formats: moveRule(current, index, index + 1),
      base: current,
    },
  ]);
};

const ruleOrder = (client: BookClient): readonly number[] =>
  rulesOf(sheetOf(client, SHEET).conditional).map((placed) => placed.ranges[0]?.top ?? -1);

const ruleRows = (client: BookClient): readonly (readonly [number, number])[] =>
  sheetOf(client, SHEET)
    .conditional.flatMap((format) => format.ranges)
    .map((range): readonly [number, number] => [range.top, range.bottom])
    .toSorted(([left], [right]) => left - right);

const colSize = (client: BookClient, col: number, name = SHEET): number | undefined =>
  client.book.sheet(name)?.layout.cols.get(col)?.size;

const rowSize = (client: BookClient, row: number): number | undefined =>
  client.book.sheet(SHEET)?.layout.rows.get(row)?.size;

const expectSame = (ann: BookClient, bob: BookClient): void => {
  expect(ann.status()).toEqual({ kind: CollabStatusKind.Online });
  expect(bob.status()).toEqual({ kind: CollabStatusKind.Online });
  expect(ann.dump()).toBe(bob.dump());
};

const BOTH_ONLINE = [{ kind: CollabStatusKind.Online }, { kind: CollabStatusKind.Online }];

const PROPERTY_TIMEOUT = 30_000;

const LINE = fc.integer({ min: 0, max: 8 });

const changeArbitrary: fc.Arbitrary<Change> = fc.oneof(
  fc
    .tuple(LINE, LINE, fc.string({ minLength: 1, maxLength: 3 }))
    .map(([row, col, text]): Change => (client) => {
      client.commit([writeCells(valueCell(row, col, text))]);
    }),
  fc.tuple(LINE, LINE, LINE).map(([row, col, source]): Change => (client) => {
    client.commit([writeCells(formulaCell(row, col, `=A${(source + 1).toString()}+1`))]);
  }),
  fc.tuple(LINE, fc.integer({ min: 1, max: 2 })).map(([at, count]): Change => (client) => {
    client.commit([insertRow(at, count)]);
  }),
  fc.tuple(LINE, fc.integer({ min: 1, max: 2 })).map(([at, count]): Change => (client) => {
    client.commit([deleteRow(at, count)]);
  }),
  fc.tuple(LINE, LINE).map(([col, size]): Change => (client) => {
    resized(client, col, size + 10);
  }),
  fc.constant<Change>((client) => {
    client.undo();
  }),
  fc.constant<Change>((client) => {
    client.redo();
  }),
);

const actionArbitrary: fc.Arbitrary<Change> = fc.oneof(
  { weight: 3, arbitrary: changeArbitrary },
  {
    weight: 2,
    arbitrary: fc.constant<Change>((client) => {
      client.toServer();
    }),
  },
  {
    weight: 2,
    arbitrary: fc.constant<Change>((client) => {
      client.toClient();
    }),
  },
  {
    weight: 1,
    arbitrary: fc.constantFrom<Change>(
      (client) => {
        client.cut();
      },
      (client) => {
        client.relink();
      },
      (client) => {
        client.late();
      },
    ),
  },
);

describe('workbook steps through the collaboration envelope', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads the seeded book from the snapshot', () => {
    const [ann, bob] = pair(
      createBookNetwork(['ann', 'bob'], [seedSheet, writeCells(valueCell(0, 0, 'seed'))]),
    );

    const texts = [ann.text(SHEET, 0, 0), bob.text(SHEET, 0, 0)];

    expect(texts).toEqual(['seed', 'seed']);
  });

  it('moves a local write past a row inserted by someone else', () => {
    const net = network();
    const [ann, bob] = pair(net);

    ann.commit([insertRow(0)]);
    bob.commit([writeCells(valueCell(2, 0, 'mine'))]);
    net.settle();

    expect(bob.text(SHEET, 3, 0)).toBe('mine');
    expectSame(ann, bob);
  });

  it('reads later local steps in the coordinates of the earlier ones', () => {
    const net = network();
    const [ann, bob] = pair(net);

    ann.commit([insertRow(5)]);
    bob.commit([insertRow(0)]);
    bob.commit([writeCells(valueCell(5, 0, 'kept'))]);
    net.settle();

    expect(bob.text(SHEET, 5, 0)).toBe('kept');
    expectSame(ann, bob);
  });

  it('drops a write into a row removed by someone else', () => {
    const net = network();
    const [ann, bob] = pair(net);

    ann.commit([deleteRow(2)]);
    bob.commit([writeCells(valueCell(2, 0, 'gone'), valueCell(4, 0, 'stays'))]);
    net.settle();

    expect(bob.text(SHEET, 2, 0)).toBe('');
    expect(bob.text(SHEET, 3, 0)).toBe('stays');
    expectSame(ann, bob);
  });

  it('moves the references of a local formula with the sheet', () => {
    const net = network();
    const [ann, bob] = pair(net);

    ann.commit([insertRow(0)]);
    bob.commit([writeCells(formulaCell(0, 1, '=A5'))]);
    net.settle();

    expect(bob.text(SHEET, 1, 1)).toBe('=A6');
    expectSame(ann, bob);
  });

  it('lets the server order settle one cell', () => {
    const net = network();
    const [ann, bob] = pair(net);

    ann.commit([writeCells(valueCell(0, 0, 'first'))]);
    bob.commit([writeCells(valueCell(0, 0, 'second'))]);
    ann.toServer();
    net.settle();

    expect(ann.text(SHEET, 0, 0)).toBe('second');
    expectSame(ann, bob);
  });

  it('keeps two widths set at the same time', () => {
    const net = network();
    const [ann, bob] = pair(net);

    resized(ann, 1, 50);
    resized(bob, 3, 70);
    net.settle();

    expect([colSize(ann, 1), colSize(ann, 3)]).toEqual([50, 70]);
    expectSame(ann, bob);
  });

  it('follows a sheet renamed by someone else', () => {
    const net = network();
    const [ann, bob] = pair(net);

    ann.commit([{ kind: 'renameSheet', from: SHEET, to: 'Plan' }]);
    bob.commit([writeCells(valueCell(0, 0, 'moved'))]);
    net.settle();

    expect(bob.text('Plan', 0, 0)).toBe('moved');
    expectSame(ann, bob);
  });

  it('drops steps on a sheet removed by someone else', () => {
    const net = network();
    const [ann, bob] = pair(net);

    ann.commit([{ kind: 'addSheet', name: 'Extra', index: 1 }]);
    net.settle();
    ann.commit([{ kind: 'removeSheet', name: 'Extra' }]);
    bob.commit([{ kind: 'setCells', sheet: 'Extra', cells: [valueCell(0, 0, 'lost')] }]);
    net.settle();

    expect(bob.book.sheet('Extra')).toBeUndefined();
    expectSame(ann, bob);
  });

  it('undoes a write where it moved to', () => {
    const net = network();
    const [ann, bob] = pair(net);

    bob.commit([writeCells(valueCell(2, 0, 'mine'))]);
    net.settle();
    ann.commit([insertRow(0)]);
    net.settle();
    bob.undo();
    net.settle();

    expect(bob.text(SHEET, 3, 0)).toBe('');
    expectSame(ann, bob);
  });

  it('keeps rows someone else has written into out of the undo of their insertion', () => {
    const net = network();
    const [ann, bob] = pair(net);

    ann.commit([writeCells(valueCell(9, 0, 'mine'))]);
    ann.commit([insertRow(3, 2)]);
    net.settle();
    bob.commit([writeCells(valueCell(3, 0, 'theirs'))]);
    net.settle();
    ann.undo();
    net.settle();

    expect([ann.text(SHEET, 3, 0), bob.text(SHEET, 3, 0)]).toEqual(['theirs', 'theirs']);
    expect([bob.text(SHEET, 9, 0), bob.text(SHEET, 11, 0)]).toEqual(['', '']);
    expect(ann.dump()).toBe(bob.dump());
  });

  it('keeps a row someone else has edited out of the redo of its deletion', () => {
    const net = network();
    const [ann, bob] = pair(net);

    ann.commit([writeCells(valueCell(3, 0, 'mine'), valueCell(3, 1, 'kept'))]);
    ann.commit([deleteRow(3)]);
    ann.undo();
    net.settle();
    bob.commit([writeCells(valueCell(3, 0, 'theirs'))]);
    net.settle();
    ann.redo();
    net.settle();

    expect([bob.text(SHEET, 3, 0), bob.text(SHEET, 3, 1)]).toEqual(['theirs', 'kept']);
    expect(ann.dump()).toBe(bob.dump());
  });

  it('leaves a cell someone else has rewritten out of an undo and a redo', () => {
    const net = network();
    const [ann, bob] = pair(net);

    ann.commit([writeCells(valueCell(0, 0, 'base'), valueCell(0, 1, 'kept'))]);
    net.settle();
    ann.commit([writeCells(valueCell(0, 0, 'mine'), valueCell(0, 1, 'mine too'))]);
    net.settle();
    bob.commit([writeCells(valueCell(0, 0, 'theirs'))]);
    net.settle();
    ann.undo();
    net.settle();

    expect([ann.text(SHEET, 0, 0), ann.text(SHEET, 0, 1)]).toEqual(['theirs', 'kept']);
    expectSame(ann, bob);

    ann.redo();
    net.settle();

    expect([ann.text(SHEET, 0, 0), ann.text(SHEET, 0, 1)]).toEqual(['theirs', 'mine too']);
    expectSame(ann, bob);
  });

  it('finds the rewritten cell of an older step under the rows inserted since', () => {
    const net = network();
    const [ann, bob] = pair(net);

    ann.commit([writeCells(valueCell(2, 0, 'mine'), valueCell(2, 1, 'mine too'))]);
    ann.commit([insertRow(0)]);
    net.settle();
    bob.commit([writeCells(valueCell(3, 0, 'theirs'))]);
    net.settle();
    ann.undo();
    ann.undo();
    net.settle();

    expect([ann.text(SHEET, 2, 0), ann.text(SHEET, 2, 1)]).toEqual(['theirs', '']);
    expectSame(ann, bob);
  });

  it('keeps a width someone else has set out of the undo of inserted rows', () => {
    const net = network();
    const [ann, bob] = pair(net);

    ann.commit([insertRow(1)]);
    net.settle();
    resized(bob, 3, 70);
    net.settle();
    ann.undo();
    net.settle();

    expect(colSize(ann, 3)).toBe(70);
    expectSame(ann, bob);

    ann.redo();
    net.settle();

    expect(colSize(ann, 3)).toBe(70);
    expectSame(ann, bob);
  });

  it('brings back the height of a deleted row next to a width set since', () => {
    const net = network();
    const [ann, bob] = pair(net);

    heightened(ann, 2, 40);
    ann.commit([deleteRow(2)]);
    net.settle();
    resized(bob, 3, 70);
    net.settle();
    ann.undo();
    net.settle();

    expect([rowSize(ann, 2), colSize(ann, 3)]).toEqual([40, 70]);
    expectSame(ann, bob);
  });

  it('leaves the other sheets as they are when rows and a sheet come back', () => {
    const net = network();
    const [ann, bob] = pair(net);

    ann.commit([{ kind: 'addSheet', name: 'Extra', index: 1 }]);
    resizedOn(ann, 'Extra', 1, 50);
    ann.commit([insertRow(1)]);
    net.settle();
    resizedOn(bob, 'Extra', 3, 70);
    net.settle();
    ann.undo();
    net.settle();

    expect([colSize(ann, 1, 'Extra'), colSize(ann, 3, 'Extra')]).toEqual([50, 70]);
    expectSame(ann, bob);

    ann.commit([{ kind: 'removeSheet', name: 'Extra' }]);
    net.settle();
    resized(bob, 4, 90);
    net.settle();
    ann.undo();
    net.settle();

    expect([colSize(ann, 3, 'Extra'), colSize(ann, 4)]).toEqual([70, 90]);
    expectSame(ann, bob);
  });

  it('undoes an own width and leaves the widths of the others', () => {
    const net = network();
    const [ann, bob] = pair(net);

    resized(ann, 1, 50);
    resized(ann, 2, 60);
    net.settle();
    resized(bob, 3, 70);
    resized(bob, 1, 80);
    net.settle();
    ann.undo();
    ann.undo();
    net.settle();

    expect([colSize(ann, 1), colSize(ann, 2), colSize(ann, 3)]).toEqual([80, undefined, 70]);
    expectSame(ann, bob);
  });

  it('keeps every rule once when two people add a rule at the same time', () => {
    const net = network();
    const [ann, bob] = pair(net);

    ruleAdded(ann, 9);
    net.settle();
    ruleAdded(ann, 2);
    ruleAdded(bob, 5);
    net.settle();

    expect(ruleOrder(ann).toSorted((left, right) => left - right)).toEqual([2, 5, 9]);
    expect(ruleOrder(bob)).toEqual(ruleOrder(ann));
  });

  it('keeps the new order of the rules and a rule added by someone else at the same time', () => {
    const net = network();
    const [ann, bob] = pair(net);

    ruleAdded(ann, 9);
    ruleAdded(ann, 4);
    net.settle();
    ruleMovedDown(ann, 0);
    ruleAdded(bob, 5);
    net.settle();

    expect(ruleOrder(ann)).toEqual([5, 9, 4]);
    expect(ruleOrder(bob)).toEqual(ruleOrder(ann));
  });

  it('takes back only its own rule after someone else has added one', () => {
    const net = network();
    const [ann, bob] = pair(net);

    ruleAdded(ann, 9);
    net.settle();
    ruleAdded(ann, 2);
    net.settle();
    ruleAdded(bob, 5);
    net.settle();
    ann.undo();
    net.settle();

    expect(ruleOrder(ann)).toEqual([5, 9]);
    expect(ruleOrder(bob)).toEqual(ruleOrder(ann));
  });

  it('keeps a rule someone else has added when deleted rows come back with their rule', () => {
    const net = network();
    const [ann, bob] = pair(net);

    ruled(ann, ruleOn(2, 2));
    ann.commit([deleteRow(2)]);
    net.settle();
    ruled(bob, ruleOn(5, 6));
    net.settle();
    ann.undo();
    net.settle();

    expect(ruleRows(ann)).toEqual([
      [2, 2],
      [6, 7],
    ]);

    expect(ruleRows(bob)).toEqual(ruleRows(ann));
    expectSame(ann, bob);

    ann.undo();
    net.settle();

    expect(ruleRows(bob)).toEqual([[6, 7]]);
  });

  it('gives back the widths a pivot has fitted and leaves the width set next to them', () => {
    const net = network();
    const [ann, bob] = pair(net);

    ann.commit([
      writeCells(valueCell(0, 5, 'Region'), valueCell(1, 5, 'Northern Territories')),
      { kind: 'setPivot', sheet: SHEET, name: 'Regions', pivot: REGIONS },
    ]);

    net.settle();

    const fitted = colSize(ann, 0);

    resized(bob, 3, 70);
    net.settle();
    ann.undo();
    net.settle();

    expect([fitted === undefined, colSize(ann, 0), colSize(ann, 3)]).toEqual([
      false,
      undefined,
      70,
    ]);

    expectSame(ann, bob);
  });

  it('keeps two sheets added at the same time', () => {
    const net = network();
    const [ann, bob] = pair(net);

    ann.commit([{ kind: 'addSheet', name: 'Extra', index: 1 }]);
    bob.commit([{ kind: 'addSheet', name: 'Other', index: 1 }]);
    net.settle();

    expect(bob.book.sheets.map((sheet) => sheet.name).toSorted()).toEqual([
      'Extra',
      'Other',
      SHEET,
    ]);

    expectSame(ann, bob);
  });

  it('keeps two charts inserted on one sheet at the same time', () => {
    const net = createBookNetwork(
      ['ann', 'bob'],
      [
        seedSheet,
        writeCells(valueCell(0, 0, 'Item'), valueCell(0, 1, 'Sum'), valueCell(1, 0, 'Pen')),
        writeCells({
          row: 1,
          col: 1,
          content: { kind: 'value', value: { kind: 'number', value: 5 } },
        }),
      ],
    );

    const [ann, bob] = pair(net);

    chartInserted(ann, 2, 'Ann chart');
    chartInserted(bob, 20, 'Bob chart');
    net.settle();

    expect([chartsOf(ann), chartsOf(bob)]).toEqual([
      ['Ann chart', 'Bob chart'],
      ['Ann chart', 'Bob chart'],
    ]);

    expectSame(ann, bob);
  });

  it('confirms sent steps the server kept as they were', () => {
    const [ann] = createBookNetwork(['ann']).clients;
    const version = ann?.document.version() ?? 0;

    ann?.commit([writeCells(valueCell(0, 0, 'sent'))]);
    ann?.commit([writeCells(valueCell(1, 0, 'later'))]);

    const settled = ann?.document.settle(1, ann.document.pending().slice(0, 1), version + 1);

    expect(settled).toBe(true);
    expect(ann?.document.pending()).toHaveLength(1);
    expect(ann?.document.version()).toBe(version + 1);
    expect([ann?.text(SHEET, 0, 0), ann?.text(SHEET, 1, 0)]).toEqual(['sent', 'later']);
  });

  it('replaces sent steps with what the server made of them and keeps the later ones', () => {
    const [ann] = createBookNetwork(['ann']).clients;
    const version = ann?.document.version() ?? 0;

    ann?.commit([writeCells(valueCell(0, 0, 'sent'))]);
    ann?.commit([writeCells(valueCell(1, 0, 'later'))]);

    const settled = ann?.document.settle(
      1,
      [onWire(writeCells(valueCell(5, 0, 'sent')))],
      version + 1,
    );

    expect(settled).toBe(true);
    expect(ann?.document.pending()).toHaveLength(1);

    expect([ann?.text(SHEET, 0, 0), ann?.text(SHEET, 1, 0), ann?.text(SHEET, 5, 0)]).toEqual([
      '',
      'later',
      'sent',
    ]);
  });

  it('moves later steps back when the server dropped the rows they counted on', () => {
    const [ann] = createBookNetwork(['ann']).clients;
    const version = ann?.document.version() ?? 0;

    ann?.commit([insertRow(0)]);
    ann?.commit([writeCells(valueCell(3, 0, 'later'))]);

    const settled = ann?.document.settle(1, [], version);

    expect(settled).toBe(true);
    expect(ann?.document.pending()).toHaveLength(1);
    expect([ann?.text(SHEET, 2, 0), ann?.text(SHEET, 3, 0)]).toEqual(['later', '']);
  });

  it('refuses to settle with steps it cannot read', () => {
    const [ann] = createBookNetwork(['ann']).clients;

    ann?.commit([writeCells(valueCell(0, 0, 'sent'))]);

    expect(ann?.document.settle(1, [{ kind: 'nope' }], 2)).toBe(false);
  });

  it('has the authority move a write of an old version past the rows inserted since', () => {
    const authority = workbookAuthority([seedSheet]);

    authority.apply([onWire(insertRow(0, 2))]);

    expect(authority.rebase([onWire(writeCells(valueCell(1, 0, 'late')))], 1)).toEqual([
      onWire(writeCells(valueCell(3, 0, 'late'))),
    ]);
  });

  it('has the authority refuse a late whole layout and merge a late change of a layout', () => {
    const authority = workbookAuthority([seedSheet]);
    const blank = createWorkbook();
    const codec = createStepCodec(blank);
    const empty = blank.addSheet(SHEET).layout;

    const layoutStep = (layout: LineLayouts, base?: LineLayouts): unknown =>
      codec.encode({
        kind: 'setLayout',
        sheet: KEY,
        layout: { ...empty, cols: layout },
        base: base === undefined ? undefined : { ...empty, cols: base },
      });

    authority.apply([layoutStep(cols([1, 50], [3, 70]))]);

    const late = [
      authority.rebase([layoutStep(cols([1, 60]))], 1),
      authority.rebase([layoutStep(cols(), cols([1, 50]))], 1),
    ];

    expect(late).toEqual([undefined, [layoutStep(cols(), cols([1, 50]))]]);
    expect(authority.rebase([layoutStep(cols([3, 70]), cols([3, 70]))], 0)).toHaveLength(1);
  });

  it('has the authority drop a write into rows removed since and keep the rest of the pack', () => {
    const authority = workbookAuthority([seedSheet]);

    authority.apply([onWire(deleteRow(1))]);

    expect(
      authority.rebase(
        [onWire(writeCells(valueCell(1, 0, 'gone'))), onWire(writeCells(valueCell(4, 0, 'kept')))],
        1,
      ),
    ).toEqual([onWire(writeCells(valueCell(3, 0, 'kept')))]);
  });

  it.each([
    ['a layout of an old version', [{ kind: 'setLayout', sheet: KEY, layout: {} }], 1],
    ['a step it cannot read', [{ kind: 'nope' }], 1],
    ['a version older than it remembers', [onWire(writeCells(valueCell(0, 0, 'late')))], 2],
  ])('has the authority leave %s to its author and keep the book', (_name, steps, behind) => {
    const authority = workbookAuthority([seedSheet], { window: 1 });

    authority.apply([onWire(insertRow(0))]);
    authority.apply([onWire(insertRow(0))]);

    const before = authority.snapshot();

    expect(authority.rebase(steps, behind)).toBeUndefined();
    expect(authority.snapshot()).toEqual(before);
  });

  it('has the authority refuse a malformed step and keep the book', () => {
    const authority = workbookAuthority([seedSheet]);
    const before = authority.snapshot();

    const accepted = authority.apply([{ kind: 'removeSheet', name: KEY }, { kind: 'nope' }]);

    expect(accepted).toBe(false);
    expect(authority.snapshot()).toEqual(before);
  });

  it('has the authority undo a pack with a refused step', () => {
    const authority = workbookAuthority([seedSheet]);

    const accepted = authority.apply([
      onWire(writeCells(valueCell(0, 0, 'written'))),
      { kind: 'removeSheet', name: 'missing' },
    ]);

    expect(accepted).toBe(false);
    expect(authority.apply([{ kind: 'addSheet', name: 'Next', index: 1, key: 'next' }])).toBe(true);
  });

  it(
    'brings every interleaving to one book through broken links',
    () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(fc.integer({ min: 0, max: 1 }), actionArbitrary), { maxLength: 40 }),
          (actions) => {
            const net = network();
            const [ann, bob] = pair(net);

            actions.forEach(([who, act]) => {
              act(who === 0 ? ann : bob);
            });

            net.mend();
            net.close();

            expect([ann.status(), bob.status()]).toEqual(BOTH_ONLINE);
            expect(ann.dump()).toBe(bob.dump());
            expect(net.newcomer()).toBe(ann.dump());
          },
        ),
        { numRuns: 150 },
      );
    },
    PROPERTY_TIMEOUT,
  );
});
