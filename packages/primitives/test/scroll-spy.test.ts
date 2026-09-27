import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { useScrollSpy } from '../src';
import { captureSetup } from './harness/capture';
import { placeHeadings } from './support/headings';

const headings = (ids: readonly string[]): void => {
  document.body.innerHTML = ids.map((id) => `<h2 id="${id}">${id}</h2>`).join('');
};

const scrolled = (): void => {
  window.dispatchEvent(new Event('scroll'));
};

describe('useScrollSpy', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('marks the last heading above the line and follows the scroll', () => {
    headings(['intro', 'usage', 'api']);
    placeHeadings(document, { intro: 400, usage: 800, api: 1200 });
    const spy = captureSetup(() => useScrollSpy(['intro', 'usage', 'api'])).value;
    expect(spy.activeId.value).toBeUndefined();
    placeHeadings(document, { intro: 10, usage: 410, api: 810 });
    scrolled();
    expect(spy.activeId.value).toBe('intro');
    placeHeadings(document, { intro: -390, usage: 10, api: 410 });
    scrolled();
    expect(spy.activeId.value).toBe('usage');
    placeHeadings(document, { intro: -790, usage: -390, api: 10 });
    scrolled();
    expect(spy.activeId.value).toBe('api');
    placeHeadings(document, { intro: 100, usage: 500, api: 900 });
    scrolled();
    expect(spy.activeId.value).toBe('intro');
  });

  it('measures inside a scroll container against its own line and re-reads changed ids', async () => {
    headings(['a', 'b']);
    const root = document.createElement('div');
    root.append(...document.querySelectorAll('h2'));
    document.body.append(root);

    Object.defineProperty(root, 'getBoundingClientRect', {
      value: () => ({ top: 500, height: 200, bottom: 700, left: 0, right: 0, width: 0 }),
    });

    placeHeadings(root, { a: 505, b: 560 });
    const ids = ref(['a']);
    const spy = captureSetup(() => useScrollSpy(ids, { root, line: 0.5 })).value;
    expect(spy.activeId.value).toBe('a');
    ids.value = ['a', 'b'];
    await nextTick();
    expect(spy.activeId.value).toBe('b');
    placeHeadings(root, { a: 505, b: 620 });
    root.dispatchEvent(new Event('scroll'));
    expect(spy.activeId.value).toBe('a');
  });

  it('keeps an activated heading until the scroll it caused has settled', () => {
    vi.useFakeTimers();
    headings(['a', 'b', 'c']);
    placeHeadings(document, { a: -300, b: -100, c: 10 });
    const spy = captureSetup(() => useScrollSpy(['a', 'b', 'c'])).value;
    expect(spy.activeId.value).toBe('c');
    spy.activate('b');
    expect(spy.activeId.value).toBe('b');
    scrolled();
    vi.advanceTimersByTime(149);
    scrolled();
    vi.advanceTimersByTime(149);
    expect(spy.activeId.value).toBe('b');
    window.dispatchEvent(new Event('scrollend'));
    scrolled();
    expect(spy.activeId.value).toBe('c');
    spy.activate('a');
    vi.advanceTimersByTime(150);
    scrolled();
    expect(spy.activeId.value).toBe('c');
  });
});
