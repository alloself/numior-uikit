import { describe, expect, it } from 'vite-plus/test';
import { RevealDriver } from './drivers/reveal';

describe('revealCurrent', () => {
  it('centres the current link when it lies outside the visible part of the sidebar', () => {
    const sidebar = RevealDriver.mount('/page-15');

    sidebar.reveal();
    expect(sidebar.scrollTop).toBe(480);

    sidebar.scrollTo(0);
    sidebar.reveal();
    expect(sidebar.scrollTop).toBe(480);

    sidebar.unmount();
  });

  it('leaves the scroll alone when the current link is already visible', () => {
    const sidebar = RevealDriver.mount('/page-3');

    sidebar.reveal();
    expect(sidebar.scrollTop).toBe(0);

    sidebar.scrollTo(60);
    sidebar.reveal();
    expect(sidebar.scrollTop).toBe(60);

    sidebar.unmount();
  });

  it('does nothing without a current link or without a scrolling ancestor', () => {
    const missing = RevealDriver.mount('/elsewhere');
    const short = RevealDriver.mount('/page-15', false);

    missing.reveal();
    short.reveal();
    expect(missing.scrollTop).toBe(0);
    expect(short.scrollTop).toBe(0);

    missing.unmount();
    short.unmount();
  });
});
