import {
  EN_FORMULAS,
  columnName,
  createCellEditor,
  parseRange,
  pivotCaptions,
  parseFormula,
  printFormula,
  type WorkbookStep,
} from '@numior/spreadsheet/core';
import * as fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  createBookNetwork,
  formulaCell,
  type BookClient,
  type BookNetwork,
} from './harness/workbook-network';

type NetAction = (typeof NetAction)[keyof typeof NetAction];

interface NetMove {
  readonly action: NetAction;
  readonly who: number;
  readonly sheet: number;
  readonly other: number;
  readonly row: number;
  readonly col: number;
  readonly pick: number;
}

interface Desk {
  readonly net: BookNetwork;
  readonly shared: boolean;
  made: number;
}

const NetAction = {
  Cells: 'cells',
  Formula: 'formula',
  Lines: 'lines',
  Format: 'format',
  Add: 'add',
  Rename: 'rename',
  Remove: 'remove',
  Name: 'name',
  Merge: 'merge',
  Undo: 'undo',
  Redo: 'redo',
  Send: 'send',
  Receive: 'receive',
  Cut: 'cut',
  Relink: 'relink',
  Late: 'late',
} as const;

const PEOPLE = ['ann', 'bob', 'cat'] as const;

const PROPERTY_TIMEOUT = 120_000;

const RUNS = 150;

const MOVES = 70;

const FEWEST_MOVES = 40;

const COLUMNS = 'ABCDE';

const FORMATS = ['0.00', '0%', '@'] as const;

const ORIGIN = { row: 0, col: 0 };

const PLAIN_SHEET = /^[A-Za-z][A-Za-z0-9]*$/u;

const EDITS = [
  NetAction.Cells,
  NetAction.Formula,
  NetAction.Lines,
  NetAction.Format,
  NetAction.Add,
  NetAction.Rename,
  NetAction.Remove,
  NetAction.Name,
  NetAction.Merge,
  NetAction.Undo,
  NetAction.Redo,
] as const;

const NET_MOVE: fc.Arbitrary<NetMove> = fc.record({
  action: fc.oneof(
    { weight: 3, arbitrary: fc.constant(NetAction.Send) },
    { weight: 3, arbitrary: fc.constant(NetAction.Receive) },
    { weight: 1, arbitrary: fc.constantFrom(NetAction.Cut, NetAction.Relink, NetAction.Late) },
    { weight: 10, arbitrary: fc.constantFrom(...EDITS) },
  ),
  who: fc.nat({ max: PEOPLE.length - 1 }),
  sheet: fc.nat(),
  other: fc.nat(),
  row: fc.nat({ max: 7 }),
  col: fc.nat({ max: 4 }),
  pick: fc.nat(),
});

const quoted = (name: string): string => (PLAIN_SHEET.test(name) ? `${name}!` : `'${name}'!`);

const parsed = (text: string, place: { readonly row: number; readonly col: number }) => {
  const result = parseFormula(text, EN_FORMULAS, place);

  if (!result.ok) {
    throw new Error(`${text} does not parse`);
  }
  return result.ast;
};

const clientOf = (desk: Desk, who: number): BookClient => {
  const client = desk.net.clients[who % desk.net.clients.length];

  if (client === undefined) {
    throw new Error('the network has no clients');
  }
  return client;
};

const sheetNameOf = (client: BookClient, pick: number): string => {
  const { sheets } = client.book;

  return sheets[pick % sheets.length]?.name ?? '';
};

const tokenOf = (desk: Desk, who: number): string => {
  desk.made += 1;
  return `${PEOPLE[who] ?? 'who'}${String(desk.made)}`;
};

const formulaText = (client: BookClient, move: NetMove): string =>
  move.pick % 2 === 0
    ? `=${quoted(sheetNameOf(client, move.other))}${COLUMNS[move.pick % COLUMNS.length] ?? 'A'}${String(1 + (move.pick % 8))}&"!"`
    : `=COUNTA(A${String(1 + (move.pick % 4))}:${COLUMNS[move.other % COLUMNS.length] ?? 'A'}${String(5 + (move.pick % 4))})`;

const mergeStep = (client: BookClient, move: NetMove): WorkbookStep | undefined => {
  const owner = client.book.sheet(sheetNameOf(client, move.sheet));

  if (owner === undefined) {
    return undefined;
  }

  const merge = { top: move.row, left: move.col, bottom: move.row + 1, right: move.col + 1 };

  const apart = owner.layout.merges.filter(
    (each) =>
      each.bottom < merge.top ||
      each.top > merge.bottom ||
      each.right < merge.left ||
      each.left > merge.right,
  );

  return {
    kind: 'setLayout',
    sheet: owner.name,
    layout: { ...owner.layout, merges: [...apart, merge] },
    base: owner.layout,
  };
};

const sheetStep = (desk: Desk, client: BookClient, move: NetMove): WorkbookStep | undefined => {
  const sheet = sheetNameOf(client, move.sheet);
  const count = client.book.sheets.length;

  switch (move.action) {
    case NetAction.Add:
      return {
        kind: 'addSheet',
        name: desk.shared ? `Sheet${String(count + 1)}` : `${tokenOf(desk, move.who)}S`,
        index: move.pick % (count + 1),
      };
    case NetAction.Rename:
      return {
        kind: 'renameSheet',
        from: sheet,
        to: desk.shared ? `Tab${String(1 + (move.pick % 4))}` : `${tokenOf(desk, move.who)} T`,
      };
    case NetAction.Remove:
      return count < 2 ? undefined : { kind: 'removeSheet', name: sheet };
    case NetAction.Name:
      return {
        kind: 'setName',
        name: desk.shared ? 'Total' : `${PEOPLE[move.who] ?? 'who'}Name`,
        ast: parsed(`=${quoted(sheet)}$A$1:$B$${String(2 + (move.pick % 5))}`, ORIGIN),
      };
    default:
      return mergeStep(client, move);
  }
};

const editStep = (desk: Desk, client: BookClient, move: NetMove): WorkbookStep | undefined => {
  const sheet = sheetNameOf(client, move.sheet);
  const place = { row: move.row, col: move.col };

  switch (move.action) {
    case NetAction.Cells:
      return {
        kind: 'setCells',
        sheet,
        cells: [
          {
            ...place,
            content: { kind: 'value', value: { kind: 'string', value: tokenOf(desk, move.who) } },
          },
        ],
      };
    case NetAction.Formula:
      return {
        kind: 'setCells',
        sheet,
        cells: [
          { ...place, content: { kind: 'formula', ast: parsed(formulaText(client, move), place) } },
        ],
      };
    case NetAction.Lines:
      return {
        kind: move.pick % 2 === 0 ? 'insertLines' : 'deleteLines',
        sheet,
        axis: move.other % 2 === 0 ? 'rows' : 'cols',
        at: move.pick % 5,
        count: 1,
      };
    case NetAction.Format:
      return {
        kind: 'setFormat',
        sheet,
        range: { top: move.row, left: move.col, bottom: move.row + 1, right: move.col },
        format: FORMATS[move.pick % FORMATS.length] ?? '@',
      };
    default:
      return sheetStep(desk, client, move);
  }
};

const played = (desk: Desk, move: NetMove): void => {
  const client = clientOf(desk, move.who);

  switch (move.action) {
    case NetAction.Send:
      client.toServer();
      return;
    case NetAction.Receive:
      client.toClient();
      return;
    case NetAction.Cut:
      client.cut();
      return;
    case NetAction.Relink:
      client.relink();
      return;
    case NetAction.Late:
      client.late();
      return;
    case NetAction.Undo:
      client.undo();
      return;
    case NetAction.Redo:
      client.redo();
      return;
    default: {
      const step = editStep(desk, client, move);

      if (step === undefined) {
        return;
      }

      client.commit([step]);
    }
  }
};

const pictureOf = (client: BookClient): string => {
  const names: string[] = [];

  client.book.names.forEach((defined) => {
    names.push(
      `${defined.scope?.name ?? ''}!${defined.name}=${printFormula(defined.ast, EN_FORMULAS, ORIGIN)}`,
    );
  });

  return `${client.dump()} names ${JSON.stringify(names.toSorted())}`;
};

const columnsOf = (client: BookClient): string =>
  client.book.sheets.map((sheet) => `${sheet.name}:${columnName(0)}`).join(',');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});

afterEach(() => {
  vi.useRealTimers();
});

const renameStep = (from: string, to: string): WorkbookStep => ({ kind: 'renameSheet', from, to });

const rowsStep = (sheet: string): WorkbookStep => ({
  kind: 'insertLines',
  sheet,
  axis: 'rows',
  at: 0,
  count: 1,
});

const nameStep = (name: string, text: string): WorkbookStep => ({
  kind: 'setName',
  name,
  ast: parsed(text, ORIGIN),
});

const trio = (
  seed?: readonly WorkbookStep[],
): readonly [BookNetwork, BookClient, BookClient, BookClient] => {
  const net = createBookNetwork(PEOPLE, seed);
  const [ann, bob, cat] = net.clients;

  if (ann === undefined || bob === undefined || cat === undefined) {
    throw new Error('the network has three clients');
  }
  return [net, ann, bob, cat];
};

const settledPictures = (net: BookNetwork): readonly string[] => {
  net.mend();
  net.settle();

  return net.clients.map(pictureOf);
};

const cellAt = (sheet: string, row: number, col: number, text: string): WorkbookStep => ({
  kind: 'setCells',
  sheet,
  cells: [{ row, col, content: { kind: 'value', value: { kind: 'string', value: text } } }],
});

const tableOf = (client: BookClient, range: string): WorkbookStep => {
  const sheet = client.book.sheet('Sheet1');
  const area = parseRange(range);

  if (sheet === undefined || area === undefined) {
    throw new Error(`no table over ${range}`);
  }
  return createCellEditor(client.book, client.calculator).tableStep(sheet, area);
};

const tableNames = (client: BookClient): readonly string[] => {
  const names: string[] = [];

  client.book.tables.forEach((table) => {
    names.push(`${table.name}@${String(table.range.left)}`);
  });

  return names.toSorted();
};

const pivotOn = (sheet: string, index: number): readonly WorkbookStep[] => [
  { kind: 'addSheet', name: sheet, index },
  {
    kind: 'setPivot',
    sheet,
    name: 'PivotTable1',
    pivot: {
      anchor: { row: 2, col: 0 },
      definition: {
        source: { kind: 'range', sheet: 'Sheet1', range: { top: 0, left: 0, bottom: 2, right: 0 } },
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
    },
  },
];

const pivotsOf = (client: BookClient): readonly string[] =>
  client.book.sheets.map(
    (sheet) =>
      `${sheet.name}:${client.book.pivots
        .on(sheet)
        .map((pivot) => pivot.name)
        .join(',')}`,
  );

describe('sheets three people rename, remove and bring back at once', () => {
  it('ends with one book for everyone after a sheet is renamed to its own name among renames and new rows', () => {
    const [net, ann, bob, cat] = trio();

    try {
      cat.commit([cellAt('Sheet1', 0, 0, 'cat1')]);
      cat.toServer();
      cat.commit([rowsStep('Sheet1')]);
      ann.commit([renameStep('Sheet1', 'Tab4')]);
      cat.commit([renameStep('Sheet1', 'Tab4')]);
      bob.commit([renameStep('Sheet1', 'Tab1')]);
      bob.toServer();
      cat.commit([renameStep('Tab4', 'Tab1')]);
      bob.toClient();
      bob.commit([renameStep('Tab1', 'Tab1')]);
      cat.commit([cellAt('Tab1', 0, 0, 'cat2')]);
      bob.commit([nameStep('Total', '=Tab1!$A$1:$B$2')]);

      const pictures = settledPictures(net);

      expect(pictures).toEqual(pictures.map(() => pictures[0]));
      expect(net.newcomer()).toBe(ann.dump());
    } finally {
      net.close();
    }
  });

  it('ends with one book for everyone after a removed sheet comes back while another renames it and names a range on it', () => {
    const [net, ann, bob, cat] = trio();

    try {
      cat.commit([cellAt('Sheet1', 0, 0, 'cat1')]);
      cat.toServer();
      ann.commit([renameStep('Sheet1', 'Ann')]);
      ann.commit([{ kind: 'addSheet', name: 'Notes', index: 0 }]);
      cat.commit([renameStep('Sheet1', 'Cat')]);
      ann.commit([{ kind: 'removeSheet', name: 'Ann' }]);
      bob.commit([cellAt('Sheet1', 0, 0, 'bob1')]);
      ann.undo();
      cat.commit([nameStep('catName', "='Cat'!$A$1:$B$2")]);
      bob.commit([cellAt('Sheet1', 0, 0, 'bob2')]);

      const pictures = settledPictures(net);

      expect(pictures).toEqual(pictures.map(() => pictures[0]));
      expect(net.newcomer()).toBe(ann.dump());
    } finally {
      net.close();
    }
  });
});

describe('names two people give at once', () => {
  it('keeps both sheets two people add under one automatic name, the later under the next name', () => {
    const [net, ann, bob] = trio();

    try {
      ann.commit([
        { kind: 'addSheet', name: 'Sheet2', index: 1 },
        cellAt('Sheet2', 0, 0, 'ANN budget'),
      ]);

      bob.commit([
        { kind: 'addSheet', name: 'Sheet2', index: 1 },
        cellAt('Sheet2', 0, 1, 'BOB notes'),
        cellAt('Sheet2', 0, 0, 'BOB title'),
      ]);

      const pictures = settledPictures(net);

      expect(pictures).toEqual(pictures.map(() => pictures[0]));
      expect(bob.book.sheets.map((sheet) => sheet.name)).toEqual(['Sheet1', 'Sheet3', 'Sheet2']);
      expect([bob.text('Sheet2', 0, 0), bob.text('Sheet2', 0, 1)]).toEqual(['ANN budget', '']);

      expect([bob.text('Sheet3', 0, 0), bob.text('Sheet3', 0, 1)]).toEqual([
        'BOB title',
        'BOB notes',
      ]);

      bob.undo();

      const undone = settledPictures(net);

      expect(undone).toEqual(undone.map(() => undone[0]));
      expect(ann.book.sheets.map((sheet) => sheet.name)).toEqual(['Sheet1', 'Sheet2']);
      expect(ann.text('Sheet2', 0, 0)).toBe('ANN budget');
    } finally {
      net.close();
    }
  });

  it('gives a sheet renamed to a name someone else took at once the next name', () => {
    const [net, ann, bob] = trio([
      { kind: 'addSheet', name: 'Sheet1', index: 0, key: 'main' },
      { kind: 'addSheet', name: 'Other', index: 1, key: 'other' },
    ]);

    try {
      ann.commit([renameStep('Sheet1', 'Plan')]);
      bob.commit([renameStep('Other', 'Plan'), cellAt('Plan', 0, 0, 'BOB plan')]);

      const pictures = settledPictures(net);

      expect(pictures).toEqual(pictures.map(() => pictures[0]));
      expect(bob.book.sheets.map((sheet) => sheet.name)).toEqual(['Plan', 'Plan2']);
      expect([bob.text('Plan', 0, 0), bob.text('Plan2', 0, 0)]).toEqual(['', 'BOB plan']);
    } finally {
      net.close();
    }
  });

  it('keeps both pivots two people insert at once, each on its own sheet', () => {
    const [net, ann, bob] = trio();

    try {
      ann.commit([cellAt('Sheet1', 0, 0, 'Region'), cellAt('Sheet1', 1, 0, 'North')]);
      net.settle();
      ann.commit(pivotOn('Pivot 1', 1));
      bob.commit(pivotOn('Pivot 1', 1));

      const pictures = settledPictures(net);

      expect(pictures).toEqual(pictures.map(() => pictures[0]));
      expect(pivotsOf(bob)).toEqual(['Sheet1:', 'Pivot 2:PivotTable1', 'Pivot 1:PivotTable1']);
      expect(pivotsOf(ann)).toEqual(pivotsOf(bob));
    } finally {
      net.close();
    }
  });

  it('keeps both tables two people make under one automatic name and the formulas of each on its own', () => {
    const [net, ann, bob] = trio();

    try {
      ann.commit([
        cellAt('Sheet1', 0, 0, 'Item'),
        cellAt('Sheet1', 0, 1, 'Sum'),
        cellAt('Sheet1', 0, 3, 'Item'),
        cellAt('Sheet1', 0, 4, 'Sum'),
      ]);

      net.settle();
      ann.commit([tableOf(ann, 'A1:B3')]);
      bob.commit([tableOf(bob, 'D1:E3')]);

      bob.commit([
        {
          kind: 'setCells',
          sheet: 'Sheet1',
          cells: [formulaCell(5, 4, '=ROWS(Table1[Sum])')],
        },
      ]);

      const pictures = settledPictures(net);

      expect(pictures).toEqual(pictures.map(() => pictures[0]));
      expect(tableNames(bob)).toEqual(['Table1@0', 'Table2@3']);
      expect(bob.text('Sheet1', 5, 4)).toBe('=ROWS(Table2[Sum])');

      bob.undo();
      bob.undo();

      const undone = settledPictures(net);

      expect(undone).toEqual(undone.map(() => undone[0]));
      expect(tableNames(ann)).toEqual(['Table1@0']);
    } finally {
      net.close();
    }
  });
});

describe('a book three people change over a random network', () => {
  it(
    'ends the same for everyone and for a newcomer after cells, lines, sheets, names, merges, undo and lost connections',
    () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.array(NET_MOVE, { minLength: FEWEST_MOVES, maxLength: MOVES, size: 'max' }),
          (shared, moves) => {
            const desk: Desk = { net: createBookNetwork(PEOPLE), shared, made: 0 };

            try {
              moves.forEach((move) => {
                played(desk, move);
              });

              desk.net.mend();
              desk.net.settle();

              const pictures = desk.net.clients.map(pictureOf);

              expect(desk.net.clients.map((client) => client.status().kind)).toEqual(
                PEOPLE.map(() => 'online'),
              );

              expect(pictures).toEqual(pictures.map(() => pictures[0]));
              expect(desk.net.newcomer()).toBe(clientOf(desk, 0).dump());
              expect(columnsOf(clientOf(desk, 0))).toBe(columnsOf(clientOf(desk, 1)));
            } finally {
              desk.net.close();
            }
          },
        ),
        { numRuns: RUNS },
      );
    },
    PROPERTY_TIMEOUT,
  );
});
