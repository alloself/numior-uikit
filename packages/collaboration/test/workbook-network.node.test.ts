import {
  EN_FORMULAS,
  columnName,
  parseFormula,
  printFormula,
  type WorkbookStep,
} from '@numior/spreadsheet/core';
import * as fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { createBookNetwork, type BookClient, type BookNetwork } from './harness/workbook-network';

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

const cellStep = (sheet: string, text: string): WorkbookStep => ({
  kind: 'setCells',
  sheet,
  cells: [{ row: 0, col: 0, content: { kind: 'value', value: { kind: 'string', value: text } } }],
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

describe('sheets three people rename, remove and bring back at once', () => {
  it('ends with one book for everyone after a sheet is renamed to its own name among renames and new rows', () => {
    const [net, ann, bob, cat] = trio();

    try {
      cat.commit([cellStep('Sheet1', 'cat1')]);
      cat.toServer();
      cat.commit([rowsStep('Sheet1')]);
      ann.commit([renameStep('Sheet1', 'Tab4')]);
      cat.commit([renameStep('Sheet1', 'Tab4')]);
      bob.commit([renameStep('Sheet1', 'Tab1')]);
      bob.toServer();
      cat.commit([renameStep('Tab4', 'Tab1')]);
      bob.toClient();
      bob.commit([renameStep('Tab1', 'Tab1')]);
      cat.commit([cellStep('Tab1', 'cat2')]);
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
      cat.commit([cellStep('Sheet1', 'cat1')]);
      cat.toServer();
      ann.commit([renameStep('Sheet1', 'Ann')]);
      ann.commit([{ kind: 'addSheet', name: 'Notes', index: 0 }]);
      cat.commit([renameStep('Sheet1', 'Cat')]);
      ann.commit([{ kind: 'removeSheet', name: 'Ann' }]);
      bob.commit([cellStep('Sheet1', 'bob1')]);
      ann.undo();
      cat.commit([nameStep('catName', "='Cat'!$A$1:$B$2")]);
      bob.commit([cellStep('Sheet1', 'bob2')]);

      const pictures = settledPictures(net);

      expect(pictures).toEqual(pictures.map(() => pictures[0]));
      expect(net.newcomer()).toBe(ann.dump());
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
