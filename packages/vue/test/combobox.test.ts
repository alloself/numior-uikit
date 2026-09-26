import { describe, expect, it } from 'vitest';
import { ComboboxDriver } from './drivers/combobox';

describe('NuiCombobox', () => {
  it('filters options as the user types, points aria-activedescendant at the first match and selects with Enter', async () => {
    const combobox = ComboboxDriver.mount({ field: { label: 'Fruit' } });
    expect(combobox.input.attributes('aria-autocomplete')).toBe('list');
    expect(combobox.input.attributes('aria-controls')).toBe(combobox.listbox.attributes('id'));
    expect(combobox.listbox.attributes('popover')).toBe('manual');
    await combobox.type('lem');
    expect(combobox.expanded).toBe(true);
    expect(combobox.optionLabels).toEqual(['Lemon']);
    expect(combobox.activeLabel).toBe('Lemon');
    expect(combobox.searches).toEqual(['lem']);
    await combobox.press('Enter');
    expect(combobox.value).toBe('lemon');
    expect(combobox.text).toBe('Lemon');
    expect(combobox.expanded).toBe(false);
    expect(combobox.inputFocused).toBe(true);
    combobox.unmount();
  });

  it('opens the full list with ArrowDown, skips disabled options and closes on Escape and Tab', async () => {
    const combobox = ComboboxDriver.mount({ modelValue: 'apple' });
    expect(combobox.text).toBe('Apple');
    await combobox.press('ArrowDown');
    expect(combobox.expanded).toBe(true);
    expect(combobox.optionLabels).toEqual(['Apple', 'Banana', 'Blueberry', 'Lemon', 'Lime']);
    expect(combobox.activeLabel).toBe('Apple');
    await combobox.press('ArrowDown');
    await combobox.press('ArrowDown');
    expect(combobox.activeLabel).toBe('Lemon');
    await combobox.hoverOption('Lime');
    expect(combobox.activeLabel).toBe('Lime');
    expect(await combobox.press('Escape')).toBe(true);
    expect(combobox.expanded).toBe(false);
    expect(combobox.text).toBe('Apple');
    await combobox.press('ArrowUp');
    expect(combobox.activeLabel).toBe('Lime');
    await combobox.press('Tab');
    expect(combobox.expanded).toBe(false);
    combobox.unmount();
  });

  it('shows loading and empty states and clears the active option when nothing matches', async () => {
    const combobox = ComboboxDriver.mount();
    await combobox.receive({ loading: true });
    await combobox.clickField();
    expect(combobox.expanded).toBe(true);
    expect(combobox.inputFocused).toBe(true);
    await combobox.clickToggle();
    expect(combobox.expanded).toBe(false);
    await combobox.clickToggle();
    expect(combobox.expanded).toBe(true);
    expect(combobox.statusText).toBe('Loading');
    expect(combobox.listbox.attributes('aria-busy')).toBe('true');
    await combobox.receive({ loading: false });
    await combobox.type('zzz');
    expect(combobox.optionLabels).toEqual([]);
    expect(combobox.statusText).toBe('No matches');
    expect(combobox.activeLabel).toBeUndefined();
    combobox.unmount();
  });

  it('keeps chips in multiple mode, removes the last one with Backspace and submits hidden inputs', async () => {
    const combobox = ComboboxDriver.mount({
      modelValue: ['apple', 'lemon'],
      props: { multiple: true, name: 'fruits' },
    });

    expect(combobox.chips).toEqual(['Apple', 'Lemon']);
    expect(combobox.hasModifier('multiple')).toBe(true);
    await combobox.type('ba');
    await combobox.press('Enter');
    expect(combobox.value).toEqual(['apple', 'lemon', 'banana']);
    expect(combobox.expanded).toBe(true);
    expect(combobox.text).toBe('');
    await combobox.press('Backspace');
    expect(combobox.value).toEqual(['apple', 'lemon']);
    await combobox.removeChip('Apple');
    expect(combobox.value).toEqual(['lemon']);
    expect(combobox.hiddenValues).toEqual(['lemon']);
    await combobox.clickOption('Lime');
    expect(combobox.value).toEqual(['lemon', 'lime']);
    combobox.unmount();
  });

  it('commits custom text when allowed and otherwise restores the selected label on blur', async () => {
    const free = ComboboxDriver.mount({ custom: true });
    await free.type('Mango');
    await free.press('Enter');
    expect(free.value).toBe('Mango');
    expect(free.text).toBe('Mango');
    expect(free.expanded).toBe(false);
    free.unmount();
    const tags = ComboboxDriver.mount({ custom: true, props: { multiple: true } });
    await tags.type('Nuxt');
    await tags.press('Enter');
    expect(tags.value).toEqual(['Nuxt']);
    expect(tags.chips).toEqual(['Nuxt']);
    tags.unmount();
    const strict = ComboboxDriver.mount({ modelValue: 'apple', props: { clearable: true } });
    await strict.type('xyz');
    await strict.focusOutside();
    expect(strict.value).toBe('apple');
    expect(strict.text).toBe('Apple');
    expect(strict.expanded).toBe(false);
    await strict.clickClear();
    expect(strict.value).toBeUndefined();
    expect(strict.text).toBe('');
    strict.unmount();
  });

  it('speaks the configured language for its buttons, chips and list states', async () => {
    const combobox = ComboboxDriver.mount({
      props: { multiple: true, clearable: true },
      modelValue: ['apple'],
      config: { locale: 'ru-RU' },
    });

    expect(combobox.toggleLabel).toBe('Показать варианты');
    expect(combobox.clearLabel).toBe('Очистить');
    expect(combobox.chipRemoveLabels).toEqual(['Убрать Apple']);
    await combobox.receive({ loading: true });
    expect(combobox.statusText).toBe('Загрузка');
    await combobox.receive({ loading: false, options: [] });
    expect(combobox.statusText).toBe('Ничего не найдено');
    await combobox.receive({ emptyLabel: 'Введите город' });
    expect(combobox.statusText).toBe('Введите город');
    combobox.unmount();
  });

  it('keeps Enter inside an open list, settles typed text before a submit and ignores IME', async () => {
    const combobox = ComboboxDriver.mount({ modelValue: 'banana' });

    await combobox.type('zzz');
    expect(combobox.expanded).toBe(true);
    expect(await combobox.press('Enter')).toBe(true);
    expect(combobox.expanded).toBe(false);
    expect(combobox.text).toBe('zzz');
    expect(await combobox.press('Enter')).toBe(false);
    expect(combobox.text).toBe('Banana');
    expect(combobox.value).toBe('banana');
    await combobox.type('ap');
    expect(await combobox.press('Enter', { isComposing: true })).toBe(false);
    expect(combobox.expanded).toBe(true);
    expect(combobox.value).toBe('banana');
    expect(await combobox.press('Enter')).toBe(true);
    expect(combobox.value).toBe('apple');
    combobox.unmount();
  });
});
