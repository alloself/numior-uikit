import {
  moveChild,
  redo,
  splitBlock,
  textSelection,
  undo,
  type Doc,
  type Mark,
  type Transaction,
} from '@numior/editor-core';
import { fixtureSchema, generateDoc } from '@numior/editor-core/fixtures';
import * as fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { CollabStatusKind } from '../src';
import {
  createNetwork,
  paragraphs,
  type CollabNetwork,
  type NetworkClient,
} from './harness/network';

type Change = (client: NetworkClient) => void;

interface Round {
  readonly at: number;
  readonly size: number;
  readonly inside: readonly number[];
  readonly undos: number;
  readonly redos: number;
}

interface TextSpot {
  readonly pos: number;
  readonly end: number;
  readonly marked: boolean;
}

const BOLD: Mark = { type: 'bold', attrs: {} };

const OWN_MARK = '§';

const WORD_MARK = '¤';

const textSpots = (doc: Doc): readonly TextSpot[] => {
  const spots: TextSpot[] = [];

  doc.nodesBetween(0, doc.size, (node, pos) => {
    const type = node.kind === 'element' ? fixtureSchema.nodes.get(node.type) : undefined;

    if (node.kind === 'element' && type?.inlineContent === true) {
      for (let offset = pos + 1; offset <= pos + node.size - 1; offset += 1) {
        spots.push({ pos: offset, end: pos + node.size - 1, marked: type.marks.has(BOLD.type) });
      }
    }
    return true;
  });

  return spots;
};

const atSpot =
  (at: number, act: (tr: Transaction, spot: TextSpot) => void): Change =>
  (client) => {
    const spots = textSpots(client.state().doc);
    const spot = spots[at % Math.max(1, spots.length)];

    if (spot !== undefined) {
      client.edit((tr) => {
        act(tr, spot);
      });
    }
  };

const typing = (at: number, text: string): Change =>
  atSpot(at, (tr, spot) => {
    tr.insertText(text, spot.pos);
  });

const removing = (at: number, size: number): Change =>
  atSpot(at, (tr, spot) => {
    const to = Math.min(spot.end, spot.pos + size);

    if (to > spot.pos) {
      tr.delete(spot.pos, to);
    }
  });

const bolding = (at: number, size: number): Change =>
  atSpot(at, (tr, spot) => {
    const to = Math.min(spot.end, spot.pos + size);

    if (to > spot.pos && spot.marked) {
      tr.addMark(spot.pos, to, BOLD);
    }
  });

const splitting =
  (at: number): Change =>
  (client) => {
    atSpot(at, (tr, spot) => {
      tr.setSelection(textSelection(spot.pos));
    })(client);

    client.run(splitBlock);
  };

const moving =
  (from: number, to: number): Change =>
  (client) => {
    const { root } = client.state().doc;
    const blocks = Math.max(1, root.content.length);

    client.run(moveChild(root.id, from % blocks, to % blocks));
  };

const lettersOf = (doc: Doc): number => doc.textBetween(0, doc.size, '').length;

const typed = (client: NetworkClient, change: Change): number => {
  const before = lettersOf(client.state().doc);

  change(client);

  return lettersOf(client.state().doc) - before;
};

const sending: Change = (client) => {
  client.toServer();
};

const receiving: Change = (client) => {
  client.toClient();
};

const cutting: Change = (client) => {
  client.cut();
};

const relinking: Change = (client) => {
  client.relink();
};

const lagging: Change = (client) => {
  client.late();
};

const linkArbitrary = fc.constantFrom(cutting, relinking, lagging);

const breaking = (actions: fc.Arbitrary<Change>): fc.Arbitrary<Change> =>
  fc.oneof({ weight: 8, arbitrary: actions }, { weight: 2, arbitrary: linkArbitrary });

const movingArbitrary = fc.tuple(fc.nat(), fc.nat()).map(([from, to]) => moving(from, to));

const typingArbitrary = fc
  .tuple(fc.nat(), fc.string({ minLength: 1, maxLength: 3, unit: 'grapheme-ascii' }))
  .map(([at, text]) => typing(at, text));

const carryArbitrary = fc.oneof(
  { weight: 3, arbitrary: typingArbitrary },
  { weight: 2, arbitrary: movingArbitrary },
  { weight: 1, arbitrary: fc.nat().map(splitting) },
  { weight: 2, arbitrary: fc.constant(sending) },
  { weight: 2, arbitrary: fc.constant(receiving) },
);

const marksIn = (doc: Doc): number => doc.textBetween(0, doc.size, '').split(OWN_MARK).length - 1;

const insideWord =
  (at: number): Change =>
  (client) => {
    const { doc } = client.state();

    const inside = textSpots(doc).filter(
      (spot) => doc.textBetween(spot.pos - 1, spot.pos + 1, '') === WORD_MARK.repeat(2),
    );

    const spot = inside[at % Math.max(1, inside.length)];

    if (spot !== undefined) {
      client.edit((tr) => {
        tr.insertText(OWN_MARK, spot.pos);
      });
    }
  };

const roundArbitrary = fc.record({
  at: fc.nat(),
  size: fc.integer({ min: 2, max: 4 }),
  inside: fc.array(fc.nat(), { minLength: 1, maxLength: 3 }),
  undos: fc.integer({ min: 1, max: 3 }),
  redos: fc.integer({ min: 0, max: 3 }),
});

const played = (network: CollabNetwork, round: Round): number => {
  const [writer, owner] = network.clients;

  if (writer === undefined || owner === undefined) {
    throw new Error('The network has two clients');
  }

  typing(round.at, WORD_MARK.repeat(round.size))(owner);
  network.settle();

  const before = marksIn(writer.state().doc);

  for (const at of round.inside) {
    insideWord(at)(writer);
  }

  const written = marksIn(writer.state().doc) - before;

  network.settle();

  for (let turn = 0; turn < round.undos; turn += 1) {
    owner.run(undo);
  }
  for (let turn = 0; turn < round.redos; turn += 1) {
    owner.run(redo);
  }

  network.settle();

  return written;
};

const editArbitrary = fc.oneof(
  typingArbitrary,
  movingArbitrary,
  fc.tuple(fc.nat(), fc.integer({ min: 1, max: 6 })).map(([at, size]) => removing(at, size)),
  fc.tuple(fc.nat(), fc.integer({ min: 1, max: 6 })).map(([at, size]) => bolding(at, size)),
  fc.nat().map(splitting),
  fc.constant<Change>((client) => {
    client.run(undo);
  }),
  fc.constant<Change>((client) => {
    client.run(redo);
  }),
);

const actionArbitrary = fc.oneof(
  { weight: 3, arbitrary: editArbitrary },
  { weight: 2, arbitrary: fc.constant(sending) },
  { weight: 2, arbitrary: fc.constant(receiving) },
);

describe('convergence under the server order', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes once what an old connection delivers after its client has come back', () => {
    const network = createNetwork(paragraphs('one'), ['ann', 'bob']);
    const [ann] = network.clients;

    network.settle();

    ann?.edit((tr) => {
      tr.insertText('x', 1);
    });

    ann?.cut();
    ann?.relink();
    network.settle();
    ann?.late();
    network.mend();

    const texts = network.clients.map((client) => client.state().doc.textBetween(0, 5, ''));

    network.close();

    expect(texts).toEqual(['xone', 'xone']);
  });

  it.each([[2], [3]])('brings %i clients to one document through broken links', (count) => {
    const names = ['ann', 'bob', 'cid'].slice(0, count);

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.array(fc.tuple(fc.nat({ max: count - 1 }), breaking(actionArbitrary)), {
          maxLength: 40,
        }),
        (seed, actions) => {
          const network = createNetwork(generateDoc(fixtureSchema, { blocks: 6, seed }), names);

          for (const [index, action] of actions) {
            const client = network.clients[index];

            if (client !== undefined) {
              action(client);
            }
          }
          network.mend();
          network.close();

          for (const doc of network.docs()) {
            expect(doc).toEqual(network.server());
          }
          for (const client of network.clients) {
            expect(client.pending()).toBe(0);
            expect(client.status().kind).toBe(CollabStatusKind.Online);
          }
        },
      ),
      { numRuns: 120 },
    );
  });

  it('keeps the letters someone wrote inside a word while its owner undoes and redoes it', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.array(roundArbitrary, { minLength: 1, maxLength: 5 }),
        (seed, rounds) => {
          const network = createNetwork(generateDoc(fixtureSchema, { blocks: 4, seed }), [
            'ann',
            'bob',
          ]);

          const written = rounds.reduce((marks, round) => marks + played(network, round), 0);

          for (const client of network.clients) {
            expect(marksIn(client.state().doc)).toBe(written);
          }
          for (const doc of network.docs()) {
            expect(doc).toEqual(network.server());
          }
        },
      ),
      { numRuns: 120 },
    );
  });

  it.each([[2], [3]])(
    'keeps every letter typed by %i clients while they carry and split blocks and links break',
    (count) => {
      const names = ['ann', 'bob', 'cid'].slice(0, count);

      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          fc.array(fc.tuple(fc.nat({ max: count - 1 }), breaking(carryArbitrary)), {
            maxLength: 40,
          }),
          (seed, actions) => {
            const start = generateDoc(fixtureSchema, { blocks: 6, seed });
            const network = createNetwork(start, names);

            const written = actions.reduce((letters, [index, action]) => {
              const client = network.clients[index];

              return client === undefined ? letters : letters + typed(client, action);
            }, lettersOf(start));

            network.mend();
            network.close();

            for (const client of network.clients) {
              expect(lettersOf(client.state().doc)).toBe(written);
              expect(client.status().kind).toBe(CollabStatusKind.Online);
            }
            for (const doc of network.docs()) {
              expect(doc).toEqual(network.server());
            }
          },
        ),
        { numRuns: 120 },
      );
    },
  );
});
