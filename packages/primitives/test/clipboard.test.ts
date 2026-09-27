import { afterEach, describe, expect, it, vi } from 'vitest';
import { useClipboard } from '../src';
import { captureSetup } from './harness/capture';

const fakeClipboard = (writeText: (text: string) => Promise<void>) => {
  vi.stubGlobal('navigator', { clipboard: { writeText } });
};

describe('useClipboard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('copies through the clipboard and reports copied for the configured duration', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn<(text: string) => Promise<void>>(() => Promise.resolve());
    fakeClipboard(writeText);
    const control = captureSetup(() => useClipboard({ copiedDuration: 500 })).value;
    expect(control.supported.value).toBe(true);
    expect(control.copied.value).toBe(false);
    expect(await control.copy('hello')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
    expect(control.copied.value).toBe(true);
    vi.advanceTimersByTime(499);
    expect(control.copied.value).toBe(true);
    vi.advanceTimersByTime(1);
    expect(control.copied.value).toBe(false);
  });

  it('reports failure when the clipboard is missing or refuses', async () => {
    vi.stubGlobal('navigator', {});
    const missing = captureSetup(() => useClipboard()).value;
    expect(missing.supported.value).toBe(false);
    expect(await missing.copy('hello')).toBe(false);
    expect(missing.copied.value).toBe(false);
    fakeClipboard(() => Promise.reject(new Error('denied')));
    const refused = captureSetup(() => useClipboard()).value;
    expect(await refused.copy('hello')).toBe(false);
    expect(refused.copied.value).toBe(false);
  });
});
