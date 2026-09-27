import { afterEach, describe, expect, it, vi } from 'vitest';
import { installIntersectionObserver } from '../../primitives/test/harness/scroll-spy';
import { TocDriver } from './drivers/toc';

const headings = (ids: readonly string[]): void => {
  document.body.innerHTML = ids.map((id) => `<h2 id="${id}">${id}</h2>`).join('');
};

describe('NuiToc', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('lists nested headings as anchor links under a titled navigation landmark', () => {
    const spies = installIntersectionObserver();
    headings(['install', 'usage', 'basic', 'advanced', 'api']);
    const toc = TocDriver.mount();
    expect(toc.title).toBe('On this page');
    expect(toc.label).toBe('On this page');
    expect(toc.hrefs).toEqual(['#install', '#usage', '#basic', '#advanced', '#api']);
    expect(toc.depthOf('Usage')).toBe(0);
    expect(toc.depthOf('Basic')).toBe(1);
    expect(toc.currentLabel).toBeUndefined();

    expect(spies.last()?.targets.map((element) => element.id)).toEqual([
      'install',
      'usage',
      'basic',
      'advanced',
      'api',
    ]);
  });

  it('marks the section in view as the current location and reports clicks', async () => {
    const spies = installIntersectionObserver();
    headings(['install', 'usage', 'basic', 'advanced', 'api']);
    const toc = TocDriver.mount({ props: { rootMargin: '-20% 0px' } });
    expect(spies.last()?.rootMargin).toBe('-20% 0px');
    spies.last()?.fire([{ id: 'basic', visible: true, top: 12 }]);
    await toc.wrapper.vm.$nextTick();
    expect(toc.currentLabel).toBe('Basic');
    await toc.click('API');
    expect(toc.emittedSelections).toEqual(['api']);
  });

  it('speaks the configured language and lets props win', () => {
    installIntersectionObserver();
    const toc = TocDriver.mount({ config: { locale: 'ru-RU' } });
    expect(toc.title).toBe('На странице');
    const custom = TocDriver.mount({ props: { title: 'Contents', label: 'Page outline' } });
    expect(custom.title).toBe('Contents');
    expect(custom.label).toBe('Page outline');
    expect(TocDriver.mount({ props: { title: '' } }).title).toBeUndefined();
  });
});
