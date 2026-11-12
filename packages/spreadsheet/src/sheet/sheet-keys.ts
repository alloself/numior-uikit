export const isKey = (event: KeyboardEvent, code: string, key: string): boolean =>
  event.code === code || event.key.toLowerCase() === key;

const FIELDS = 'input, textarea, select, [contenteditable="true"]';

export const inGrid = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest('[role="grid"]') !== null;

export const inField = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(FIELDS) !== null;
