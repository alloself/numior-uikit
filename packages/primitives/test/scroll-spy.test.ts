import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { useScrollSpy } from '../src';
import { captureSetup } from './harness/capture';
import { installIntersectionObserver } from './harness/scroll-spy';

const headings = (ids: readonly string[]): void => {
  document.body.innerHTML = ids.map((id) => `<h2 id="${id}">${id}</h2>`).join('');
};

describe('useScrollSpy', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('follows the first visible heading and keeps the section that scrolled past', () => {
    const spies = installIntersectionObserver();
    headings(['intro', 'usage', 'api']);
    const active = captureSetup(() => useScrollSpy(['intro', 'usage', 'api'])).value;
    const observer = spies.last();
    expect(active.value).toBeUndefined();
    expect(observer?.targets.map((element) => element.id)).toEqual(['intro', 'usage', 'api']);
    expect(observer?.rootMargin).toBe('0px 0px -60% 0px');

    observer?.fire([
      { id: 'intro', visible: true, top: 10 },
      { id: 'usage', visible: true, top: 200 },
      { id: 'api', visible: false, top: 900 },
    ]);

    expect(active.value).toBe('intro');
    observer?.fire([{ id: 'intro', visible: false, top: -50 }]);
    expect(active.value).toBe('usage');
    observer?.fire([{ id: 'usage', visible: false, top: -40 }]);
    expect(active.value).toBe('usage');
    observer?.fire([{ id: 'usage', visible: true, top: 30 }]);
    expect(active.value).toBe('usage');
    observer?.fire([{ id: 'usage', visible: false, top: 700 }]);
    expect(active.value).toBe('intro');
    observer?.fire([{ id: 'intro', visible: false, top: 600 }]);
    expect(active.value).toBeUndefined();
  });

  it('re-observes when the ids change and disconnects on unmount', async () => {
    const spies = installIntersectionObserver();
    headings(['a', 'b']);
    const ids = ref(['a']);
    const capture = captureSetup(() => useScrollSpy(ids, { rootMargin: '-10px' }));
    const first = spies.last();
    expect(first?.targets.map((element) => element.id)).toEqual(['a']);
    expect(first?.rootMargin).toBe('-10px');
    ids.value = ['a', 'b'];
    await nextTick();
    const second = spies.last();
    expect(spies.observers).toHaveLength(2);
    expect(first?.disconnected).toBe(true);
    expect(second?.targets.map((element) => element.id)).toEqual(['a', 'b']);
    second?.fire([{ id: 'b', visible: true, top: 5 }]);
    expect(capture.value.value).toBe('b');
    capture.wrapper.unmount();
    expect(second?.disconnected).toBe(true);
  });

  it('activates the last heading once the scroller reaches its end', () => {
    installIntersectionObserver();
    headings(['a', 'b', 'c']);
    const root = document.createElement('div');
    document.body.append(root);
    Object.defineProperty(root, 'scrollHeight', { value: 300 });
    Object.defineProperty(root, 'clientHeight', { value: 100 });
    root.append(...document.querySelectorAll('h2'));
    const active = captureSetup(() => useScrollSpy(['a', 'b', 'c'], { root })).value;
    root.scrollTop = 120;
    root.dispatchEvent(new Event('scroll'));
    expect(active.value).toBeUndefined();
    root.scrollTop = 200;
    root.dispatchEvent(new Event('scroll'));
    expect(active.value).toBe('c');
  });

  it('stays undefined without an observer', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    headings(['a']);
    const active = captureSetup(() => useScrollSpy(['a'])).value;
    expect(active.value).toBeUndefined();
  });
});
