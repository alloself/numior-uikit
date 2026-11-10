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
import { describe, expect, it } from 'vite-plus/test';
import { CollabStatusKind } from '../src';
import { createNetwork, type NetworkClient } from './harness/network';

type Change = (client: NetworkClient) => void;

interface TextSpot {
  readonly pos: number;
  readonly end: number;
  readonly marked: boolean;
}

const BOLD: Mark = { type: 'bold', attrs: {} };

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
  it.each([[2], [3]])('brings %i clients to one document', (count) => {
    const names = ['ann', 'bob', 'cid'].slice(0, count);

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.array(fc.tuple(fc.nat({ max: count - 1 }), actionArbitrary), { maxLength: 40 }),
        (seed, actions) => {
          const network = createNetwork(generateDoc(fixtureSchema, { blocks: 6, seed }), names);

          for (const [index, action] of actions) {
            const client = network.clients[index];

            if (client !== undefined) {
              action(client);
            }
          }
          network.settle();

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

  it.each([[2], [3]])(
    'keeps every letter typed by %i clients while they carry and split blocks',
    (count) => {
      const names = ['ann', 'bob', 'cid'].slice(0, count);

      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          fc.array(fc.tuple(fc.nat({ max: count - 1 }), carryArbitrary), { maxLength: 40 }),
          (seed, actions) => {
            const start = generateDoc(fixtureSchema, { blocks: 6, seed });
            const network = createNetwork(start, names);

            const written = actions.reduce((letters, [index, action]) => {
              const client = network.clients[index];

              return client === undefined ? letters : letters + typed(client, action);
            }, lettersOf(start));

            network.settle();

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
