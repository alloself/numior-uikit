import { afterEach, describe, expect, it } from 'vite-plus/test';
import { placeHeadings } from '../../primitives/test/support/headings';
import { TocDriver } from './drivers/toc';

const IDS = ['install', 'usage', 'basic', 'advanced', 'api'];

const headings = (): void => {
  document.body.innerHTML = IDS.map((id) => `<h2 id="${id}">${id}</h2>`).join('');
  placeHeadings(document, { install: 400, usage: 800, basic: 1200, advanced: 1600, api: 2000 });
};

const scrolled = (): void => {
  window.dispatchEvent(new Event('scroll'));
};

describe('NuiToc', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('lists nested headings as anchor links under a titled navigation landmark', () => {
    headings();
    const toc = TocDriver.mount();
    expect(toc.title).toBe('On this page');
    expect(toc.label).toBe('On this page');
    expect(toc.hrefs).toEqual(['#install', '#usage', '#basic', '#advanced', '#api']);
    expect(toc.depthOf('Usage')).toBe(0);
    expect(toc.depthOf('Basic')).toBe(1);
    expect(toc.currentLabel).toBeUndefined();
  });

  it('marks the section at the line as current and keeps a clicked link through its scroll', async () => {
    headings();
    const toc = TocDriver.mount({ props: { line: 0.5 } });
    placeHeadings(document, { install: -800, usage: -400, basic: 12, advanced: 600, api: 1000 });
    scrolled();
    await toc.wrapper.vm.$nextTick();
    expect(toc.currentLabel).toBe('Basic');
    await toc.click('API');
    expect(toc.emittedSelections).toEqual(['api']);
    expect(toc.currentLabel).toBe('API');
    scrolled();
    await toc.wrapper.vm.$nextTick();
    expect(toc.currentLabel).toBe('API');
  });

  it('speaks the configured language and lets props win', () => {
    const toc = TocDriver.mount({ config: { locale: 'ru-RU' } });
    expect(toc.title).toBe('На странице');
    const custom = TocDriver.mount({ props: { title: 'Contents', label: 'Page outline' } });
    expect(custom.title).toBe('Contents');
    expect(custom.label).toBe('Page outline');
    expect(TocDriver.mount({ props: { title: '' } }).title).toBeUndefined();
  });
});
