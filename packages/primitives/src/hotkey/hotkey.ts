export interface Hotkey {
  readonly key: string;
  readonly keyText: string;
  readonly mod: boolean;
  readonly ctrl: boolean;
  readonly meta: boolean;
  readonly alt: boolean;
  readonly shift: boolean;
}

const MODIFIER_NAMES: Record<string, keyof Omit<Hotkey, 'key' | 'keyText'>> = {
  mod: 'mod',
  ctrl: 'ctrl',
  control: 'ctrl',
  meta: 'meta',
  cmd: 'meta',
  command: 'meta',
  alt: 'alt',
  option: 'alt',
  shift: 'shift',
};

const KEY_ALIASES: Record<string, string> = {
  esc: 'escape',
  space: ' ',
  return: 'enter',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
  plus: '+',
};

export const parseHotkey = (combo: string): Hotkey => {
  const hotkey = {
    key: '',
    keyText: '',
    mod: false,
    ctrl: false,
    meta: false,
    alt: false,
    shift: false,
  };

  for (const part of combo.split('+')) {
    const text = part.trim();
    const name = text.toLowerCase();

    if (name === '') {
      continue;
    }
    const modifier = MODIFIER_NAMES[name];

    if (modifier === undefined) {
      hotkey.key = KEY_ALIASES[name] ?? name;
      hotkey.keyText = text;
    } else {
      hotkey[modifier] = true;
    }
  }
  return hotkey;
};

const physicalKeyOf = (code: string): string | undefined => {
  if (code.length === 4 && code.startsWith('Key')) {
    return code.slice(3).toLowerCase();
  }
  if (code.length === 6 && code.startsWith('Digit')) {
    return code.slice(5);
  }
  return undefined;
};

export const hasModifier = (hotkey: Hotkey): boolean => hotkey.mod || hotkey.ctrl || hotkey.meta;

export const matchesHotkey = (event: KeyboardEvent, hotkey: Hotkey): boolean => {
  if (event.key.toLowerCase() !== hotkey.key && physicalKeyOf(event.code) !== hotkey.key) {
    return false;
  }
  if (event.altKey !== hotkey.alt || event.shiftKey !== hotkey.shift) {
    return false;
  }
  if (hotkey.mod) {
    return event.ctrlKey || event.metaKey;
  }
  return event.ctrlKey === hotkey.ctrl && event.metaKey === hotkey.meta;
};

export const isEditableTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement);
