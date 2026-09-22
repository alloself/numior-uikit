import { describe, expect, it } from 'vitest';
import { h } from 'vue';
import { FieldDriver } from './drivers/field';

describe('NuiField', () => {
  it('wires label, description and error to the control through ids', () => {
    const field = FieldDriver.mount({
      props: {
        id: 'email',
        label: 'Email',
        description: 'Work address',
        error: 'Required',
        required: true,
      },
    });
    expect(field.label.attributes('for')).toBe('email');
    expect(field.label.attributes('id')).toBe('email-label');
    expect(field.label.text()).toContain('Email');
    expect(field.showsRequiredMark).toBe(true);
    expect(field.control.attributes('id')).toBe('email');
    expect(field.control.attributes('required')).toBe('');
    expect(field.describedBy).toBe('email-description email-error');
    expect(field.ariaInvalid).toBe('true');
    expect(field.description.text()).toBe('Work address');
    expect(field.error.text()).toBe('Required');
    expect(field.hasModifier('invalid')).toBe(true);
    expect(field.hasModifier('required')).toBe(true);
  });

  it('generates matching ids and omits describedby when nothing describes the control', () => {
    const field = FieldDriver.mount({ props: { label: 'Name' } });
    const id = field.control.attributes('id');
    expect(id).toBeTruthy();
    expect(field.label.attributes('for')).toBe(id);
    expect(field.describedBy).toBeUndefined();
    expect(field.ariaInvalid).toBeUndefined();
    expect(field.showsRequiredMark).toBe(false);
  });

  it('renders a natively disabled fieldset with a legend for groups', () => {
    const field = FieldDriver.mount({
      props: { id: 'plan', label: 'Plan', group: true, disabled: true },
    });
    expect(field.tagName).toBe('FIELDSET');
    expect(field.nativelyDisabled).toBe(true);
    expect(field.hasModifier('group')).toBe(true);
    expect(field.hasModifier('disabled')).toBe(true);
    expect(field.label.element.tagName).toBe('LEGEND');
    expect(field.label.attributes('id')).toBe('plan-label');
    expect(field.label.attributes('for')).toBeUndefined();
    expect(field.control.attributes('id')).not.toBe('plan');
  });

  it('accepts slots for label, description and error', () => {
    const field = FieldDriver.mount({
      props: { id: 'bio' },
      slots: {
        label: () => 'Bio',
        description: () => h('em', 'Markdown ok'),
        error: () => 'Too long',
      },
    });
    expect(field.label.text()).toBe('Bio');
    expect(field.description.find('em').text()).toBe('Markdown ok');
    expect(field.error.text()).toBe('Too long');
    expect(field.describedBy).toBe('bio-description bio-error');
    expect(field.ariaInvalid).toBe('true');
  });
});
