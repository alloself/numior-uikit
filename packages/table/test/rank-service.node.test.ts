import { describe, expect, it } from 'vite-plus/test';
import { collationOf, type RankAnswer } from '../src/engine/rank-order';
import { createRankService, type RankService } from '../src/engine/rank-service';

interface ServiceScene {
  readonly service: RankService;
  readonly answers: RankAnswer[];
  ask(id: number, words: readonly string[]): void;
  sendPart(id: number, text: string): void;
  drop(id: number): void;
  runDeferred(): number;
}

const collation = collationOf(new Intl.Collator('ru', { numeric: true }));

const serviceScene = (): ServiceScene => {
  const answers: RankAnswer[] = [];
  const deferred: Array<() => void> = [];

  const service = createRankService(
    (answer) => {
      answers.push(answer);
    },
    (run) => {
      deferred.push(run);
    },
  );

  const sendPart = (id: number, text: string): void => {
    service.receive({ kind: 'part', id, text });
  };

  return {
    service,
    answers,
    sendPart,
    ask: (id, words) => {
      for (const word of words) {
        sendPart(id, word);
      }

      service.receive({
        kind: 'sort',
        id,
        lengths: Uint32Array.from(words, (word) => word.length),
        collation,
      });
    },
    drop: (id) => {
      service.receive({ kind: 'drop', id });
    },
    runDeferred: () => {
      const run = deferred.shift();

      run?.();
      return deferred.length;
    },
  };
};

const ordersOf = (answers: readonly RankAnswer[]): Array<[number, number[]]> =>
  answers.map((answer) => [answer.id, Array.from(answer.order)]);

describe('rank service', () => {
  it('orders a dictionary sent in parts, one request per turn', () => {
    const scene = serviceScene();

    scene.ask(1, ['item 10', 'item 2', 'item 1']);
    scene.ask(2, ['б', 'а']);
    expect(scene.answers).toEqual([]);

    scene.runDeferred();
    expect(ordersOf(scene.answers)).toEqual([[1, [2, 1, 0]]]);

    scene.runDeferred();

    expect(ordersOf(scene.answers)).toEqual([
      [1, [2, 1, 0]],
      [2, [1, 0]],
    ]);
  });

  it('skips a sort dropped before its turn and forgets the parts of a dropped session', () => {
    const scene = serviceScene();

    scene.ask(1, ['б', 'а']);
    scene.ask(2, ['г', 'в']);
    scene.sendPart(3, 'left behind');
    scene.drop(2);
    scene.drop(3);

    scene.runDeferred();
    scene.runDeferred();
    expect(ordersOf(scene.answers)).toEqual([[1, [1, 0]]]);

    scene.ask(3, ['я', 'ю']);
    scene.runDeferred();
    scene.runDeferred();

    expect(ordersOf(scene.answers)).toEqual([
      [1, [1, 0]],
      [3, [1, 0]],
    ]);
  });
});
