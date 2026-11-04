import { collatedOrder, collatorOf, readRankMessage, unpackDictionary } from './rank-order';
import { RankMessageKind } from './engine.types';

const parts = new Map<number, string[]>();

self.addEventListener('message', (event: MessageEvent<unknown>) => {
  const message = readRankMessage(event.data);

  if (message === undefined) {
    return;
  }
  if (message.kind === RankMessageKind.Part) {
    const list = parts.get(message.id) ?? [];

    list.push(message.text);
    parts.set(message.id, list);
    return;
  }

  const text = (parts.get(message.id) ?? []).join('');

  parts.delete(message.id);

  const order = collatedOrder(
    unpackDictionary(text, message.lengths),
    collatorOf(message.collation),
  );

  self.postMessage({ id: message.id, order }, { transfer: [order.buffer] });
});
