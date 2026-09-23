// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createToastStore } from '../src';

describe('toast store on the server', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('keeps state without scheduling timers and removes dismissed toasts at once', () => {
    const store = createToastStore();
    const id = store.show({ title: 'Saved' });
    expect(vi.getTimerCount()).toBe(0);
    expect(store.toasts.value).toHaveLength(1);
    store.dismiss(id);
    expect(store.toasts.value).toHaveLength(0);
  });
});
