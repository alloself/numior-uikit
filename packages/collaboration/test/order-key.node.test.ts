import * as fc from 'fast-check';
import { describe, expect, it } from 'vite-plus/test';
import { clientTag, isOrderKey, keysBetween } from '../src/yjs/order-key';

const TAGS = [clientTag(1), clientTag(2 ** 32 - 1)];

const isSorted = (keys: readonly string[]): boolean =>
  keys.every((key, index) => index === 0 || (keys[index - 1] ?? '') < key);

describe('order keys', () => {
  it('puts the keys of every insert between their neighbours and keeps the list in order', () => {
    const insert = fc.record({
      at: fc.nat(),
      count: fc.integer({ min: 1, max: 4 }),
      tag: fc.constantFrom(...TAGS),
    });

    fc.assert(
      fc.property(fc.array(insert, { minLength: 1, maxLength: 60 }), (inserts) => {
        let keys: readonly string[] = [];

        for (const { at, count, tag } of inserts) {
          const place = at % (keys.length + 1);
          const added = keysBetween(keys[place - 1], keys[place], count, tag);

          keys = [...keys.slice(0, place), ...added, ...keys.slice(place)];
        }

        expect(isSorted(keys)).toBe(true);
        expect(keys.every(isOrderKey)).toBe(true);
      }),
      { numRuns: 400 },
    );
  });

  it('keeps the keys short when blocks are added one after another at the end', () => {
    const keys: string[] = [];

    for (let index = 0; index < 10_000; index += 1) {
      const [key] = keysBetween(keys.at(-1), undefined, 1, TAGS[0] ?? '');

      keys.push(key ?? '');
    }

    expect(isSorted(keys)).toBe(true);
    expect(keys.reduce((longest, key) => Math.max(longest, key.length), 0)).toBeLessThanOrEqual(12);
  });

  it('gives every client a tag of the same width', () => {
    expect(TAGS.map((tag) => tag.length)).toEqual([6, 6]);
    expect(clientTag(0)).toBe('000000');
  });
});
