import {
  anchorsOf,
  commentAnchors,
  createDoc,
  createState,
  moveBlock,
  moveChild,
  selectionRange,
  setAnchor,
  sinkListItem,
  textSelection,
  type Command,
  type Doc,
  type EditorState,
  type ElementNode,
  type Transaction,
  undo,
} from '@numior/editor-core';
import { fixtureSchema } from '@numior/editor-core/fixtures';
import { describe, expect, it } from 'vite-plus/test';
import { createNetwork, paragraphs, type CollabNetwork } from './harness/network';

type Change = (tr: Transaction) => void;

type Race = (network: CollabNetwork, foreign: Change, move: Command) => void;

const INSIDE_SECOND = 11;

const TWO = { from: 5, to: 10 } as const;

const THREE = { from: 10, to: 17 } as const;

const INSIDE_THREE = 12;

const INSIDE_MOVED_ONE = 9;

const INSIDE_NOTE = 8;

const SPLIT_AT = 6;

const IN_WORLD = 9;

const lastToTop = moveChild('root', 2, 0);

const firstToEnd = moveChild('root', 0, 2);

const firstIntoBox = moveBlock({ parent: 'root', index: 0 }, { parent: 'box', index: 1 });

const item = (id: string, text: string): ElementNode =>
  fixtureSchema.element('list_item', {
    id,
    content: [
      fixtureSchema.element('paragraph', {
        id: `${id}-text`,
        content: [fixtureSchema.text(text)],
      }),
    ],
  });

const bullets = (...texts: readonly string[]): Doc =>
  createDoc(
    fixtureSchema,
    fixtureSchema.element(fixtureSchema.top.name, {
      id: 'root',
      content: [
        fixtureSchema.element('bullet_list', {
          id: 'list',
          content: texts.map((text, index) => item(`i${index.toString()}`, text)),
        }),
      ],
    }),
  );

const applied = (state: EditorState, command: Command): EditorState => {
  let next = state;

  command(state, (tr) => {
    next = next.apply(tr);
  });

  return next;
};

const textOf = (doc: Doc): string => doc.textBetween(0, doc.size, '|');

const connected = (doc: Doc): CollabNetwork => {
  const network = createNetwork(doc, ['ann', 'bob']);

  network.settle();

  return network;
};

const peers = (network: CollabNetwork) => {
  const [ann, bob] = network.clients;

  if (ann === undefined || bob === undefined) {
    throw new Error('The network has two clients');
  }

  return { ann, bob };
};

const indentSecond = (network: CollabNetwork): void => {
  const { bob } = peers(network);

  bob.edit((tr) => {
    tr.setSelection(textSelection(INSIDE_SECOND));
  });

  bob.run(sinkListItem);
};

const moveLastToTop = (network: CollabNetwork): void => {
  const { bob } = peers(network);

  bob.edit((tr) => {
    const { root } = tr.doc;
    const last = root.content.at(-1);

    if (last?.kind !== 'element') {
      throw new Error('The document ends with a block');
    }

    const start = tr.doc.size - last.size;

    tr.delete(start, tr.doc.size);
    tr.insert(0, [last]);
  });
};

const foreignFirst: Race = (network, foreign, move) => {
  const { ann, bob } = peers(network);

  ann.edit(foreign);
  ann.toServer();
  bob.run(move);
};

const moveFirst: Race = (network, foreign, move) => {
  const { ann, bob } = peers(network);

  bob.run(move);
  bob.toServer();
  ann.edit(foreign);
};

const paragraph = (id: string, text: string): ElementNode =>
  fixtureSchema.element('paragraph', { id, content: [fixtureSchema.text(text)] });

const boxed = (): Doc =>
  createDoc(
    fixtureSchema,
    fixtureSchema.element(fixtureSchema.top.name, {
      id: 'root',
      content: [
        paragraph('p0', 'one'),
        fixtureSchema.element('callout', { id: 'box', content: [paragraph('n', 'note')] }),
        paragraph('p2', 'three'),
      ],
    }),
  );

const fresh = (): ElementNode =>
  fixtureSchema.element('paragraph', { id: 'new', content: [fixtureSchema.text('NEW')] });

const RACES: readonly (readonly [string, Race])[] = [
  ['reached the server before the move', foreignFirst],
  ['waited behind the move', moveFirst],
];

const FOREIGN: readonly (readonly [string, Change, string])[] = [
  [
    'a block put between the blocks it passed',
    (tr) => {
      tr.insert(TWO.from, [fresh()]);
    },
    'three|one|NEW|two',
  ],
  [
    'the removal of a block it passed',
    (tr) => {
      tr.delete(TWO.from, TWO.to);
    },
    'three|one',
  ],
  [
    'the removal of the carried block',
    (tr) => {
      tr.delete(THREE.from, THREE.to);
    },
    'one|two',
  ],
  [
    'a split of the carried block',
    (tr) => {
      tr.split(INSIDE_THREE + 1);
    },
    'th|ree|one|two',
  ],
  [
    'text typed into the carried block',
    (tr) => {
      tr.insertText('X', INSIDE_THREE);
    },
    'tXhree|one|two',
  ],
];

describe.each(RACES)(
  'a block carried to the top while a change of someone else %s',
  (_name, race) => {
    it.each(FOREIGN)('keeps %s', (_change, foreign, text) => {
      const network = connected(paragraphs('one', 'two', 'three'));

      race(network, foreign, lastToTop);
      network.settle();

      const [left, right] = network.docs();

      expect(textOf(peers(network).bob.state().doc)).toBe(text);

      expect(left).toEqual(right);
    });
  },
);

describe.each(RACES)('a block carried into a container while typing there %s', (_name, race) => {
  it('keeps the typed text and the block inside the container', () => {
    const network = connected(boxed());

    race(
      network,
      (tr) => {
        tr.insertText('X', INSIDE_NOTE);
      },
      firstIntoBox,
    );

    network.settle();

    const { doc } = peers(network).bob.state();
    const [left, right] = network.docs();

    expect(textOf(doc)).toBe('nXote|one|three');

    expect(doc.byId('box')?.content).toHaveLength(2);

    expect(left).toEqual(right);
  });
});

describe('a carried block and the history', () => {
  it('goes back to its place on undo and leaves text typed by someone else meanwhile', () => {
    const network = connected(paragraphs('one', 'two', 'three'));
    const { ann, bob } = peers(network);

    bob.run(lastToTop);
    network.settle();

    ann.edit((tr) => {
      tr.insertText('X', INSIDE_MOVED_ONE);
    });

    network.settle();
    bob.run(undo);
    network.settle();

    const [left, right] = network.docs();

    expect(textOf(ann.state().doc)).toBe('oXne|two|three');

    expect(left).toEqual(right);
  });

  it.each([
    ['the move to the top is sent first', 1],
    ['the move to the end is sent first', 0],
  ])('carries two blocks moved at the same time when %s', (_name, first) => {
    const network = connected(paragraphs('one', 'two', 'three'));
    const { ann, bob } = peers(network);

    ann.run(firstToEnd);
    bob.run(lastToTop);
    network.clients[first]?.toServer();
    network.settle();

    const [left, right] = network.docs();

    expect(textOf(ann.state().doc)).toBe('three|two|one');

    expect(left).toEqual(right);
  });

  it('keeps the nodes it carries: the same ids on every side', () => {
    const network = connected(paragraphs('one', 'two', 'three'));
    const { ann, bob } = peers(network);

    bob.run(lastToTop);
    network.settle();

    expect(ann.state().doc.root.content.map((node) => node.kind === 'element' && node.id)).toEqual([
      'p2',
      'p0',
      'p1',
    ]);
  });
});

describe('text edited in a block that someone else split before the edit arrived', () => {
  it('keeps typed text in the half it was typed into', () => {
    const network = connected(paragraphs('Hello world'));
    const { ann, bob } = peers(network);

    ann.edit((tr) => {
      tr.split(SPLIT_AT);
    });

    ann.toServer();

    bob.edit((tr) => {
      tr.insertText('X', IN_WORLD);
    });

    network.settle();

    const [left, right] = network.docs();

    expect(textOf(bob.state().doc)).toBe('Hello| woXrld');

    expect(left).toEqual(right);
  });

  it('removes the text that was selected and nothing else', () => {
    const network = connected(paragraphs('Hello world'));
    const { ann, bob } = peers(network);

    ann.edit((tr) => {
      tr.split(SPLIT_AT);
    });

    ann.toServer();

    bob.edit((tr) => {
      tr.delete(IN_WORLD, IN_WORLD + 2);
    });

    network.settle();

    const [left, right] = network.docs();

    expect(textOf(bob.state().doc)).toBe('Hello| wod');

    expect(left).toEqual(right);
  });
});

describe('blocks moved by someone else', () => {
  it('keeps the caret in the list item that was indented', () => {
    const network = connected(bullets('one', 'two'));
    const { ann } = peers(network);

    ann.edit((tr) => {
      tr.setSelection(textSelection(INSIDE_SECOND));
    });

    indentSecond(network);
    network.settle();

    const { doc, selection } = ann.state();
    const place = doc.resolve(selectionRange(doc, selection).from);

    expect(place.parent.id).toBe('i1-text');

    expect(place.parentOffset).toBe(1);
  });

  it('keeps text written into a list item that was indented meanwhile', () => {
    const network = connected(bullets('one', 'two'));
    const { ann, bob } = peers(network);

    indentSecond(network);
    bob.toServer();

    ann.edit((tr) => {
      tr.insertText('X', INSIDE_SECOND);
    });

    network.settle();

    expect(textOf(ann.state().doc)).toContain('tXwo');

    const [left, right] = network.docs();

    expect(left).toEqual(right);
  });

  it('keeps text typed by someone else while the indent waited to be sent', () => {
    const network = connected(bullets('one', 'two'));
    const { ann, bob } = peers(network);

    ann.edit((tr) => {
      tr.insertText('X', INSIDE_SECOND);
    });

    ann.toServer();
    indentSecond(network);
    network.settle();

    expect(textOf(bob.state().doc)).toContain('tXwo');

    const [left, right] = network.docs();

    expect(left).toEqual(right);
  });

  it('keeps text written into a block that was carried to the top', () => {
    const network = connected(paragraphs('one', 'two', 'three'));
    const { ann, bob } = peers(network);

    moveLastToTop(network);
    bob.toServer();

    const last = ann.state().doc.size - 5;

    ann.edit((tr) => {
      tr.insertText('X', last);
    });

    network.settle();

    expect(textOf(ann.state().doc).startsWith('tXhree')).toBe(true);

    const [left, right] = network.docs();

    expect(left).toEqual(right);
  });

  it('keeps text typed by someone else while a carried block waited to be sent', () => {
    const network = connected(paragraphs('one', 'two', 'three'));
    const { ann, bob } = peers(network);
    const last = bob.state().doc.size - 5;

    ann.edit((tr) => {
      tr.insertText('X', last);
    });

    ann.toServer();
    bob.run(moveChild('root', 2, 0));
    network.settle();

    expect(textOf(bob.state().doc).startsWith('tXhree')).toBe(true);

    const [left, right] = network.docs();

    expect(left).toEqual(right);
  });

  it('keeps a comment on a list item that was indented', () => {
    const initial = createState({ doc: bullets('one', 'two'), plugins: [commentAnchors] });

    const anchored = applied(initial, setAnchor('t', { kind: 'text', from: 10, to: 13 }));

    const moved = applied(
      anchored.apply(anchored.tr.setSelection(textSelection(INSIDE_SECOND))),
      sinkListItem,
    );

    const anchor = anchorsOf(moved).get('t');

    expect(anchor?.lost).toBe(false);

    expect(
      anchor?.range.kind === 'text' && moved.doc.textBetween(anchor.range.from, anchor.range.to),
    ).toBe('two');
  });
});
