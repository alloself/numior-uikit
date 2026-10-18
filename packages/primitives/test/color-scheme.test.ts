import { runInThisContext } from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { nextTick } from 'vue';
import {
  colorSchemeScript,
  createNuiConfig,
  useColorScheme,
  type ColorSchemeControl,
} from '../src';
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
    get listeners() {
      return listeners.size;
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
    document.documentElement.removeAttribute('data-nui-theme');
  });

  it('shares one control through the config and cycles light, dark, system', async () => {
    fakeMedia(true);
    const outer: { control?: ColorSchemeControl } = {};

    const inner = captureSetup(() => useColorScheme(), {
      plugins: [createNuiConfig({ colorScheme: { storageKey: 'nui-theme' } })],
      layers: [
        () => {
          outer.control = useColorScheme();
        },
      ],
    }).value;

    expect(inner).toBe(outer.control);
    expect(inner.scheme.value).toBe('system');
    expect(inner.resolved.value).toBe('dark');
    inner.cycle();
    expect(inner.scheme.value).toBe('light');
    await nextTick();
    expect(document.documentElement.getAttribute('data-nui-theme')).toBe('light');
    expect(localStorage.getItem('nui-theme')).toBe('light');
    inner.cycle();
    inner.cycle();
    expect(inner.scheme.value).toBe('system');

    const own = captureSetup(() =>
      useColorScheme({ scope: document.createElement('div'), initial: 'dark' }),
    ).value;

    expect(own).not.toBe(inner);
    expect(own.scheme.value).toBe('dark');
  });

  it('drops the media listener of the shared control when the app unmounts', () => {
    const media = fakeMedia(false);

    const capture = captureSetup(() => useColorScheme(), {
      plugins: [createNuiConfig({ colorScheme: {} })],
    });

    expect(media.listeners).toBe(1);
    capture.wrapper.unmount();
    expect(media.listeners).toBe(0);
  });

  it('keeps the server default during setup and follows storage after mount', () => {
    fakeMedia(false);
    localStorage.setItem('nui-theme', 'dark');

    const captured = captureSetup(
      () => {
        const control = useColorScheme();

        return { control, duringSetup: control.scheme.value };
      },
      { plugins: [createNuiConfig({ colorScheme: { storageKey: 'nui-theme' } })] },
    ).value;

    expect(captured.duringSetup).toBe('system');
    expect(captured.control.scheme.value).toBe('dark');
  });

  it('applies the stored scheme before paint through the head script', () => {
    localStorage.setItem('nui-theme', 'dark');
    runInThisContext(colorSchemeScript('nui-theme'));
    expect(document.documentElement.getAttribute('data-nui-theme')).toBe('dark');
    localStorage.setItem('nui-theme', 'bogus');
    document.documentElement.removeAttribute('data-nui-theme');
    runInThisContext(colorSchemeScript('nui-theme'));
    expect(document.documentElement.hasAttribute('data-nui-theme')).toBe(false);
    runInThisContext(colorSchemeScript('nui-theme', 'light'));
    expect(document.documentElement.getAttribute('data-nui-theme')).toBe('light');
    localStorage.setItem('nui-theme', 'dark');
    runInThisContext(colorSchemeScript('nui-theme', 'light'));
    expect(document.documentElement.getAttribute('data-nui-theme')).toBe('dark');
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
