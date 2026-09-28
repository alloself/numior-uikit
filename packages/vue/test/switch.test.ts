import { describe, expect, it } from 'vitest';
import { SwitchDriver } from './drivers/switch';
import { fieldTextsOf } from './support/field-texts';

describe('NuiSwitch', () => {
  it('is a native checkbox with the switch role that toggles its boolean model', async () => {
    const toggle = SwitchDriver.mount({ modelValue: false, label: 'Notifications' });
    expect(toggle.role).toBe('switch');
    expect(toggle.checked).toBe(false);
    await toggle.toggle();
    expect(toggle.emittedModels).toEqual([true]);
    await toggle.receiveModelValue(true);
    expect(toggle.checked).toBe(true);
    expect(toggle.hasModifier('checked')).toBe(true);
  });

  it('reflects field state and size as modifiers and forwards attributes', () => {
    const toggle = SwitchDriver.mount({
      props: { disabled: true, invalid: true, size: 'sm' },
      attrs: { 'aria-label': 'Notify', class: 'compact' },
    });

    expect(toggle.root.classes()).toContain('compact');
    expect(toggle.control.attributes('aria-label')).toBe('Notify');
    expect(toggle.control.attributes('disabled')).toBe('');
    expect(toggle.control.attributes('aria-invalid')).toBe('true');
    expect(toggle.hasModifier('disabled')).toBe(true);
    expect(toggle.hasModifier('invalid')).toBe(true);
    expect(toggle.hasModifier('size-sm')).toBe(true);
  });

  it('renders its own label, description and error and links them to the control', () => {
    const control = SwitchDriver.mount({
      props: { label: 'Имя', description: 'Подсказка', error: 'Ошибка' },
    });

    expect(fieldTextsOf(control.wrapper)).toEqual({
      label: undefined,
      description: 'Подсказка',
      error: 'Ошибка',
      linked: true,
      group: false,
    });

    expect(control.wrapper.find('.nui-switch__label').text()).toBe('Имя');
  });

  it('keeps a readonly switch focusable but unchanged on click', async () => {
    const toggle = SwitchDriver.mount({ props: { readonly: true }, modelValue: false });
    expect(toggle.hasModifier('readonly')).toBe(true);
    expect(toggle.control.attributes('aria-readonly')).toBe('true');
    expect(toggle.control.attributes('disabled')).toBeUndefined();
    await toggle.click();
    expect(toggle.checked).toBe(false);
    expect(toggle.emittedModels).toEqual([]);
    toggle.unmount();
  });
});
