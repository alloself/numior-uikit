import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { useColorScheme } from '../src';
import { captureSetup } from './harness/capture';

const fakeMedia = (matches: boolean) => {
  const listeners = new Set<() => void>();

  const media = {
    matches,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    change(next: boolean) {
      media.matches = next;
      for (const listener of listeners) {
        listener();
      }
    },
  };

  vi.stubGlobal('matchMedia', () => media);
  return media;
};

describe('useColorScheme', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('reads the scope attribute, follows the system and writes changes back', async () => {
    const media = fakeMedia(false);
    const scope = document.createElement('div');
    scope.setAttribute('data-nui-theme', 'system');
    const control = captureSetup(() => useColorScheme({ scope })).value;
    expect(control.scheme.value).toBe('system');
    expect(control.resolved.value).toBe('light');
    media.change(true);
    expect(control.resolved.value).toBe('dark');
    control.set('light');
    await nextTick();
    expect(scope.getAttribute('data-nui-theme')).toBe('light');
    control.toggle();
    expect(control.scheme.value).toBe('dark');
  });

  it('prefers a stored scheme and persists changes under the storage key', async () => {
    fakeMedia(false);
    localStorage.setItem('nui-theme', 'dark');
    const scope = document.createElement('div');
    const control = captureSetup(() => useColorScheme({ scope, storageKey: 'nui-theme' })).value;
    expect(control.scheme.value).toBe('dark');
    control.set('system');
    await nextTick();
    expect(localStorage.getItem('nui-theme')).toBe('system');
    expect(scope.getAttribute('data-nui-theme')).toBe('system');
  });

  it('survives storage that throws', async () => {
    fakeMedia(true);

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    const scope = document.createElement('div');

    const control = captureSetup(() =>
      useColorScheme({ scope, storageKey: 'nui-theme', initial: 'system' }),
    ).value;

    expect(control.resolved.value).toBe('dark');
    control.set('light');
    await nextTick();
    expect(scope.getAttribute('data-nui-theme')).toBe('light');
  });
});
