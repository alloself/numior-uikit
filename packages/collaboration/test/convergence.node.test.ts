import {
  deleteSelection,
  joinBackward,
  joinForward,
  liftListItem,
  moveChild,
  redo,
  setBlockType,
  sinkListItem,
  splitBlock,
  splitListItem,
  textSelection,
  toggleList,
  toggleMark,
  toggleWrapper,
  undo,
  type Command,
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

type PeerAction = (typeof PeerAction)[keyof typeof PeerAction];

interface PeerMove {
  readonly who: number;
  readonly action: PeerAction;
  readonly anchor: number;
  readonly head: number;
  readonly ranged: boolean;
  readonly from: number;
  readonly to: number;
}

const PeerAction = {
  Send: 'send',
  Receive: 'receive',
  Cut: 'cut',
  Relink: 'relink',
  Late: 'late',
  Type: 'type',
  Move: 'move',
  Split: 'split',
  SplitItem: 'splitItem',
  JoinBackward: 'joinBackward',
  JoinForward: 'joinForward',
  Delete: 'delete',
  Heading: 'heading',
  Paragraph: 'paragraph',
  Code: 'code',
  Bullets: 'bullets',
  Ordered: 'ordered',
  Todo: 'todo',
  Quote: 'quote',
  Sink: 'sink',
  Lift: 'lift',
  Bold: 'bold',
  Undo: 'undo',
  Redo: 'redo',
} as const;

const PEER_COMMANDS: Readonly<Partial<Record<PeerAction, Command>>> = {
  split: splitBlock,
  splitItem: splitListItem,
  joinBackward,
  joinForward,
  delete: deleteSelection,
  heading: setBlockType('heading', { level: 2 }),
  paragraph: setBlockType('paragraph'),
  code: setBlockType('code_block'),
  bullets: toggleList('bullet_list'),
  ordered: toggleList('ordered_list'),
  todo: toggleList('todo_list'),
  quote: toggleWrapper('blockquote'),
  sink: sinkListItem,
  lift: liftListItem,
  bold: toggleMark('bold'),
  undo,
  redo,
};

const EDITS = [
  PeerAction.Move,
  PeerAction.Split,
  PeerAction.SplitItem,
  PeerAction.JoinBackward,
  PeerAction.JoinForward,
  PeerAction.Delete,
  PeerAction.Heading,
  PeerAction.Paragraph,
  PeerAction.Code,
  PeerAction.Bullets,
  PeerAction.Ordered,
  PeerAction.Todo,
  PeerAction.Quote,
  PeerAction.Sink,
  PeerAction.Lift,
  PeerAction.Bold,
  PeerAction.Undo,
  PeerAction.Redo,
] as const;

const PEERS = ['ann', 'bob', 'cid'];

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

    if (spot === undefined) {
      return;
    }

    client.edit((tr) => {
      act(tr, spot);
    });
  };

const typing = (at: number, text: string): Change =>
  atSpot(at, (tr, spot) => {
    tr.insertText(text, spot.pos);
  });

const removing = (at: number, size: number): Change =>
  atSpot(at, (tr, spot) => {
    const to = Math.min(spot.end, spot.pos + size);

    if (to <= spot.pos) {
      return;
    }

    tr.delete(spot.pos, to);
  });

const bolding = (at: number, size: number): Change =>
  atSpot(at, (tr, spot) => {
    const to = Math.min(spot.end, spot.pos + size);

    if (to <= spot.pos || !spot.marked) {
      return;
    }

    tr.addMark(spot.pos, to, BOLD);
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

    if (spot === undefined) {
      return;
    }

    client.edit((tr) => {
      tr.insertText(OWN_MARK, spot.pos);
    });
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

const PEER_MOVE: fc.Arbitrary<PeerMove> = fc.record({
  who: fc.nat({ max: PEERS.length - 1 }),
  action: fc.oneof(
    { weight: 4, arbitrary: fc.constant(PeerAction.Send) },
    { weight: 4, arbitrary: fc.constant(PeerAction.Receive) },
    { weight: 4, arbitrary: fc.constant(PeerAction.Type) },
    {
      weight: 1,
      arbitrary: fc.constantFrom(PeerAction.Cut, PeerAction.Relink, PeerAction.Late),
    },
    {
      weight: 9,
      arbitrary: fc.constantFrom(...EDITS),
    },
  ),
  anchor: fc.nat(),
  head: fc.nat(),
  ranged: fc.nat({ max: 3 }).map((pick) => pick === 0),
  from: fc.nat(),
  to: fc.nat(),
});

const linkMoved = (client: NetworkClient, action: PeerAction): boolean => {
  switch (action) {
    case PeerAction.Send:
      client.toServer();
      return true;
    case PeerAction.Receive:
      client.toClient();
      return true;
    case PeerAction.Cut:
      client.cut();
      return true;
    case PeerAction.Relink:
      client.relink();
      return true;
    case PeerAction.Late:
      client.late();
      return true;
    default:
      return false;
  }
};

const peerCommand = (client: NetworkClient, move: PeerMove, at: number): Command | undefined => {
  switch (move.action) {
    case PeerAction.Type:
      return (state, dispatch) => {
        dispatch?.(state.tr.insertText('x', at));
        return true;
      };
    case PeerAction.Move: {
      const { root } = client.state().doc;
      const blocks = Math.max(1, root.content.length);

      return moveChild(root.id, move.from % blocks, move.to % blocks);
    }
    default:
      return PEER_COMMANDS[move.action];
  }
};

const peerPlayed = (network: CollabNetwork, move: PeerMove): void => {
  const client = network.clients[move.who];

  if (client === undefined || linkMoved(client, move.action)) {
    return;
  }

  const spots = textSpots(client.state().doc);
  const anchor = spots[move.anchor % Math.max(1, spots.length)]?.pos;

  if (anchor === undefined) {
    return;
  }

  const head = move.ranged ? (spots[move.head % spots.length]?.pos ?? anchor) : anchor;

  const command = peerCommand(client, move, anchor);

  if (command === undefined) {
    return;
  }

  client.edit((tr) => {
    tr.setSelection(textSelection(anchor, head));
  });

  client.run(command);
};

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

            if (client === undefined) {
              continue;
            }

            action(client);
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

  it('brings three clients to one valid document through real commands and broken links', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.array(PEER_MOVE, { maxLength: 40, size: 'max' }),
        (seed, moves) => {
          const network = createNetwork(generateDoc(fixtureSchema, { blocks: 8, seed }), PEERS);

          moves.forEach((move) => {
            peerPlayed(network, move);
          });

          network.mend();
          network.settle();
          network.close();

          for (const doc of network.docs()) {
            expect(doc).toEqual(network.server());
          }
          for (const client of network.clients) {
            expect(client.status().kind).toBe(CollabStatusKind.Online);
            expect(fixtureSchema.check(client.state().doc.root).ok).toBe(true);
          }
        },
      ),
      { numRuns: 150 },
    );
  });
});
