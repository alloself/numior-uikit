import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { nextTick, ref } from 'vue';
import { useMediaQuery } from '../src';
import { captureSetup } from './harness/capture';

type MediaListener = (event: { readonly matches: boolean }) => void;

interface FakeMediaList {
  matches: boolean;
  readonly media: string;
  readonly listeners: Set<MediaListener>;
  addEventListener(type: string, listener: MediaListener): void;
  removeEventListener(type: string, listener: MediaListener): void;
  fire(matches: boolean): void;
}

const lists: FakeMediaList[] = [];

const fakeMatchMedia =
  (matching: readonly string[]) =>
  (query: string): FakeMediaList => {
    const listeners = new Set<MediaListener>();

    const list: FakeMediaList = {
      matches: matching.includes(query),
      media: query,
      listeners,
      addEventListener: (_type, listener) => listeners.add(listener),
      removeEventListener: (_type, listener) => listeners.delete(listener),
      fire: (matches) => {
        list.matches = matches;
        for (const listener of listeners) {
          listener({ matches });
        }
      },
    };

    lists.push(list);

    return list;
  };

describe('useMediaQuery', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    lists.length = 0;
  });

  it('starts false, reads the match after mount and follows changes', () => {
    vi.stubGlobal('matchMedia', fakeMatchMedia(['(max-width: 48rem)']));
    const capture = captureSetup(() => useMediaQuery('(max-width: 48rem)'));
    expect(capture.value.value).toBe(true);

    lists[0]?.fire(false);
    expect(capture.value.value).toBe(false);

    capture.wrapper.unmount();
    expect(lists[0]?.listeners.size).toBe(0);
  });

  it('resubscribes when the query changes and stays false without matchMedia', async () => {
    vi.stubGlobal('matchMedia', fakeMatchMedia(['(prefers-reduced-motion: reduce)']));
    const query = ref('(max-width: 48rem)');
    const capture = captureSetup(() => useMediaQuery(query));
    expect(capture.value.value).toBe(false);

    query.value = '(prefers-reduced-motion: reduce)';
    await nextTick();
    expect(capture.value.value).toBe(true);
    expect(lists[0]?.listeners.size).toBe(0);
    expect(lists[1]?.listeners.size).toBe(1);

    capture.wrapper.unmount();

    vi.stubGlobal('matchMedia', undefined);
    const plain = captureSetup(() => useMediaQuery('(max-width: 48rem)'));
    expect(plain.value.value).toBe(false);

    plain.wrapper.unmount();
  });
});
