import { describe, expect, it } from 'vitest';
import { RadioGroupDriver } from './drivers/radio';

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
});
