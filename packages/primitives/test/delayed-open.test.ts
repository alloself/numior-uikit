import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { ref } from 'vue';
import { useDelayedOpen } from '../src';

describe('useDelayedOpen', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('opens and closes after their delays and lets a later call cancel an earlier one', () => {
    const open = ref(false);
    const delayed = useDelayedOpen(open, { openDelay: 300, closeDelay: 100 });
    delayed.scheduleOpen();
    vi.advanceTimersByTime(299);
    expect(open.value).toBe(false);
    vi.advanceTimersByTime(1);
    expect(open.value).toBe(true);
    delayed.scheduleClose();
    delayed.scheduleOpen();
    vi.advanceTimersByTime(300);
    expect(open.value).toBe(true);
    delayed.scheduleClose();
    vi.advanceTimersByTime(100);
    expect(open.value).toBe(false);
  });

  it('applies immediate actions synchronously and cancel drops pending ones', () => {
    const open = ref(false);
    const delayed = useDelayedOpen(open, { openDelay: 200 });
    delayed.openNow();
    expect(open.value).toBe(true);
    delayed.closeNow();
    expect(open.value).toBe(false);
    delayed.scheduleOpen();
    delayed.cancel();
    vi.advanceTimersByTime(200);
    expect(open.value).toBe(false);
  });
});
