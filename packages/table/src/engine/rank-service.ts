import {
  collatedOrder,
  collatorOf,
  readRankMessage,
  unpackDictionary,
  type RankAnswer,
  type RankCollation,
} from './rank-order';
import { RankMessageKind } from './engine.types';

export interface RankService {
  receive(data: unknown): void;
}

interface RankRequest {
  readonly id: number;
  readonly text: string;
  readonly lengths: Uint32Array;
  readonly collation: RankCollation;
}

export const createRankService = (
  answer: (answer: RankAnswer) => void,
  defer: (run: () => void) => void,
): RankService => {
  const parts = new Map<number, string[]>();
  let queue: RankRequest[] = [];
  let scheduled = false;

  const drain = (): void => {
    const request = queue.shift();

    if (request === undefined) {
      scheduled = false;
      return;
    }

    answer({
      id: request.id,
      order: collatedOrder(
        unpackDictionary(request.text, request.lengths),
        collatorOf(request.collation),
      ),
    });

    defer(drain);
  };

  const schedule = (): void => {
    if (scheduled) {
      return;
    }

    scheduled = true;
    defer(drain);
  };

  return {
    receive: (data) => {
      const message = readRankMessage(data);

      switch (message?.kind) {
        case RankMessageKind.Part: {
          const list = parts.get(message.id) ?? [];

          list.push(message.text);
          parts.set(message.id, list);
          break;
        }
        case RankMessageKind.Sort:
          queue.push({
            id: message.id,
            text: (parts.get(message.id) ?? []).join(''),
            lengths: message.lengths,
            collation: message.collation,
          });

          parts.delete(message.id);
          schedule();
          break;
        case RankMessageKind.Drop:
          parts.delete(message.id);
          queue = queue.filter((request) => request.id !== message.id);
          break;
        case undefined:
          break;
      }
    },
  };
};
