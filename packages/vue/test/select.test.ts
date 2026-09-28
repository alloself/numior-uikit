import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SelectDriver } from './drivers/select';
import { fieldTextsOf } from './support/field-texts';

describe('NuiSelect', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('is a combobox button labelled by its field that opens a listbox on the selected option', async () => {
    const select = SelectDriver.mount({ modelValue: 'banana', field: { label: 'Fruit' } });
    expect(select.trigger.attributes('aria-haspopup')).toBe('listbox');
    expect(select.trigger.attributes('aria-controls')).toBe(select.listbox.attributes('id'));
    expect(select.labelledBy).toBe(select.fieldLabelId);
    expect(select.valueText).toBe('Banana');
    expect(select.listbox.attributes('popover')).toBe('auto');
    expect(select.groupLabels).toEqual(['Citrus']);
    await select.pressTrigger('ArrowDown');
    expect(select.expanded).toBe(true);
    expect(select.focusedOption).toBe('Banana');
    await select.press('ArrowDown');
    expect(select.focusedOption).toBe('Lemon');
    await select.press('Enter');
    expect(select.value).toBe('lemon');
    expect(select.expanded).toBe(false);
    expect(select.valueText).toBe('Lemon');
    expect(select.triggerFocused).toBe(true);
    select.unmount();
  });

  it('shows the empty state inside the listbox when there are no options', () => {
    const select = SelectDriver.mount({ props: { options: [] } });
    expect(select.emptyText).toBe('No options');
    select.unmount();
    const labelled = SelectDriver.mount({ props: { options: [], emptyLabel: 'Пусто' } });
    expect(labelled.emptyText).toBe('Пусто');
    labelled.unmount();
  });

  it('shows the placeholder without a value and picks options by typeahead while closed', async () => {
    const select = SelectDriver.mount({ props: { placeholder: 'Pick a fruit' } });
    expect(select.valueText).toBe('Pick a fruit');
    expect(select.hasModifier('empty')).toBe(true);
    await select.pressTrigger('l');
    expect(select.value).toBe('lemon');
    expect(select.expanded).toBe(false);
    await select.pressTrigger('l');
    expect(select.value).toBe('lime');
    await select.advance(600);
    await select.pressTrigger('b');
    expect(select.value).toBe('banana');
    select.unmount();
  });

  it('toggles options in multiple mode with Space and click, closes on Enter and submits hidden inputs', async () => {
    const select = SelectDriver.mount({
      modelValue: ['apple'],
      props: { multiple: true, name: 'fruits' },
    });

    expect(select.valueText).toBe('Apple');
    expect(select.listbox.attributes('aria-multiselectable')).toBe('true');
    await select.pressTrigger('ArrowDown');
    expect(select.focusedOption).toBe('Apple');
    await select.press('ArrowDown');
    await select.press(' ');
    expect(select.value).toEqual(['apple', 'banana']);
    expect(select.expanded).toBe(true);
    expect(select.valueText).toBe('2 selected');
    expect(select.selectedLabels).toEqual(['Apple', 'Banana']);
    await select.press('Enter');
    expect(select.expanded).toBe(false);
    expect(select.hiddenValues).toEqual(['apple', 'banana']);
    await select.pressTrigger('ArrowDown');
    await select.clickOption('Apple');
    expect(select.value).toEqual(['banana']);
    expect(select.expanded).toBe(true);
    select.unmount();
  });

  it('clears through its button, ignores disabled options and reports invalid and disabled states', async () => {
    const select = SelectDriver.mount({
      modelValue: 'lime',
      props: { clearable: true, invalid: true },
    });

    expect(select.hasModifier('invalid')).toBe(true);
    expect(select.clearButton.exists()).toBe(true);
    await select.pressTrigger('ArrowDown');
    await select.clickOption('Blueberry');
    expect(select.value).toBe('lime');
    await select.clickClear();
    expect(select.value).toBeNull();
    expect(select.clearButton.exists()).toBe(false);
    select.unmount();
    const off = SelectDriver.mount({ props: { disabled: true } });
    expect(off.hasModifier('disabled')).toBe(true);
    expect(off.trigger.element.disabled).toBe(true);
    await off.pressTrigger('ArrowDown');
    expect(off.expanded).toBe(false);
    off.unmount();
  });

  it('follows the pointer and closes when focus leaves the listbox', async () => {
    const select = SelectDriver.mount({ modelValue: 'apple' });
    await select.pressTrigger('End');
    expect(select.focusedOption).toBe('Lime');
    await select.hoverOption('Lemon');
    expect(select.focusedOption).toBe('Lemon');
    expect(select.activeLabel).toBe('Lemon');
    await select.leaveListbox();
    expect(select.activeLabel).toBe('Apple');
    await select.focusOutside();
    expect(select.expanded).toBe(false);
    select.unmount();
  });

  it('speaks the configured language for the count, the clear button and the empty list', () => {
    const russian = SelectDriver.mount({
      props: { multiple: true, clearable: true },
      modelValue: ['apple', 'banana'],
      config: { locale: 'ru-RU' },
    });

    expect(russian.valueText).toBe('Выбрано: 2');
    expect(russian.clearLabel).toBe('Очистить');
    russian.unmount();

    const empty = SelectDriver.mount({ props: { options: [] }, config: { locale: 'ru-RU' } });
    expect(empty.emptyText).toBe('Нет вариантов');
    empty.unmount();

    const counted = SelectDriver.mount({
      props: { multiple: true, countLabel: (count) => `${count} фрукта` },
      modelValue: ['apple', 'banana'],
      config: { locale: 'ru-RU' },
    });

    expect(counted.valueText).toBe('2 фрукта');
    counted.unmount();
  });

  it('renders its own label, description and error and links them to the control', () => {
    const control = SelectDriver.mount({
      props: { label: 'Имя', description: 'Подсказка', error: 'Ошибка' },
    });

    expect(fieldTextsOf(control.wrapper)).toEqual({
      label: 'Имя',
      description: 'Подсказка',
      error: 'Ошибка',
      linked: true,
      group: false,
    });
  });

  it('disables its hidden input together with the control so native forms skip the value', () => {
    const off = SelectDriver.mount({
      modelValue: 'banana',
      props: { name: 'fruit', disabled: true },
    });

    expect(off.hiddenValues).toEqual(['banana']);
    expect(off.hiddenDisabled).toEqual([true]);
    off.unmount();
  });

  it('keeps a readonly select closed while its value stays readable', async () => {
    const select = SelectDriver.mount({
      modelValue: 'lime',
      props: { readonly: true, clearable: true },
    });

    expect(select.hasModifier('readonly')).toBe(true);
    expect(select.trigger.attributes('aria-readonly')).toBe('true');
    expect(select.trigger.attributes('popovertarget')).toBeUndefined();
    expect(select.trigger.attributes('aria-expanded')).toBe('false');
    expect(select.trigger.attributes('aria-controls')).toBeTruthy();
    expect(select.trigger.element.disabled).toBe(false);
    expect(select.clearButton.exists()).toBe(false);
    await select.pressTrigger('ArrowDown');
    expect(select.expanded).toBe(false);
    expect(select.valueText).toBe('Lime');
    select.unmount();
  });
});
