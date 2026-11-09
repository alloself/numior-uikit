import {
  lineLayoutsOf,
  workbookAuthority,
  type LineLayout,
  type WorkbookStep,
} from '@numior/spreadsheet/core';
import * as fc from 'fast-check';
import { describe, expect, it } from 'vite-plus/test';
import { CollabStatusKind } from '../src';
import {
  SHEET,
  createBookNetwork,
  formulaCell,
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

const network = (): BookNetwork => createBookNetwork(['ann', 'bob']);

const pair = ({ clients: [ann, bob] }: BookNetwork): readonly [BookClient, BookClient] => {
  if (ann === undefined || bob === undefined) {
    throw new Error('the network has two clients');
  }
  return [ann, bob];
};

const resized = (client: BookClient, col: number, size: number): void => {
  const sheet = client.book.sheet(SHEET);

  if (sheet === undefined) {
    throw new Error('the sheet is missing');
  }

  const entries: [number, LineLayout][] = [];

  sheet.layout.cols.forEach((line, layout) => {
    entries.push([line, layout]);
  });

  client.commit([
    {
      kind: 'setLayout',
      sheet: SHEET,
      layout: {
        ...sheet.layout,
        cols: lineLayoutsOf([
          ...entries,
          [
            col,
            {
              size,
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
    },
  ]);
};

const colSize = (client: BookClient, col: number): number | undefined =>
  client.book.sheet(SHEET)?.layout.cols.get(col)?.size;

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
);

describe('workbook steps through the collaboration envelope', () => {
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

  it('has the authority refuse a malformed step and keep the journal', () => {
    const authority = workbookAuthority([seedSheet]);
    const before = authority.snapshot();

    const accepted = authority.apply([{ kind: 'removeSheet', name: SHEET }, { kind: 'nope' }]);

    expect(accepted).toBe(false);
    expect(authority.snapshot()).toEqual(before);
  });

  it('has the authority undo a pack with a refused step', () => {
    const authority = workbookAuthority([seedSheet]);

    const accepted = authority.apply([
      writeCells(valueCell(0, 0, 'written')),
      { kind: 'removeSheet', name: 'Missing' },
    ]);

    expect(accepted).toBe(false);
    expect(authority.apply([{ kind: 'addSheet', name: 'Next', index: 1 }])).toBe(true);
  });

  it(
    'brings every interleaving to one book',
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

            net.settle();

            expect([ann.status(), bob.status()]).toEqual(BOTH_ONLINE);
            expect(ann.dump()).toBe(bob.dump());
          },
        ),
        { numRuns: 150 },
      );
    },
    PROPERTY_TIMEOUT,
  );
});
