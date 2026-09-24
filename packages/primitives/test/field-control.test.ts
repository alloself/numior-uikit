import { describe, expect, it } from 'vitest';
import { ControlHarness } from './harness/field';

describe('useFieldControl', () => {
  it('works standalone with its own id and no field state', () => {
    const control = ControlHarness.inside(null);
    expect(control.id).toBeTruthy();
    expect(control.describedBy).toBeUndefined();
    expect(control.ariaInvalid).toBeUndefined();
    expect(control.required).toBe(false);
    expect(control.disabled).toBe(false);
  });

  it('adopts the field id, description and state', () => {
    const control = ControlHarness.inside({
      id: 'name',
      hasDescription: true,
      hasError: true,
      required: true,
      disabled: true,
    });

    expect(control.id).toBe('name');
    expect(control.describedBy).toBe('name-description name-error');
    expect(control.ariaInvalid).toBe('true');
    expect(control.required).toBe(true);
    expect(control.disabled).toBe(true);
  });

  it('lets explicit props override the field', () => {
    const control = ControlHarness.inside(
      { id: 'name', hasError: true, required: true },
      { id: 'custom', invalid: false, required: false },
    );

    expect(control.id).toBe('custom');
    expect(control.ariaInvalid).toBeUndefined();
    expect(control.required).toBe(false);
  });

  it('ignores a group field unless the control is the group root', () => {
    const group = { id: 'plan', labelable: false, hasError: true };
    const plain = ControlHarness.inside(group);
    expect(plain.id).not.toBe('plan');
    expect(plain.ariaInvalid).toBeUndefined();
    const root = ControlHarness.inside(group, {}, { group: true });
    expect(root.id).toBe('plan');
    expect(root.describedBy).toBe('plan-error');
    expect(root.ariaInvalid).toBe('true');
  });
});
