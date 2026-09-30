import { flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useClipboard } from '../src';
import { captureSetup } from './harness/capture';
import { installClipboard, type ClipboardStub } from './support/clipboard';

describe('useClipboard', () => {
  let clipboard: ClipboardStub | undefined;

  afterEach(() => {
    clipboard?.restore();
    clipboard = undefined;
    vi.useRealTimers();
  });

  it('copies through the Clipboard API when the page may write to it', async () => {
    clipboard = installClipboard({ api: 'granted' });
    const control = captureSetup(() => useClipboard()).value;
    await flushPromises();
    expect(control.supported.value).toBe(true);
    expect(await control.copy('hello')).toBe(true);
    expect(clipboard.copies).toEqual(['hello']);
    expect(clipboard.writes).toBe(1);
    expect(clipboard.commands).toBe(0);
  });

  it('falls back to the copy command and reports copied for the configured duration', async () => {
    vi.useFakeTimers();
    clipboard = installClipboard({ api: 'refused' });
    const control = captureSetup(() => useClipboard({ copiedDuration: 500 })).value;
    expect(control.copied.value).toBe(false);
    expect(await control.copy('hello')).toBe(true);
    expect(clipboard.copies).toEqual(['hello']);
    expect(clipboard.commands).toBe(1);
    expect(control.copied.value).toBe(true);
    vi.advanceTimersByTime(499);
    expect(control.copied.value).toBe(true);
    vi.advanceTimersByTime(1);
    expect(control.copied.value).toBe(false);
  });

  it('reports failure when the copy command refuses', async () => {
    clipboard = installClipboard({ api: 'missing', legacy: 'refused' });
    const control = captureSetup(() => useClipboard()).value;
    expect(await control.copy('hello')).toBe(false);
    expect(control.copied.value).toBe(false);
    expect(clipboard.commands).toBe(1);
    expect(clipboard.copies).toEqual([]);
  });

  it('reads the copied duration anew on every copy', async () => {
    vi.useFakeTimers();
    clipboard = installClipboard({ api: 'missing' });
    const duration = ref(500);
    const control = captureSetup(() => useClipboard({ copiedDuration: duration })).value;
    duration.value = 50;
    expect(await control.copy('hello')).toBe(true);
    vi.advanceTimersByTime(49);
    expect(control.copied.value).toBe(true);
    vi.advanceTimersByTime(1);
    expect(control.copied.value).toBe(false);
  });

  it('writes plain text and HTML together and falls back to plain text when refused', async () => {
    clipboard = installClipboard({ api: 'granted' });
    const control = captureSetup(() => useClipboard()).value;
    expect(await control.copyRich({ text: 'a\tb', html: '<table></table>' })).toBe(true);
    expect(clipboard.copies).toEqual(['a\tb']);
    expect(clipboard.htmls).toEqual(['<table></table>']);
    clipboard.restore();
    clipboard = installClipboard({ api: 'refused' });
    const refused = captureSetup(() => useClipboard()).value;
    expect(await refused.copyRich({ text: 'a\tb', html: '<table></table>' })).toBe(true);
    expect(clipboard.copies).toEqual(['a\tb']);
    expect(clipboard.htmls).toEqual([]);
    expect(clipboard.commands).toBe(1);
  });

  it('reports failure when neither the API nor the command can copy', async () => {
    clipboard = installClipboard({ api: 'missing', legacy: false });
    const control = captureSetup(() => useClipboard()).value;
    expect(await control.copy('hello')).toBe(false);
    expect(control.copied.value).toBe(false);
    expect(clipboard.copies).toEqual([]);
  });
});
