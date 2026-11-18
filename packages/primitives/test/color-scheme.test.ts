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
import { hydrateSchemeProbe, startedScheme } from './harness/color-scheme';

type MediaListener = (event: { readonly matches: boolean }) => void;

const schemeClasses = (element: Element): string[] =>
  [...element.classList].filter((name) => name.startsWith('nui-theme--'));

const fakeMedia = (matches: boolean) => {
  const listeners = new Set<MediaListener>();

  const media = {
    matches,
    addEventListener: (_type: string, listener: MediaListener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: MediaListener) => listeners.delete(listener),
    change(next: boolean) {
      media.matches = next;
      for (const listener of listeners) {
        listener({ matches: next });
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
    document.documentElement.className = '';
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

    expect(inner.scheme.value).toBe('system');
    expect(inner.resolved.value).toBe('dark');

    inner.cycle();
    expect(inner.scheme.value).toBe('light');
    expect(outer.control?.scheme.value).toBe('light');

    await nextTick();
    expect(schemeClasses(document.documentElement)).toEqual(['nui-theme--light']);
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
    expect(schemeClasses(document.documentElement)).toEqual(['nui-theme--dark']);

    localStorage.setItem('nui-theme', 'bogus');
    document.documentElement.className = '';
    runInThisContext(colorSchemeScript('nui-theme'));
    expect(schemeClasses(document.documentElement)).toEqual([]);

    runInThisContext(colorSchemeScript('nui-theme', 'light'));
    expect(schemeClasses(document.documentElement)).toEqual(['nui-theme--light']);

    localStorage.setItem('nui-theme', 'dark');
    runInThisContext(colorSchemeScript('nui-theme', 'light'));
    expect(schemeClasses(document.documentElement)).toEqual(['nui-theme--dark']);

    document.documentElement.className = 'site nui-theme--light';
    runInThisContext(colorSchemeScript('nui-theme'));
    expect(document.documentElement.className).toBe('site nui-theme--dark');
  });

  it('reads the scope class, follows the system and writes changes back', async () => {
    const media = fakeMedia(false);
    const scope = document.createElement('div');
    scope.className = 'panel nui-theme--system';
    const control = captureSetup(() => useColorScheme({ scope })).value;
    expect(control.scheme.value).toBe('system');
    expect(control.resolved.value).toBe('light');

    media.change(true);
    expect(control.resolved.value).toBe('dark');

    control.set('light');
    await nextTick();
    expect(scope.className).toBe('panel nui-theme--light');

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
    expect(schemeClasses(scope)).toEqual(['nui-theme--system']);
  });

  it('stores nothing on a first visit and follows the system until a scheme is picked', async () => {
    const media = fakeMedia(true);
    const scope = document.createElement('div');
    const control = captureSetup(() => useColorScheme({ scope, storageKey: 'nui-theme' })).value;

    await nextTick();
    expect(localStorage.getItem('nui-theme')).toBeNull();
    expect(control.scheme.value).toBe('system');
    expect(control.resolved.value).toBe('dark');
    expect(schemeClasses(scope)).toEqual(['nui-theme--system']);

    media.change(false);
    await nextTick();
    expect(control.resolved.value).toBe('light');
    expect(localStorage.getItem('nui-theme')).toBeNull();

    control.set('system');
    await nextTick();
    expect(localStorage.getItem('nui-theme')).toBe('system');

    control.scheme.value = 'dark';
    await nextTick();
    expect(localStorage.getItem('nui-theme')).toBe('dark');
  });

  it('keeps a configured default out of storage until the user changes it', async () => {
    fakeMedia(false);

    const control = captureSetup(() => useColorScheme(), {
      plugins: [createNuiConfig({ colorScheme: { storageKey: 'nui-theme', initial: 'dark' } })],
    }).value;

    await nextTick();
    expect(control.scheme.value).toBe('dark');
    expect(schemeClasses(document.documentElement)).toEqual(['nui-theme--dark']);
    expect(localStorage.getItem('nui-theme')).toBeNull();

    control.toggle();
    await nextTick();
    expect(localStorage.getItem('nui-theme')).toBe('light');
  });

  it('hydrates a reader that renders after the shared scheme started with what the server rendered', async () => {
    fakeMedia(true);
    localStorage.setItem('nui-theme', 'dark');

    const probe = await hydrateSchemeProbe(startedScheme());

    expect(probe.server).toBe('<section class="nui-theme--system">light</section>');
    expect(probe.warnings).toEqual([]);
    expect(probe.hydrated).toBe('<section class="nui-theme--dark">dark</section>');
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
    expect(schemeClasses(scope)).toEqual(['nui-theme--light']);
  });
});
