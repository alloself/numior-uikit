import { collationOf, readRankAnswer, type RankMessage } from './rank-order';
import RankWorker from './rank.worker?worker&inline';

export interface RankSession {
  send(text: string): void;
  finish(lengths: Uint32Array): Promise<Uint32Array | undefined>;
}

export interface RankHost {
  open(collator: Intl.Collator): RankSession | undefined;
}

type Answer = (order: Uint32Array | undefined) => void;

const answers = new Map<number, Answer>();
let worker: Worker | null | undefined;
let nextId = 0;

const failAll = (): void => {
  worker?.terminate();
  worker = null;

  for (const answer of answers.values()) {
    answer(undefined);
  }
  answers.clear();
};

const onAnswer = (event: MessageEvent<unknown>): void => {
  const answer = readRankAnswer(event.data);

  if (answer !== undefined) {
    answers.get(answer.id)?.(answer.order);
    answers.delete(answer.id);
  }
};

const createWorker = (): Worker | null => {
  if (typeof Worker !== 'function') {
    return null;
  }
  try {
    const created = new RankWorker();

    created.addEventListener('message', onAnswer);
    created.addEventListener('error', failAll);
    return created;
  } catch {
    return null;
  }
};

const workerOf = (): Worker | null => {
  if (worker === undefined) {
    worker = createWorker();
  }
  return worker;
};

const post = (target: Worker, message: RankMessage, transfer: Transferable[] = []): void => {
  target.postMessage(message, transfer);
};

export const workerRankHost: RankHost = {
  open: (collator) => {
    const target = workerOf();

    if (target === null) {
      return undefined;
    }

    const id = nextId;

    nextId += 1;
    return {
      send: (text) => {
        post(target, { kind: 'part', id, text });
      },
      finish: (lengths) =>
        new Promise((resolve) => {
          if (worker !== target) {
            resolve(undefined);
            return;
          }
          answers.set(id, resolve);

          post(target, { kind: 'sort', id, lengths, collation: collationOf(collator) }, [
            lengths.buffer,
          ]);
        }),
    };
  },
};
