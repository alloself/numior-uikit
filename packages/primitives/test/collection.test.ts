import { afterEach, describe, expect, it } from 'vite-plus/test';
import { createCollection } from '../src';

const host = document.createElement('div');

document.body.append(host);

const item = (text: string): HTMLElement => {
  const element = document.createElement('button');

  element.textContent = text;
  host.append(element);

  return element;
};

const texts = (elements: readonly HTMLElement[]): (string | null)[] =>
  elements.map((element) => element.textContent);

describe('createCollection', () => {
  afterEach(() => {
    host.replaceChildren();
  });

  it('lists registered elements in document order and follows moves without re-registration', () => {
    const collection = createCollection<string>();
    const first = item('first');
    const second = item('second');
    const third = item('third');

    collection.ref('c')(third);
    collection.ref('a')(first);
    collection.ref('b')(second);
    expect(texts(collection.elements())).toEqual(['first', 'second', 'third']);
    host.prepend(third);
    expect(texts(collection.elements())).toEqual(['third', 'first', 'second']);
    expect(collection.get('b')).toBe(second);
  });

  it('returns the same list while nothing changes and a new one after a change', () => {
    const collection = createCollection<string>();

    collection.ref('a')(item('a'));
    const before = collection.elements();

    expect(collection.elements()).toBe(before);
    collection.ref('b')(item('b'));
    expect(collection.elements()).not.toBe(before);
  });

  it('keeps an element another item took over when the old owner leaves', () => {
    const collection = createCollection<string>();
    const old = item('old');
    const fresh = item('fresh');
    const leaving = collection.ref('lemon');

    leaving(old);
    collection.set('lemon', fresh);
    leaving(null);
    expect(collection.get('lemon')).toBe(fresh);
    collection.release('lemon', old);
    expect(collection.get('lemon')).toBe(fresh);
    collection.release('lemon', fresh);
    expect(collection.get('lemon')).toBeUndefined();
  });

  it('hands the same ref back per key and passes values on to a companion ref', () => {
    const collection = createCollection<string>();
    const seen: unknown[] = [];

    const companion = (value: unknown): void => {
      seen.push(value);
    };

    const element = item('a');

    expect(collection.ref('a', companion)).toBe(collection.ref('a', companion));
    collection.ref('a', companion)(element);
    collection.ref('a', companion)(null);
    expect(seen).toEqual([element, null]);
    expect(collection.elements()).toEqual([]);
  });

  it('finds the first element in document order whose key passes a test', () => {
    const collection = createCollection<string>();

    collection.ref('b')(item('b'));
    collection.ref('a')(item('a'));
    expect(collection.first((key) => key === 'a' || key === 'b')?.textContent).toBe('b');
    expect(collection.first((key) => key === 'z')).toBeUndefined();
  });
});
