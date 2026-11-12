import {
  createDoc,
  textSelection,
  type Command,
  type Doc,
  type ElementNode,
  type Transaction,
} from '@numior/editor-core';
import { fixtureSchema } from '@numior/editor-core/fixtures';
import { createNetwork, type CollabNetwork, type NetworkClient } from './network';

export interface Place {
  readonly block: string;
  readonly offset: number;
}

export interface Race {
  readonly doc: Doc;
  readonly command: Command;
  readonly caret: Place;
  readonly typed: Place;
  readonly change?: Change;
}

export type Change = (tr: Transaction, pos: number) => void;

export type Order = (
  ann: NetworkClient,
  bob: NetworkClient,
  typing: () => void,
  acting: () => void,
) => void;

export const ORDERS: readonly (readonly [string, Order])[] = [
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

export const paragraph = (id: string, text: string): ElementNode =>
  fixtureSchema.element('paragraph', {
    id,
    content: text === '' ? [] : [fixtureSchema.text(text)],
  });

export const item = (id: string, text: string, ...rest: readonly ElementNode[]): ElementNode =>
  fixtureSchema.element('list_item', { id, content: [paragraph(`${id}-text`, text), ...rest] });

export const list = (id: string, ...items: readonly ElementNode[]): ElementNode =>
  fixtureSchema.element('bullet_list', { id, content: items });

export const page = (...blocks: readonly ElementNode[]): Doc =>
  createDoc(
    fixtureSchema,
    fixtureSchema.element(fixtureSchema.top.name, { id: 'root', content: blocks }),
  );

const typeText: Change = (tr, pos) => {
  tr.insertText('ANN', pos);
};

export const splitLine: Change = (tr, pos) => {
  tr.split(pos);
};

export const at = (client: NetworkClient, place: Place): number =>
  (client.state().doc.positionOf(place.block) ?? 0) + 1 + place.offset;

const textOf = (client: NetworkClient): string => {
  const { doc } = client.state();

  return doc.textBetween(0, doc.size, '|');
};

export const pairOf = (network: CollabNetwork): readonly [NetworkClient, NetworkClient] => {
  const [ann, bob] = network.clients;

  if (ann === undefined || bob === undefined) {
    throw new Error('The network has no two clients');
  }
  return [ann, bob];
};

export const raced = (race: Race, order: Order): CollabNetwork => {
  const network = createNetwork(race.doc, ['ann', 'bob']);
  const [ann, bob] = pairOf(network);

  network.settle();

  order(
    ann,
    bob,
    () => {
      ann.edit((tr) => {
        (race.change ?? typeText)(tr, at(ann, race.typed));
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

export const textsOf = (network: CollabNetwork): readonly string[] => network.clients.map(textOf);

export const sameDocs = (network: CollabNetwork): boolean => {
  const [first, second] = network.docs();

  return JSON.stringify(first) === JSON.stringify(second);
};
