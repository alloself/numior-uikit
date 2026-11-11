import {
  createDoc,
  liftAtStart,
  liftListItem,
  sinkListItem,
  splitBlock,
  splitListItem,
  textSelection,
  toggleList,
  type Command,
  type Doc,
  type ElementNode,
} from '@numior/editor-core';
import { fixtureSchema } from '@numior/editor-core/fixtures';
import { describe, expect, it } from 'vite-plus/test';
import { exitEmptyLast } from '../../editor-core/src/commands/blocks';
import { createNetwork, type CollabNetwork, type NetworkClient } from './harness/network';

interface Place {
  readonly block: string;
  readonly offset: number;
}

interface Race {
  readonly doc: Doc;
  readonly command: Command;
  readonly caret: Place;
  readonly typed: Place;
}

type Order = (
  ann: NetworkClient,
  bob: NetworkClient,
  typing: () => void,
  acting: () => void,
) => void;

const ORDERS: readonly (readonly [string, Order])[] = [
  [
    'when the typed text reaches the server first',
    (ann, _bob, typing, acting) => {
      typing();
      ann.toServer();
      acting();
    },
  ],
  [
    'when the command reaches the server first',
    (_ann, bob, typing, acting) => {
      acting();
      bob.toServer();
      typing();
    },
  ],
];

const paragraph = (id: string, text: string): ElementNode =>
  fixtureSchema.element('paragraph', {
    id,
    content: text === '' ? [] : [fixtureSchema.text(text)],
  });

const item = (id: string, text: string, ...rest: readonly ElementNode[]): ElementNode =>
  fixtureSchema.element('list_item', { id, content: [paragraph(`${id}-text`, text), ...rest] });

const list = (id: string, ...items: readonly ElementNode[]): ElementNode =>
  fixtureSchema.element('bullet_list', { id, content: items });

const page = (...blocks: readonly ElementNode[]): Doc =>
  createDoc(
    fixtureSchema,
    fixtureSchema.element(fixtureSchema.top.name, { id: 'root', content: blocks }),
  );

const three = (): Doc => page(list('list', item('a', 'one'), item('b', 'two'), item('c', 'three')));

const nested = (): Doc =>
  page(
    list(
      'list',
      item('a', 'parent', list('sub', item('x', 'first'), item('y', 'second'), item('z', 'third'))),
      item('b', 'next'),
    ),
  );

const quote = (): Doc =>
  page(
    fixtureSchema.element('blockquote', {
      id: 'q',
      content: [paragraph('q0', 'first'), paragraph('q1', 'second'), paragraph('q2', '')],
    }),
  );

const at = (client: NetworkClient, place: Place): number =>
  (client.state().doc.positionOf(place.block) ?? 0) + 1 + place.offset;

const textOf = (client: NetworkClient): string => {
  const { doc } = client.state();

  return doc.textBetween(0, doc.size, '|');
};

const raced = (race: Race, order: Order): CollabNetwork => {
  const network = createNetwork(race.doc, ['ann', 'bob']);
  const [ann, bob] = network.clients;

  network.settle();

  if (ann === undefined || bob === undefined) {
    throw new Error('The network has no two clients');
  }

  order(
    ann,
    bob,
    () => {
      ann.edit((tr) => {
        tr.insertText('ANN', at(ann, race.typed));
      });
    },
    () => {
      bob.edit((tr) => {
        tr.setSelection(textSelection(at(bob, race.caret)));
      });

      bob.run(race.command);
    },
  );

  network.settle();

  return network;
};

const textsOf = (network: CollabNetwork): readonly string[] => network.clients.map(textOf);

const sameDocs = (network: CollabNetwork): boolean => {
  const [first, second] = network.docs();

  return JSON.stringify(first) === JSON.stringify(second);
};

describe.each(ORDERS)(
  'a list item taken out of its list while someone types %s',
  (_name, order) => {
    it('keeps text typed into the item', () => {
      const network = raced(
        {
          doc: three(),
          command: liftListItem,
          caret: { block: 'b-text', offset: 1 },
          typed: { block: 'b-text', offset: 1 },
        },
        order,
      );

      expect(textsOf(network)).toEqual(['one|tANNwo|three', 'one|tANNwo|three']);
      expect(sameDocs(network)).toBe(true);
    });

    it('keeps text typed into the items after it', () => {
      const network = raced(
        {
          doc: three(),
          command: liftListItem,
          caret: { block: 'a-text', offset: 1 },
          typed: { block: 'c-text', offset: 1 },
        },
        order,
      );

      expect(textsOf(network)).toEqual(['one|two|tANNhree', 'one|two|tANNhree']);
      expect(sameDocs(network)).toBe(true);
    });

    it('keeps text typed into the next item when Enter in an empty item ends the list there', () => {
      const doc = page(list('list', item('a', 'one'), item('b', ''), item('c', 'three')));

      const network = raced(
        {
          doc,
          command: splitListItem,
          caret: { block: 'b-text', offset: 0 },
          typed: { block: 'c-text', offset: 1 },
        },
        order,
      );

      expect(textsOf(network)).toEqual(['one|tANNhree', 'one|tANNhree']);
      expect(sameDocs(network)).toBe(true);
    });

    it('keeps text typed into the item that turns from a bullet into a number', () => {
      const network = raced(
        {
          doc: three(),
          command: toggleList('ordered_list'),
          caret: { block: 'b-text', offset: 1 },
          typed: { block: 'b-text', offset: 1 },
        },
        order,
      );

      expect(textsOf(network)).toEqual(['one|tANNwo|three', 'one|tANNwo|three']);
      expect(sameDocs(network)).toBe(true);
    });
  },
);

describe.each(ORDERS)(
  'a nested list item moved a level up while someone types %s',
  (_name, order) => {
    it('keeps text typed into the item', () => {
      const network = raced(
        {
          doc: nested(),
          command: liftListItem,
          caret: { block: 'x-text', offset: 1 },
          typed: { block: 'x-text', offset: 1 },
        },
        order,
      );

      const text = 'parent|fANNirst|second|third|next';

      expect(textsOf(network)).toEqual([text, text]);
      expect(sameDocs(network)).toBe(true);
    });

    it('keeps text typed into the items that become its children', () => {
      const network = raced(
        {
          doc: nested(),
          command: liftListItem,
          caret: { block: 'x-text', offset: 1 },
          typed: { block: 'z-text', offset: 1 },
        },
        order,
      );

      const text = 'parent|first|second|tANNhird|next';

      expect(textsOf(network)).toEqual([text, text]);
      expect(sameDocs(network)).toBe(true);
    });
  },
);

describe.each(ORDERS)(
  'a list item nested under the one before while someone edits it %s',
  (_name, order) => {
    it('keeps a paragraph someone split off inside the item', () => {
      const network = createNetwork(three(), ['ann', 'bob']);
      const [ann, bob] = network.clients;

      network.settle();

      if (ann === undefined || bob === undefined) {
        throw new Error('The network has no two clients');
      }

      order(
        ann,
        bob,
        () => {
          ann.edit((tr) => {
            tr.setSelection(textSelection(at(ann, { block: 'b-text', offset: 1 })));
          });

          ann.run(splitBlock);
        },
        () => {
          bob.edit((tr) => {
            tr.setSelection(textSelection(at(bob, { block: 'b-text', offset: 1 })));
          });

          bob.run(sinkListItem);
        },
      );

      network.settle();

      expect(textsOf(network)).toEqual(['one|t|wo|three', 'one|t|wo|three']);
      expect(sameDocs(network)).toBe(true);
    });
  },
);

describe.each(ORDERS)('a line taken out of a quote while someone types %s', (_name, order) => {
  it('keeps text typed into the first line that Backspace lifts', () => {
    const network = raced(
      {
        doc: quote(),
        command: liftAtStart,
        caret: { block: 'q0', offset: 0 },
        typed: { block: 'q0', offset: 2 },
      },
      order,
    );

    expect(textsOf(network)).toEqual(['fiANNrst|second', 'fiANNrst|second']);
    expect(sameDocs(network)).toBe(true);
  });

  it('keeps text typed into the empty last line that Enter moves below the quote', () => {
    const network = raced(
      {
        doc: quote(),
        command: exitEmptyLast,
        caret: { block: 'q2', offset: 0 },
        typed: { block: 'q2', offset: 0 },
      },
      order,
    );

    expect(textsOf(network)).toEqual(['first|second|ANN', 'first|second|ANN']);
    expect(sameDocs(network)).toBe(true);
  });
});
