import { describe, expect, it } from 'vite-plus/test';
import { RadioGroupDriver } from './drivers/radio';
import { fieldTextsOf } from './support/field-texts';

describe('NuiRadioGroup and NuiRadio', () => {
  it('shares one native name, reflects the model and emits the selected value', async () => {
    const group = RadioGroupDriver.mount({ modelValue: 'b' });
    expect(new Set(group.names).size).toBe(1);
    expect(group.names[0]).toBeTruthy();
    expect(group.checkedValue).toBe('b');

    await group.select('c');
    expect(group.emittedValues).toEqual(['c']);
  });

  it('uses an explicit name, orientation and size modifiers, and cascades disabled', () => {
    const group = RadioGroupDriver.mount({
      props: { name: 'plan', orientation: 'horizontal', size: 'sm', disabled: true },
      disabledValues: ['c'],
    });

    expect(group.names).toEqual(['plan', 'plan', 'plan']);
    expect(group.group.classes()).toContain('nui-radio-group--orientation-horizontal');
    expect(group.group.classes()).toContain('nui-radio-group--size-sm');
    expect(group.disabledValues).toEqual(['a', 'b', 'c']);
    expect(group.group.attributes('aria-disabled')).toBe('true');
  });

  it('is labelled by the legend of a group field and describes itself through it', () => {
    const group = RadioGroupDriver.mount({
      field: { id: 'plan', label: 'Plan', group: true, description: 'Pick one', required: true },
    });

    expect(group.legendText).toContain('Plan');
    expect(group.group.attributes('role')).toBe('radiogroup');
    expect(group.group.attributes('id')).toBe('plan');
    expect(group.group.attributes('aria-labelledby')).toBe('plan-label');
    expect(group.group.attributes('aria-describedby')).toBe('plan-description');
    expect(group.group.attributes('aria-required')).toBe('true');
    expect(group.radios.map((radio) => radio.attributes('id'))).not.toContain('plan');
  });

  it('renders its own label, description and error and links them to the control', () => {
    const control = RadioGroupDriver.mount({
      props: { label: 'Имя', description: 'Подсказка', error: 'Ошибка' },
    });

    expect(fieldTextsOf(control.wrapper)).toEqual({
      label: 'Имя',
      description: 'Подсказка',
      error: 'Ошибка',
      linked: true,
      group: true,
    });
  });

  it('keeps a readonly group announced as such and ignores clicks on other radios', async () => {
    const group = RadioGroupDriver.mount({ props: { readonly: true }, modelValue: 'a' });
    expect(group.hasModifier('readonly')).toBe(true);
    expect(group.group.attributes('aria-readonly')).toBe('true');
    expect(group.group.attributes('aria-disabled')).toBeUndefined();

    await group.click('b');
    expect(group.checkedValue).toBe('a');
    expect(group.emittedValues).toEqual([]);

    group.unmount();
  });

  it('builds its radios from options when no slot is given', async () => {
    const group = RadioGroupDriver.mount({
      props: {
        options: [
          { value: 'x', label: 'Ten' },
          { value: 'y', label: 'Twenty' },
          { value: 'z', label: 'Thirty', disabled: true },
        ],
      },
      modelValue: 'x',
      values: [],
    });

    expect(group.radios.map((radio) => radio.element.value)).toEqual(['x', 'y', 'z']);
    expect(group.disabledValues).toEqual(['z']);
    expect(group.root.text()).toContain('Twenty');

    await group.select('y');
    expect(group.emittedValues).toEqual(['y']);

    group.unmount();
  });

  it('checks the radio of an object kept in a deep ref and follows a new pick', async () => {
    const group = RadioGroupDriver.mountWarehouses();

    expect(group.checkedLabel).toBe('Yekaterinburg');

    await group.pick('Moscow');

    expect(group.checkedLabel).toBe('Moscow');
  });

  it('matches a fresh copy of the selected object by the key from getKey', () => {
    const copy = RadioGroupDriver.mountWarehouses({ start: 'restocked' });
    const keyed = RadioGroupDriver.mountWarehouses({ start: 'restocked', keyed: true });

    expect(copy.checkedLabel).toBeUndefined();
    expect(keyed.checkedLabel).toBe('Yekaterinburg');
  });

  it('starts with no pick under a key function and checks the first pick by its key', async () => {
    const group = RadioGroupDriver.mountWarehouses({ start: 'none', keyed: true });

    expect(group.checkedLabel).toBeUndefined();

    await group.pick('Moscow');

    expect(group.checkedLabel).toBe('Moscow');
  });
});
