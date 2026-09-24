import { describe, expect, it } from 'vitest';
import { CheckboxDriver } from './drivers/checkbox';

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

  it('adds and removes its value in an array model', async () => {
    const checkbox = CheckboxDriver.mount({ modelValue: ['b'], props: { value: 'a' } });
    await checkbox.ready();
    expect(checkbox.checked).toBe(false);
    await checkbox.toggle();
    expect(checkbox.emittedModels).toEqual([['b', 'a']]);
    await checkbox.receive({ modelValue: ['b', 'a'] });
    expect(checkbox.checked).toBe(true);
    await checkbox.toggle();
    expect(checkbox.emittedModels.at(-1)).toEqual(['b']);
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
    expect(checkbox.wrapper.classes()).toContain('inline');
    expect(checkbox.control.attributes('aria-label')).toBe('Accept');
    expect(checkbox.control.attributes('name')).toBe('accept');
    expect(checkbox.control.attributes('disabled')).toBe('');
    expect(checkbox.control.attributes('aria-invalid')).toBe('true');
    expect(checkbox.hasModifier('disabled')).toBe(true);
    expect(checkbox.hasModifier('invalid')).toBe(true);
    expect(checkbox.hasModifier('size-lg')).toBe(true);
  });
});
