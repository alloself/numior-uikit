import type { BoundRef, ElementCollection, ElementRef } from './collection.types';

const elementOf = (value: unknown): HTMLElement | null => {
  if (value instanceof HTMLElement) {
    return value;
  }

  if (typeof value === 'object' && value !== null && '$el' in value) {
    return value.$el instanceof HTMLElement ? value.$el : null;
  }

  return null;
};

const precedes = (first: HTMLElement, second: HTMLElement): boolean =>
  (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

const inDocumentOrder = (list: readonly HTMLElement[]): boolean =>
  list.every((element, index) => index === 0 || precedes(list[index - 1] ?? element, element));

const byDocumentOrder = (first: HTMLElement, second: HTMLElement): number => {
  if (first === second) {
    return 0;
  }

  return precedes(first, second) ? -1 : 1;
};

export const createCollection = <K = unknown>(): ElementCollection<K> => {
  const members = new Map<K, HTMLElement>();
  const keys = new Map<HTMLElement, K>();
  const refs = new Map<K, BoundRef>();
  let ordered: readonly HTMLElement[] | null = null;

  const set = (key: K, value: unknown): void => {
    const element = elementOf(value);
    const known = members.get(key);

    if (known === element) {
      return;
    }
    if (known !== undefined) {
      keys.delete(known);
    }
    if (element === null) {
      members.delete(key);
    } else {
      members.set(key, element);
      keys.set(element, key);
    }
    ordered = null;
  };

  const release = (key: K, element: HTMLElement | null): void => {
    if (element !== null && members.get(key) === element) {
      set(key, null);
    }
  };

  const ref = (key: K, also?: ElementRef): ElementRef => {
    const known = refs.get(key);

    if (known !== undefined && known.also === also) {
      return known.bound;
    }

    let current: HTMLElement | null = null;

    const bound: ElementRef = (value) => {
      also?.(value);

      const element = elementOf(value);

      if (element !== null) {
        current = element;
        set(key, element);

        return;
      }

      release(key, current);
      current = null;

      if (refs.get(key)?.bound === bound) {
        refs.delete(key);
      }
    };

    refs.set(key, { also, bound });

    return bound;
  };

  const elements = (): readonly HTMLElement[] => {
    if (ordered !== null && inDocumentOrder(ordered)) {
      return ordered;
    }

    ordered = [...members.values()].toSorted(byDocumentOrder);

    return ordered;
  };

  const first = (test: (key: K) => boolean): HTMLElement | undefined =>
    elements().find((element) => {
      const key = keys.get(element);

      return key !== undefined && test(key);
    });

  return {
    ref,
    set,
    release,
    get: (key) => members.get(key),
    elements,
    first,
  };
};
