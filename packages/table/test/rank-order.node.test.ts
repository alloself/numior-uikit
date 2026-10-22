import { describe, expect, it } from 'vite-plus/test';
import {
  collatedOrder,
  collationOf,
  collatorOf,
  readRankAnswer,
  readRankMessage,
  unpackDictionary,
} from '../src/engine/rank-order';

const collator = new Intl.Collator('ru', { numeric: true, caseFirst: 'upper' });
const collation = collationOf(collator);

describe('rank messages', () => {
  it('rebuilds the collator in the worker and orders the dictionary as the page would', () => {
    const words = ['item 10', 'Ёж', 'item 2', 'ёж', 'абрикос', 'Banana'];
    const lengths = Uint32Array.from(words, (word) => word.length);
    const unpacked = unpackDictionary(words.join(''), lengths);
    const order = Array.from(collatedOrder(unpacked, collatorOf(collation)));

    expect(unpacked).toEqual(words);
    expect(collation).toMatchObject({ numeric: true, caseFirst: 'upper' });

    expect(order.map((index) => words[index])).toEqual(
      words.toSorted((left, right) => collator.compare(left, right)),
    );
  });

  it('reads only well-formed parts, sort requests and answers', () => {
    const lengths = new Uint32Array([1, 2]);
    const order = new Uint32Array([1, 0]);

    expect(readRankMessage({ kind: 'part', id: 1, text: 'abc' })).toEqual({
      kind: 'part',
      id: 1,
      text: 'abc',
    });

    expect(readRankMessage({ kind: 'sort', id: 2, lengths, collation })).toEqual({
      kind: 'sort',
      id: 2,
      lengths,
      collation,
    });

    expect(
      [
        null,
        { kind: 'part', id: '1', text: 'abc' },
        { kind: 'part', id: 1, text: 3 },
        { kind: 'sort', id: 2, lengths: [1, 2], collation },
        { kind: 'sort', id: 2, lengths, collation: { ...collation, sensitivity: 'loud' } },
        { kind: 'sort', id: 2, lengths, collation: { ...collation, caseFirst: 'mixed' } },
        { kind: 'sort', id: 2, lengths, collation: { ...collation, numeric: 'yes' } },
        { kind: 'sort', id: 2, lengths, collation: null },
        { kind: 'other', id: 3 },
      ].map(readRankMessage),
    ).toEqual(Array.from({ length: 9 }, () => undefined));

    expect(readRankAnswer({ id: 4, order })).toEqual({ id: 4, order });
    expect(readRankAnswer({ id: 4, order: [1, 0] })).toBeUndefined();
    expect(readRankAnswer('done')).toBeUndefined();
  });
});
