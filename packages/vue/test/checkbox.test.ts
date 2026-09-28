import { describe, expect, it } from 'vitest';
import { CheckboxDriver, CheckboxGroupDriver } from './drivers/checkbox';
import { fieldTextsOf } from './support/field-texts';

describe('NuiCheckbox', () => {
  it('toggles a boolean model and mirrors it in the native control', async () => {
    const checkbox = CheckboxDriver.mount({ modelValue: false, label: 'Terms' });
    await checkbox.ready();
    expect(checkbox.checked).toBe(false);
    expect(checkbox.labelText).toBe('Terms');
    await checkbox.toggle();
    expect(checkbox.emittedModels).toEqual([true]);
    await checkbox.receive({ modelValue: true });
    expect(checkbox.checked).toBe(true);
    expect(checkbox.hasModifier('checked')).toBe(true);
  });

  it('applies indeterminate as a DOM property with the minus glyph', async () => {
    const checkbox = CheckboxDriver.mount({ props: { indeterminate: true } });
    await checkbox.ready();
    expect(checkbox.indeterminate).toBe(true);
    expect(checkbox.hasModifier('indeterminate')).toBe(true);
    expect(checkbox.markGlyphClasses).toContain('lucide-minus');
    await checkbox.receive({ indeterminate: false });
    expect(checkbox.indeterminate).toBe(false);
    expect(checkbox.markGlyphClasses).toContain('lucide-check');
  });

  it('forwards attributes to the native control and reflects state as modifiers', async () => {
    const checkbox = CheckboxDriver.mount({
      props: { disabled: true, invalid: true, size: 'lg' },
      attrs: { class: 'inline', 'aria-label': 'Accept', name: 'accept' },
    });

    await checkbox.ready();
    expect(checkbox.root.classes()).toContain('inline');
    expect(checkbox.control.attributes('aria-label')).toBe('Accept');
    expect(checkbox.control.attributes('name')).toBe('accept');
    expect(checkbox.control.attributes('disabled')).toBe('');
    expect(checkbox.control.attributes('aria-invalid')).toBe('true');
    expect(checkbox.hasModifier('disabled')).toBe(true);
    expect(checkbox.hasModifier('invalid')).toBe(true);
    expect(checkbox.hasModifier('size-lg')).toBe(true);
  });
});

describe('NuiCheckboxGroup', () => {
  it('adds and removes option values in its array model', async () => {
    const group = CheckboxGroupDriver.mount({ modelValue: ['b'] });

    expect(group.checked).toEqual(['b']);
    await group.toggle(0);
    expect(group.emittedModels).toEqual([['b', 'a']]);
    await group.receive(['b', 'a']);
    expect(group.checked).toEqual(['a', 'b']);
    await group.toggle(1);
    expect(group.emittedModels.at(-1)).toEqual(['a']);
  });

  it('names its checkboxes after the group and keeps disabled options out of reach', () => {
    const group = CheckboxGroupDriver.mount({
      props: { name: 'channels' },
      disabledValues: ['c'],
    });

    expect(group.names).toEqual(['channels', 'channels', 'channels']);

    expect(group.checkboxes.map((box) => box.attributes('disabled') !== undefined)).toEqual([
      false,
      false,
      true,
    ]);
  });

  it('takes its name and description from a group field', () => {
    const group = CheckboxGroupDriver.mount({
      field: { label: 'Channels', description: 'Pick any', group: true },
    });

    expect(group.group.attributes('aria-labelledby')).toBeDefined();
    expect(group.group.attributes('aria-describedby')).toBeDefined();

    expect(group.checkboxes.every((box) => box.attributes('aria-describedby') === undefined)).toBe(
      true,
    );
  });

  it('renders its own label, description and error and links them to the control', () => {
    const control = CheckboxDriver.mount({
      props: { label: 'Имя', description: 'Подсказка', error: 'Ошибка' },
    });

    expect(fieldTextsOf(control.wrapper)).toEqual({
      label: undefined,
      description: 'Подсказка',
      error: 'Ошибка',
      linked: true,
      group: false,
    });

    expect(control.wrapper.find('.nui-checkbox__label').text()).toBe('Имя');
  });

  it('renders a legend, description and error for the group and links them', () => {
    const control = CheckboxGroupDriver.mount({
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

  it('marks a required group without ARIA attributes the group role does not allow', () => {
    const group = CheckboxGroupDriver.mount({ props: { required: true, label: 'Каналы' } });

    expect(group.group.attributes('role')).toBe('group');
    expect(group.group.attributes('aria-required')).toBeUndefined();
  });

  it('keeps a readonly checkbox focusable but unchanged on click, also inside a group', async () => {
    const checkbox = CheckboxDriver.mount({ props: { readonly: true }, modelValue: false });
    await checkbox.ready();
    expect(checkbox.hasModifier('readonly')).toBe(true);
    expect(checkbox.control.attributes('aria-readonly')).toBe('true');
    expect(checkbox.control.attributes('readonly')).toBeUndefined();
    expect(checkbox.control.attributes('disabled')).toBeUndefined();
    await checkbox.click();
    expect(checkbox.checked).toBe(false);
    expect(checkbox.emittedModels).toEqual([]);
    checkbox.unmount();

    const group = CheckboxGroupDriver.mount({ props: { readonly: true }, modelValue: ['a'] });
    expect(group.hasModifier('readonly')).toBe(true);

    expect(group.checkboxes.map((box) => box.attributes('aria-readonly'))).toEqual([
      'true',
      'true',
      'true',
    ]);

    group.unmount();
  });
});
