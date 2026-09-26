import { describe, expect, it } from 'vitest';
import { reactive, readonly } from 'vue';
import { deleteAt, expandPattern, getAt } from '../src/values/access';
import { cloneValue } from '../src/values/clone';
import { isEqualValue } from '../src/values/equal';

class Money {
  constructor(
    readonly amount: number,
    readonly currency: string,
  ) {}

  format(): string {
    return `${this.amount} ${this.currency}`;
  }
}

const format = (): string => 'x';

const file = (name: string, lastModified = 1): File =>
  new File(['content'], name, { type: 'text/plain', lastModified });

describe('value access', () => {
  it('reads nested values and misses quietly', () => {
    const source = { items: [{ name: 'a' }], empty: null };

    expect(getAt(source, 'items.0.name')).toBe('a');
    expect(getAt(source, 'items.4.name')).toBeUndefined();
    expect(getAt(source, 'empty.deep')).toBeUndefined();
    expect(getAt(source, '')).toBe(source);
  });

  it('deletes object keys but never shifts array rows', () => {
    const target = { address: { city: 'Paris' }, tags: ['a', 'b'] };

    deleteAt(target, 'address.city');
    deleteAt(target, 'tags.0');
    deleteAt(target, 'tags.9');
    deleteAt(target, 'missing.key');
    expect(target).toEqual({ address: {}, tags: [undefined, 'b'] });
  });

  it('expands a pattern over the rows that exist', () => {
    const source = { items: [{ name: 'a' }, { name: 'b' }, {}], other: 'x' };

    expect(expandPattern(source, 'items.*.name')).toEqual(['items.0.name', 'items.1.name']);
    expect(expandPattern(source, 'other.*')).toEqual([]);
  });
});

describe('value copies', () => {
  it('copies reactive proxies into plain data and keeps dates, files and classes usable', () => {
    const attachment = file('a.txt');

    const source = reactive({
      due: new Date(0),
      attachment,
      price: new Money(5, 'EUR'),
      rows: [1],
    });

    const copy = cloneValue(readonly(source));

    source.rows.push(2);
    expect(copy.rows).toEqual([1]);
    expect(copy.due).not.toBe(source.due);
    expect(copy.due.getTime()).toBe(0);
    expect(copy.attachment).toBe(attachment);
    expect(copy.price.format()).toBe('5 EUR');
  });
});

describe('value copies of collections', () => {
  it('copies maps and keeps set members, functions and files by reference', () => {
    const inner = { n: 1 };
    const member = { id: 1 };
    const attachment = file('b.txt');

    const source = {
      lookup: new Map([['a', inner]]),
      picked: new Set([member]),
      format,
      attachment,
    };

    const copy = cloneValue(source);

    inner.n = 2;
    expect(copy.lookup.get('a')).toEqual({ n: 1 });
    expect(copy.picked).not.toBe(source.picked);
    expect(copy.picked.has(member)).toBe(true);
    expect(copy.format).toBe(format);
    expect(copy.attachment).toBe(attachment);
  });
});

describe('value equality', () => {
  it('treats an undefined key as a missing one and compares nested data by value', () => {
    expect(isEqualValue({ a: 1, b: undefined }, { a: 1 })).toBe(true);
    expect(isEqualValue({ list: [1, { x: 2 }] }, { list: [1, { x: 2 }] })).toBe(true);
    expect(isEqualValue([1, 2], [2, 1])).toBe(false);
    expect(isEqualValue({ a: 1 }, [1])).toBe(false);
    expect(isEqualValue(Number.NaN, Number.NaN)).toBe(true);
  });

  it('compares dates, files, maps, sets and class instances by what they hold', () => {
    expect(isEqualValue(new Date(5), new Date(5))).toBe(true);
    expect(isEqualValue(file('a.txt'), file('a.txt'))).toBe(true);
    expect(isEqualValue(file('a.txt'), file('a.txt', 2))).toBe(false);
    expect(isEqualValue(new Map([['k', { v: 1 }]]), new Map([['k', { v: 1 }]]))).toBe(true);
    expect(isEqualValue(new Set([1, 2]), new Set([2, 1]))).toBe(true);
    expect(isEqualValue(new Set([1]), new Set([2]))).toBe(false);
    expect(isEqualValue(new Money(5, 'EUR'), new Money(5, 'EUR'))).toBe(true);
    expect(isEqualValue(new Money(5, 'EUR'), { amount: 5, currency: 'EUR' })).toBe(false);
  });
});
