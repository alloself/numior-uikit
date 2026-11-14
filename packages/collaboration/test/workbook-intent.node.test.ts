import { columnName, type WorkbookStep } from '@numior/spreadsheet/core';
import * as fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  SHEET,
  WHOLE,
  createBookNetwork,
  formulaCell,
  seedSheet,
  valueCell,
  writeCells,
  type BookClient,
  type BookNetwork,
} from './harness/workbook-network';

interface Place {
  readonly row: number;
  readonly col: number;
}

interface Deed {
  readonly kind: DeedKind;
  readonly token: string;
}

interface Author {
  readonly name: string;
  readonly peer: string;
  readonly client: BookClient;
  done: Deed[];
  written: number;
}

interface Desk {
  readonly net: BookNetwork;
  readonly ann: Author;
  readonly bob: Author;
  readonly seeded: number;
}

interface Kept {
  readonly same: boolean;
  readonly steps: number;
  readonly deeds: number;
  readonly tokens: readonly string[];
  readonly written: readonly string[];
  readonly references: readonly (string | undefined)[];
  readonly referred: readonly (string | undefined)[];
}

type DeedKind = (typeof DeedKind)[keyof typeof DeedKind];

type MoveKind = (typeof MoveKind)[keyof typeof MoveKind];

type Axis = 'rows' | 'cols';

type Move =
  | { readonly kind: typeof MoveKind.Token }
  | { readonly kind: typeof MoveKind.Formula; readonly pick: number }
  | {
      readonly kind: typeof MoveKind.Lines;
      readonly axis: Axis;
      readonly at: number;
      readonly count: number;
    }
  | { readonly kind: typeof MoveKind.Room; readonly count: number }
  | { readonly kind: typeof MoveKind.Undo }
  | { readonly kind: typeof MoveKind.Redo }
  | { readonly kind: typeof MoveKind.Send }
  | { readonly kind: typeof MoveKind.Receive }
  | { readonly kind: typeof MoveKind.Settle }
  | { readonly kind: typeof MoveKind.Cut }
  | { readonly kind: typeof MoveKind.Relink }
  | { readonly kind: typeof MoveKind.Late };

type PlainKind = Exclude<
  MoveKind,
  typeof MoveKind.Formula | typeof MoveKind.Lines | typeof MoveKind.Room
>;

const DeedKind = { Token: 'token', Formula: 'formula', Lines: 'lines' } as const;

const MoveKind = {
  Token: 'token',
  Formula: 'formula',
  Lines: 'lines',
  Room: 'room',
  Undo: 'undo',
  Redo: 'redo',
  Send: 'send',
  Receive: 'receive',
  Settle: 'settle',
  Cut: 'cut',
  Relink: 'relink',
  Late: 'late',
} as const;

const PROPERTY_TIMEOUT = 30_000;

const RUNS = 150;

const UNDO_RUNS = 1000;

const MOVES = 40;

const FORMULA_MARK = '=';

const SEED: readonly WorkbookStep[] = [
  seedSheet,
  writeCells(
    valueCell(0, 0, 'ann'),
    valueCell(0, 1, 'bob'),
    valueCell(0, 2, `ann${FORMULA_MARK}`),
    valueCell(0, 3, `bob${FORMULA_MARK}`),
  ),
];

const authorOf = (name: string, peer: string, client: BookClient | undefined): Author => {
  if (client === undefined) {
    throw new Error(`the network has no ${name}`);
  }
  return { name, peer, client, done: [], written: 0 };
};

const desk = (): Desk => {
  const net = createBookNetwork(['ann', 'bob'], SEED);
  const [ann, bob] = net.clients;

  return {
    net,
    ann: authorOf('ann', 'bob', ann),
    bob: authorOf('bob', 'ann', bob),
    seeded: ann?.document.version() ?? 0,
  };
};

const placesOf = (client: BookClient): Map<string, Place> => {
  const places = new Map<string, Place>();

  client.book.sheet(SHEET)?.cells.forEachInRange(WHOLE, (row, col) => {
    places.set(client.text(SHEET, row, col), { row, col });
  });

  return places;
};

const bottomOf = (places: ReadonlyMap<string, Place>, col: number): number => {
  let bottom = 0;

  places.forEach((place) => {
    if (place.col !== col) {
      return;
    }

    bottom = Math.max(bottom, place.row);
  });

  return bottom;
};

const tokensOf = (author: Author): string[] =>
  author.done.reduce<string[]>((tokens, deed) => {
    if (deed.kind === DeedKind.Token) {
      tokens.push(deed.token);
    }
    return tokens;
  }, []);

const referredOf = (author: Author): string[] => [
  ...author.done.reduce((referred, deed) => {
    if (deed.kind === DeedKind.Formula) {
      referred.add(deed.token);
    }
    return referred;
  }, new Set<string>()),
];

const addressOf = (place: Place): string => `${columnName(place.col)}${String(place.row + 1)}`;

const writeToken = (author: Author): void => {
  const places = placesOf(author.client);
  const head = places.get(author.name);

  if (head === undefined) {
    return;
  }

  const token = `${author.name}${String(author.written)}`;

  author.written += 1;
  author.client.commit([writeCells(valueCell(bottomOf(places, head.col) + 1, head.col, token))]);
  author.done.push({ kind: DeedKind.Token, token });
};

const writeFormula = (author: Author, pick: number): void => {
  const places = placesOf(author.client);
  const tokens = tokensOf(author);
  const token = tokens[pick % Math.max(1, tokens.length)];
  const mark = places.get(`${author.name}${FORMULA_MARK}`);
  const place = token === undefined ? undefined : places.get(token);

  if (token === undefined || mark === undefined || place === undefined) {
    return;
  }

  author.client.commit([writeCells(formulaCell(place.row, mark.col, `=${addressOf(place)}`))]);
  author.done.push({ kind: DeedKind.Formula, token });
};

const addLines = (author: Author, axis: Axis, at: number, count: number): void => {
  author.client.commit([{ kind: 'insertLines', sheet: SHEET, axis, at, count }]);
  author.done.push({ kind: DeedKind.Lines, token: '' });
};

const makeRoom = (author: Author, count: number): void => {
  const places = placesOf(author.client);
  const head = places.get(author.peer);

  if (head === undefined) {
    return;
  }

  addLines(author, 'rows', bottomOf(places, head.col) + 1, count);
};

const settled = (net: BookNetwork, act: () => void): void => {
  net.settle();
  act();
  net.settle();
};

const PLAIN: Readonly<Record<PlainKind, (author: Author, net: BookNetwork) => void>> = {
  [MoveKind.Token]: (author) => {
    writeToken(author);
  },
  [MoveKind.Undo]: (author, net) => {
    settled(net, () => {
      author.client.undo();
    });
  },
  [MoveKind.Redo]: (author, net) => {
    settled(net, () => {
      author.client.redo();
    });
  },
  [MoveKind.Send]: (author) => {
    author.client.toServer();
  },
  [MoveKind.Receive]: (author) => {
    author.client.toClient();
  },
  [MoveKind.Settle]: (_author, net) => {
    net.settle();
  },
  [MoveKind.Cut]: (author) => {
    author.client.cut();
  },
  [MoveKind.Relink]: (author) => {
    author.client.relink();
  },
  [MoveKind.Late]: (author) => {
    author.client.late();
  },
};

const play = (move: Move, author: Author, net: BookNetwork): void => {
  switch (move.kind) {
    case MoveKind.Formula:
      writeFormula(author, move.pick);
      break;
    case MoveKind.Lines:
      addLines(author, move.axis, move.at, move.count);
      break;
    case MoveKind.Room:
      makeRoom(author, move.count);
      break;
    default:
      PLAIN[move.kind](author, net);
  }
};

const keptOf = (author: Author, reader: BookClient, other: BookClient, seeded = 0): Kept => {
  const own = new RegExp(`^${author.name}\\d+$`, 'u');
  const places = placesOf(reader);
  const mark = places.get(`${author.name}${FORMULA_MARK}`);
  const spots = referredOf(author).map((token) => places.get(token));

  return {
    same: reader.dump() === other.dump(),
    steps: (reader.document.version() ?? 0) - seeded,
    deeds: author.done.length,
    tokens: [...places.keys()].filter((text) => own.test(text)).toSorted(),
    written: tokensOf(author).toSorted(),
    references: spots.map((place) =>
      place === undefined || mark === undefined
        ? undefined
        : reader.text(SHEET, place.row, mark.col),
    ),
    referred: spots.map((place) => (place === undefined ? undefined : `=${addressOf(place)}`)),
  };
};

const LINE = fc.integer({ min: 0, max: 8 });

const COUNT = fc.integer({ min: 1, max: 2 });

const linesArbitrary = (axis: Axis): fc.Arbitrary<Move> =>
  fc.tuple(LINE, COUNT).map(([at, count]) => ({ kind: MoveKind.Lines, axis, at, count }));

const roomArbitrary: fc.Arbitrary<Move> = COUNT.map((count) => ({ kind: MoveKind.Room, count }));

const deliveries: fc.WeightedArbitrary<Move>[] = [
  { weight: 2, arbitrary: fc.constant({ kind: MoveKind.Send }) },
  { weight: 2, arbitrary: fc.constant({ kind: MoveKind.Receive }) },
  { weight: 2, arbitrary: fc.constant({ kind: MoveKind.Settle }) },
];

const writerArbitrary: fc.Arbitrary<Move> = fc.oneof(
  { weight: 3, arbitrary: fc.constant({ kind: MoveKind.Token }) },
  { weight: 2, arbitrary: fc.nat().map((pick) => ({ kind: MoveKind.Formula, pick })) },
  { weight: 1, arbitrary: linesArbitrary('rows') },
  { weight: 1, arbitrary: linesArbitrary('cols') },
  { weight: 1, arbitrary: roomArbitrary },
  ...deliveries,
);

const breakerArbitrary: fc.Arbitrary<Move> = fc.oneof(
  { weight: 8, arbitrary: writerArbitrary },
  { weight: 1, arbitrary: fc.constant({ kind: MoveKind.Cut }) },
  { weight: 1, arbitrary: fc.constant({ kind: MoveKind.Relink }) },
  { weight: 1, arbitrary: fc.constant({ kind: MoveKind.Late }) },
);

const undoerArbitrary: fc.Arbitrary<Move> = fc.oneof(
  { weight: 3, arbitrary: roomArbitrary },
  { weight: 3, arbitrary: fc.constant({ kind: MoveKind.Undo }) },
  { weight: 1, arbitrary: fc.constant({ kind: MoveKind.Redo }) },
  { weight: 1, arbitrary: fc.constant({ kind: MoveKind.Token }) },
  { weight: 1, arbitrary: linesArbitrary('rows') },
  ...deliveries,
);

describe('what authors meant in a shared book', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it(
    'keeps every value and every reference to it while rows and columns arrive from both sides and links break',
    () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(fc.boolean(), breakerArbitrary), { maxLength: MOVES }),
          (moves) => {
            const table = desk();
            const { net, ann, bob } = table;

            moves.forEach(([first, move]) => {
              play(move, first ? ann : bob, net);
            });

            net.mend();

            const hers = keptOf(ann, bob.client, ann.client, table.seeded);
            const his = keptOf(bob, ann.client, bob.client, table.seeded);
            const deeds = hers.deeds + his.deeds;
            const late = net.newcomer();

            net.close();

            expect(hers.same).toBe(true);
            expect(late).toBe(ann.client.dump());
            expect([hers.steps, his.steps]).toEqual([deeds, deeds]);
            expect([hers.tokens, his.tokens]).toEqual([hers.written, his.written]);
            expect([hers.references, his.references]).toEqual([hers.referred, his.referred]);
          },
        ),
        { numRuns: RUNS },
      );
    },
    PROPERTY_TIMEOUT,
  );

  it(
    'keeps the work of one author whatever the other one undoes and redoes after reading it',
    () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.oneof(
              fc.tuple(fc.constant(true), undoerArbitrary),
              fc.tuple(fc.constant(false), writerArbitrary),
            ),
            { maxLength: MOVES },
          ),
          (moves) => {
            const { net, ann, bob } = desk();

            moves.forEach(([undoer, move]) => {
              play(move, undoer ? ann : bob, net);
            });

            net.settle();

            const his = keptOf(bob, ann.client, bob.client);
            const late = net.newcomer();

            net.close();

            expect(his.same).toBe(true);
            expect(late).toBe(bob.client.dump());
            expect(his.tokens).toEqual(his.written);
            expect(his.references).toEqual(his.referred);
          },
        ),
        { numRuns: UNDO_RUNS },
      );
    },
    PROPERTY_TIMEOUT,
  );
});
