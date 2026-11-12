import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { AfterReleaseHarness } from './harness/after-release';

describe('useAfterRelease', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('runs the action at once when no button is held', () => {
    const owner = AfterReleaseHarness.mount();

    owner.ask('menu', false);

    expect(owner.actions).toEqual(['menu']);

    owner.unmount();
  });

  it('keeps the action until the held button is released and the release has been handled', () => {
    const owner = AfterReleaseHarness.mount();

    owner.ask('menu', true);
    owner.settle();
    expect(owner.actions).toEqual([]);

    owner.release();
    expect(owner.actions).toEqual([]);

    owner.settle();
    owner.release();
    owner.settle();
    expect(owner.actions).toEqual(['menu']);

    owner.unmount();
  });

  it('runs the action when the browser takes the pointer away', () => {
    const owner = AfterReleaseHarness.mount();

    owner.ask('menu', true);
    owner.loseThePointer();
    owner.settle();

    expect(owner.actions).toEqual(['menu']);

    owner.unmount();
  });

  it('runs only the last action asked for while the button stays held', () => {
    const owner = AfterReleaseHarness.mount();

    owner.ask('first', true);
    owner.ask('second', true);
    owner.release();
    owner.settle();

    expect(owner.actions).toEqual(['second']);

    owner.unmount();
  });

  it('forgets the action when its owner goes away before the release', () => {
    const owner = AfterReleaseHarness.mount();

    owner.ask('menu', true);
    owner.unmount();
    owner.release();
    owner.settle();

    expect(owner.actions).toEqual([]);
  });

  it('forgets the action when its owner goes away right after the release', () => {
    const owner = AfterReleaseHarness.mount();

    owner.ask('menu', true);
    owner.release();
    owner.unmount();
    owner.settle();

    expect(owner.actions).toEqual([]);
  });
});
