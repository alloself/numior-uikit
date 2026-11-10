import { afterEach, describe, expect, it } from 'vite-plus/test';
import { NumberFieldDriver } from './drivers/number-field';
import { fieldTextsOf } from './support/field-texts';

const languageDescriptor = Object.getOwnPropertyDescriptor(navigator, 'language');
const EUR = { style: 'currency', currency: 'EUR' } as const;

describe('NuiNumberField', () => {
  afterEach(() => {
    if (languageDescriptor) {
      Object.defineProperty(navigator, 'language', languageDescriptor);
    }
  });

  it('formats the model for the default locale with spinbutton semantics', () => {
    const field = NumberFieldDriver.mount({ modelValue: 1234.5, props: { min: 0, max: 5000 } });
    expect(field.text).toBe('1,234.5');
    expect(field.control.attributes('role')).toBe('spinbutton');
    expect(field.inputMode).toBe('decimal');
    expect(field.ariaNow).toBe('1234.5');
    expect(field.ariaText).toBe('1,234.5');
    expect(field.ariaBounds).toEqual(['0', '5000']);

    field.unmount();
  });

  it('keeps raw text while typing and commits a clamped, rounded value on blur', async () => {
    const field = NumberFieldDriver.mount({ props: { max: 100 } });
    await field.type('1,234.567');
    expect(field.value).toBeNull();
    expect(field.text).toBe('1,234.567');

    await field.blur();
    expect(field.value).toBe(100);
    expect(field.text).toBe('100');

    await field.type('1.23456');
    await field.press('Enter');
    expect(field.value).toBe(1.235);
    expect(field.text).toBe('1.235');

    field.unmount();
  });

  it('leaves the model alone when focus leaves or Enter is pressed without typing', async () => {
    const precise = NumberFieldDriver.mount({ modelValue: 1.23456 });

    await precise.blur();

    expect(precise.text).toBe('1.235');
    expect(precise.value).toBe(1.23456);

    precise.unmount();

    const above = NumberFieldDriver.mount({ modelValue: 150, props: { max: 100 } });

    await above.blur();
    await above.press('Enter');

    expect(above.value).toBe(150);

    await above.type('150');
    await above.type('151');
    await above.blur();

    expect(above.value).toBe(100);

    above.unmount();
  });

  it('keeps the typed text when the parent passes equal format options again', async () => {
    const field = NumberFieldDriver.mount({
      modelValue: 0.26,
      props: { formatOptions: { style: 'percent' } },
    });

    await field.type('30');
    await field.receiveProps({ formatOptions: { style: 'percent' } });

    expect(field.text).toBe('30');

    await field.receiveProps({ formatOptions: { style: 'decimal' } });

    expect(field.text).toBe('0.26');

    field.unmount();
  });

  it('follows the provider locale and lets the prop override it', async () => {
    const field = NumberFieldDriver.mount({ modelValue: 1234.5, locale: 'de-DE' });
    expect(field.text).toBe('1.234,5');

    await field.type('2.500,75');
    await field.blur();
    expect(field.value).toBe(2500.75);

    await field.setLocale('en-US');
    expect(field.text).toBe('2,500.75');

    field.unmount();

    const explicit = NumberFieldDriver.mount({
      modelValue: 1234.5,
      locale: 'de-DE',
      props: { locale: 'en-US' },
    });

    expect(explicit.text).toBe('1,234.5');

    explicit.unmount();
  });

  it('never reads the browser language', () => {
    Object.defineProperty(navigator, 'language', { value: 'de-DE', configurable: true });
    const field = NumberFieldDriver.mount({ modelValue: 1234.5 });
    expect(field.text).toBe('1,234.5');

    field.unmount();
  });

  it('passes currency and percent options through and parses them back', async () => {
    const price = NumberFieldDriver.mount({
      modelValue: 1234.5,
      locale: 'de-DE',
      props: { formatOptions: EUR },
    });

    expect(price.text).toMatch(/^1\.234,50\s€$/);

    await price.type('99,9');
    await price.blur();
    expect(price.value).toBe(99.9);
    expect(price.text).toMatch(/^99,90\s€$/);

    price.unmount();

    const percent = NumberFieldDriver.mount({
      modelValue: 0.26,
      props: { formatOptions: { style: 'percent' }, step: 0.01 },
    });

    expect(percent.text).toBe('26%');

    await percent.type('30');
    await percent.blur();
    expect(percent.value).toBe(0.3);
    expect(percent.text).toBe('30%');

    percent.unmount();
  });

  it('steps from the keyboard without floating drift', async () => {
    const field = NumberFieldDriver.mount({
      modelValue: 0.7,
      props: { step: 0.1, min: 0, max: 5 },
    });

    await field.press('ArrowUp');
    expect(field.value).toBe(0.8);

    await field.press('ArrowUp', { shiftKey: true });
    expect(field.value).toBe(1.8);

    await field.press('PageDown');
    expect(field.value).toBe(0.8);

    await field.press('Home');
    expect(field.value).toBe(0);

    await field.press('End');
    expect(field.value).toBe(5);

    await field.type('2');
    await field.press('ArrowUp');
    expect(field.value).toBe(2.1);
    expect(field.text).toBe('2.1');

    field.unmount();
  });

  it('steps from an empty model like a native number input', async () => {
    const field = NumberFieldDriver.mount();
    await field.press('ArrowUp');
    expect(field.value).toBe(1);

    field.unmount();
    const bounded = NumberFieldDriver.mount({ props: { min: 3 } });
    await bounded.press('ArrowUp');
    expect(bounded.value).toBe(3);

    bounded.unmount();
    const floor = NumberFieldDriver.mount({ props: { min: 0 } });
    await floor.press('ArrowDown');
    expect(floor.value).toBe(0);

    floor.unmount();
  });

  it('keeps the steppers as pointer helpers hidden from assistive technology', async () => {
    const field = NumberFieldDriver.mount({ modelValue: 9, props: { max: 10, min: 9 } });
    expect(field.steppers.attributes('aria-hidden')).toBe('true');
    expect(field.incrementButton.attributes('tabindex')).toBe('-1');
    expect(field.decrementButton.attributes('disabled')).toBeDefined();

    await field.clickIncrement();
    expect(field.value).toBe(10);
    expect(field.incrementButton.attributes('disabled')).toBeDefined();

    await field.clickDecrement();
    expect(field.value).toBe(9);

    field.unmount();
    const bare = NumberFieldDriver.mount({ props: { steppers: false } });
    expect(bare.steppers.exists()).toBe(false);

    bare.unmount();
    const readonly = NumberFieldDriver.mount({ modelValue: 2, props: { readonly: true } });
    expect(readonly.hasModifier('readonly')).toBe(true);
    expect(readonly.incrementButton.attributes('disabled')).toBeDefined();

    await readonly.press('ArrowUp');
    expect(readonly.value).toBe(2);

    readonly.unmount();
  });

  it('wires into a field, mirrors the value into a named hidden input and renders slots', () => {
    const field = NumberFieldDriver.mount({
      modelValue: 1234.5,
      props: { name: 'price', invalid: true },
      field: { label: 'Price', description: 'Net' },
      prefix: '$',
    });

    expect(field.fieldLabelFor).toBe(field.control.attributes('id'));
    expect(field.describedBy).toBeDefined();
    expect(field.control.attributes('aria-invalid')).toBe('true');
    expect(field.hasModifier('invalid')).toBe(true);
    expect(field.hiddenValue).toBe('1234.5');
    expect(field.prefixText).toBe('$');

    field.unmount();
    const empty = NumberFieldDriver.mount({ props: { name: 'price' } });
    expect(empty.hiddenValue).toBe('');

    empty.unmount();
  });

  it('rejects non-numeric insertions, clears unparsable text and mirrors external changes', async () => {
    const field = NumberFieldDriver.mount({ modelValue: 5 });
    expect(await field.insert('a')).toBe(true);
    expect(await field.insert('-')).toBe(false);
    expect(await field.insert(',')).toBe(false);

    await field.type('abc');
    await field.blur();
    expect(field.value).toBeNull();
    expect(field.text).toBe('');

    await field.receiveModelValue(42);
    expect(field.text).toBe('42');

    await field.receiveModelValue(null);
    expect(field.text).toBe('');

    field.unmount();
  });

  it('accepts and renders Eastern Arabic digits', async () => {
    const field = NumberFieldDriver.mount({ modelValue: 1234.5, locale: 'ar-EG' });
    expect(field.text).toContain('١٬٢٣٤٫٥');

    await field.type('٧٫٥');
    await field.blur();
    expect(field.value).toBe(7.5);

    field.unmount();
  });

  it('names its steppers in the configured language and follows a locale change', async () => {
    const field = NumberFieldDriver.mount({ modelValue: 1, locale: 'en-US' });
    expect(field.incrementButton.attributes('aria-label')).toBe('Increment');

    await field.setLocale('ru-RU');
    expect(field.incrementButton.attributes('aria-label')).toBe('Увеличить');
    expect(field.decrementButton.attributes('aria-label')).toBe('Уменьшить');

    field.unmount();
  });

  it('renders its own label, description and error and links them to the control', () => {
    const control = NumberFieldDriver.mount({
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

  it('ignores Home, End and arrows while readonly and disables the hidden input with the control', async () => {
    const locked = NumberFieldDriver.mount({
      modelValue: 5,
      props: { readonly: true, min: 0, max: 10 },
    });

    await locked.press('End');
    await locked.press('Home');
    await locked.press('ArrowUp');
    expect(locked.value).toBe(5);

    locked.unmount();

    const off = NumberFieldDriver.mount({
      modelValue: 5,
      props: { name: 'quantity', disabled: true },
    });

    expect(off.hiddenValue).toBe('5');
    expect(off.hiddenDisabled).toBe(true);

    off.unmount();
  });
});
