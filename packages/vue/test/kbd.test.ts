import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { KbdDriver } from './drivers/kbd';

const platform = (value: string): void => {
  vi.stubGlobal('navigator', { platform: value });
};

describe('NuiKbd', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders a combo as one key per box with platform modifiers', async () => {
    platform('Linux x86_64');
    const kbd = KbdDriver.mount({ props: { keys: 'mod+shift+k' } });
    expect(kbd.keys).toEqual(['Ctrl', 'Shift', 'K']);
    expect(kbd.hasModifier('size-md')).toBe(true);
    expect(kbd.hasModifier('variant-boxed')).toBe(true);

    await kbd.update({ keys: 'mod+shift+k', platform: 'mac' });
    expect(kbd.keys).toEqual(['⇧', '⌘', 'K']);
  });

  it('detects an Apple platform after mount and maps named keys to glyphs', async () => {
    platform('MacIntel');

    const kbd = KbdDriver.mount({
      props: { keys: ['ctrl+enter', 'esc', 'arrowup', 'F5', 'home'] },
    });

    expect(kbd.keys).toEqual(['Ctrl', '↵', 'Esc', '↑', 'F5', 'Home']);

    await kbd.ready();
    expect(kbd.keys).toEqual(['⌃', '↵', 'Esc', '↑', 'F5', 'Home']);
  });

  it('keeps slot content as a single key and renders the plain variant for menus', () => {
    platform('Win32');
    const slotted = KbdDriver.mount({ slot: '⌘C', props: { variant: 'plain', size: 'sm' } });
    expect(slotted.keys).toEqual(['⌘C']);
    expect(slotted.hasModifier('variant-plain')).toBe(true);
    expect(slotted.hasModifier('size-sm')).toBe(true);
    expect(KbdDriver.mount({ props: { keys: '⌘C' } }).keys).toEqual(['⌘C']);
  });

  it('puts the modifiers in the order of the platform', async () => {
    platform('Win32');

    const kbd = KbdDriver.mount({ props: { keys: 'shift+alt+meta+mod+z', variant: 'soft' } });

    const windows = kbd.keys;

    await kbd.update({ keys: 'shift+alt+meta+ctrl+z', platform: 'mac' });

    expect(windows).toEqual(['Win', 'Ctrl', 'Alt', 'Shift', 'Z']);
    expect(kbd.keys).toEqual(['⌃', '⌥', '⇧', '⌘', 'Z']);
    expect(kbd.hasModifier('variant-soft')).toBe(true);
  });
});
