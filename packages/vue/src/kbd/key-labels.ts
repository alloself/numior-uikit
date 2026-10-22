import { parseHotkey, type Hotkey } from '@numior/primitives';
import type { NuiKbdPlatform } from './kbd.types';

const MAC_MODIFIERS = { ctrl: '⌃', alt: '⌥', shift: '⇧', meta: '⌘', mod: '⌘' };
const OTHER_MODIFIERS = { ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift', meta: 'Win', mod: 'Ctrl' };
const MODIFIER_ORDER = ['ctrl', 'alt', 'shift', 'meta', 'mod'] as const;

const KEY_GLYPHS: Record<string, string> = {
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  enter: '↵',
  backspace: '⌫',
  delete: '⌦',
  tab: '⇥',
  escape: 'Esc',
  ' ': 'Space',
};

const keyLabel = (key: string, text: string): string => {
  const glyph = KEY_GLYPHS[key];

  if (glyph !== undefined) {
    return glyph;
  }
  if (key.length === 1) {
    return key.toUpperCase();
  }
  return /^[a-z]+$/.test(text) ? text.charAt(0).toUpperCase() + text.slice(1) : text;
};

const comboLabels = (hotkey: Hotkey, platform: NuiKbdPlatform): string[] => {
  const modifiers = platform === 'mac' ? MAC_MODIFIERS : OTHER_MODIFIERS;

  return [
    ...MODIFIER_ORDER.reduce<string[]>((found, name) => {
      if (hotkey[name]) {
        found.push(modifiers[name]);
      }
      return found;
    }, []),
    ...(hotkey.key === '' ? [] : [keyLabel(hotkey.key, hotkey.keyText)]),
  ];
};

export const keyLabels = (
  keys: string | readonly string[] | undefined,
  platform: NuiKbdPlatform,
): string[] => {
  if (keys === undefined) {
    return [];
  }
  if (typeof keys === 'string') {
    return comboLabels(parseHotkey(keys), platform);
  }
  return keys.flatMap((key) => comboLabels(parseHotkey(key), platform));
};

export const isApplePlatform = (): boolean =>
  typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.platform);
