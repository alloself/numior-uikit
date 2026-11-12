import { describe, expect, it } from 'vite-plus/test';
import { reactive, readonly } from 'vue';
import { deleteAt, expandPattern, getAt } from '../src/values/access';
import { cloneValue } from '../src/values/clone';
import { isEqualValue } from '../src/values/equal';
import { readsHold, recordReads } from '../src/values/reads';
import { isPrunedFrom, prune } from '../src/core/prune';

class Money {
  constructor(
    readonly amount: number,
    readonly currency: string,
  ) {}

  format(): string {
    return `${this.amount} ${this.currency}`;
  }
}

class Sealed {
  readonly #secret: string;

  constructor(secret: string) {
    this.#secret = secret;
  }

  reveal(): string {
    return this.#secret;
  }
}

class Draft {
  title: string | undefined = undefined;
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

describe('unusual values', () => {
  it('copies a date that holds no time and a record without a prototype', () => {
    const bare = { odd: [1, 3] };

    Object.setPrototypeOf(bare, null);

    const copy = cloneValue({ due: new Date(Number.NaN), bare });

    expect(Number.isNaN(copy.due.getTime())).toBe(true);
    expect(copy.bare).not.toBe(bare);
    expect(copy.bare.odd).toEqual([1, 3]);
    expect(isEqualValue(copy.bare, { odd: [1, 3] })).toBe(true);
  });

  it('tells apart addresses and patterns that differ and never calls two sealed objects equal', () => {
    expect(isEqualValue(new URL('https://a.example'), new URL('https://b.example'))).toBe(false);
    expect(isEqualValue(new URL('https://a.example'), new URL('https://a.example'))).toBe(true);
    expect(isEqualValue(/a/, /b/)).toBe(false);
    expect(isEqualValue(/a/g, /a/i)).toBe(false);
    expect(isEqualValue(/a/g, /a/g)).toBe(true);
    expect(isEqualValue(new Sealed('a'), new Sealed('b'))).toBe(false);
    expect(isEqualValue(new Draft(), new Draft())).toBe(true);
  });
});

const formValues = () => ({
  country: 'fr',
  address: { city: 'Paris', zip: '75001' },
  tags: ['a', 'b'],
  since: new Date(0),
});

describe('read log', () => {
  it('keeps the leaves a check read, not the containers it walked through', () => {
    const log = recordReads(formValues());

    expect(log.view.address.city).toBe('Paris');
    expect(log.view.tags.map((tag) => tag.toUpperCase())).toEqual(['A', 'B']);
    expect(log.view.since.getTime()).toBe(0);

    expect([...log.reads().keys()].toSorted()).toEqual([
      'address.city',
      'since',
      'tags.0',
      'tags.1',
      'tags.length',
    ]);
  });

  it('keeps a container whose keys were listed or probed', () => {
    const log = recordReads(formValues());

    expect(Object.keys(log.view.address)).toEqual(['city', 'zip']);
    expect('state' in log.view.address).toBe(false);
    expect([...log.reads().keys()].toSorted()).toEqual(['address', 'address.state']);
  });

  it('holds while every read value is the same and breaks when one changes', () => {
    const log = recordReads(formValues());

    expect(log.view.address.city).toBe('Paris');

    const reads = log.reads();

    expect(readsHold(reads, { ...formValues(), country: 'de' })).toBe(true);

    expect(readsHold(reads, { ...formValues(), address: { city: 'Lyon', zip: '69001' } })).toBe(
      false,
    );
  });
});

const account = () => ({
  name: 'Ann',
  company: 'Acme',
  contacts: [{ email: 'a@example.com', phone: '1' }, { email: 'b@example.com' }],
});

describe('pruned values', () => {
  it('accepts a copy with hidden paths removed and rejects a value the form never had', () => {
    const original = account();
    const pruned = account();

    prune(pruned, ['company', 'contacts.*.phone', 'contacts.1'], new Set(['contacts.0.phone']));

    expect(pruned).toEqual({
      name: 'Ann',
      contacts: [{ email: 'a@example.com', phone: '1' }, undefined],
    });

    expect(isPrunedFrom(pruned, original)).toBe(true);
    expect(isPrunedFrom({ ...pruned, name: 'Bob' }, original)).toBe(false);
    expect(isPrunedFrom({ ...pruned, extra: 1 }, original)).toBe(false);
    expect(isPrunedFrom({ ...pruned, contacts: {} }, original)).toBe(false);
  });
});
