import {
  anchorsOf,
  commentAnchors,
  createDoc,
  createState,
  moveChild,
  selectionRange,
  setAnchor,
  sinkListItem,
  textSelection,
  type Command,
  type Doc,
  type EditorState,
  type ElementNode,
} from '@numior/editor-core';
import { fixtureSchema } from '@numior/editor-core/fixtures';
import { describe, expect, it } from 'vite-plus/test';
import { createNetwork, paragraphs, type CollabNetwork } from './harness/network';

const INSIDE_SECOND = 11;

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
