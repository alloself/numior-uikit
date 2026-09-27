import { describe, expect, it } from 'vitest';
import { ApiKeyboardDriver } from './drivers/api-keyboard';

const KEYS = [
  { keys: 'Enter', description: { ru: 'Выбирает.', en: 'Selects.' } },
  { keys: 'Escape', description: { ru: 'Закрывает.', en: 'Closes.' } },
];

describe('ApiKeyboard', () => {
  it('renders one row per key with the description in the page language', () => {
    const keyboard = ApiKeyboardDriver.mount(KEYS, 'ru');
    const english = ApiKeyboardDriver.mount(KEYS, 'en');

    expect(keyboard.rows()).toEqual([
      ['↵', 'Выбирает.'],
      ['Esc', 'Закрывает.'],
    ]);

    expect(english.rows()[1]).toEqual(['Esc', 'Closes.']);
    expect(keyboard.keys()).toEqual(['↵', 'Esc']);
  });
});
