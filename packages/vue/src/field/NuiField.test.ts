import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { h } from 'vue';
import NuiInput from '../input/NuiInput.vue';
import NuiField from './NuiField.vue';

const fieldWith = (props: Record<string, unknown>, slots: Record<string, () => unknown> = {}) =>
  mount(NuiField, { props, slots: { default: () => h(NuiInput), ...slots } });

describe('NuiField', () => {
  it('wires label, description and error to the control through ids', () => {
    const wrapper = fieldWith({
      id: 'email',
      label: 'Email',
      description: 'Work address',
      error: 'Required',
      required: true,
    });
    const label = wrapper.find('label');
    const input = wrapper.find('input');
    expect(label.attributes('for')).toBe('email');
    expect(label.attributes('id')).toBe('email-label');
    expect(label.text()).toContain('Email');
    expect(wrapper.find('.nui-field__required').exists()).toBe(true);
    expect(input.attributes('id')).toBe('email');
    expect(input.attributes('aria-describedby')).toBe('email-description email-error');
    expect(input.attributes('aria-invalid')).toBe('true');
    expect(input.attributes('required')).toBe('');
    expect(wrapper.find('#email-description').text()).toBe('Work address');
    expect(wrapper.find('#email-error').text()).toBe('Required');
    expect(wrapper.attributes('data-invalid')).toBe('true');
    expect(wrapper.attributes('data-required')).toBe('true');
  });

  it('generates matching ids and omits describedby when nothing describes the control', () => {
    const wrapper = fieldWith({ label: 'Name' });
    const id = wrapper.find('input').attributes('id');
    expect(id).toBeTruthy();
    expect(wrapper.find('label').attributes('for')).toBe(id);
    expect(wrapper.find('input').attributes('aria-describedby')).toBeUndefined();
    expect(wrapper.find('input').attributes('aria-invalid')).toBeUndefined();
    expect(wrapper.find('.nui-field__required').exists()).toBe(false);
  });

  it('renders a fieldset with a legend for groups and disables it natively', () => {
    const wrapper = fieldWith({ id: 'plan', label: 'Plan', group: true, disabled: true });
    expect(wrapper.element.tagName).toBe('FIELDSET');
    expect(wrapper.attributes('disabled')).toBe('');
    expect(wrapper.attributes('data-disabled')).toBe('true');
    const legend = wrapper.find('legend');
    expect(legend.attributes('id')).toBe('plan-label');
    expect(legend.attributes('for')).toBeUndefined();
    expect(wrapper.find('label').exists()).toBe(false);
    expect(wrapper.find('input').attributes('id')).not.toBe('plan');
  });

  it('accepts slots for label, description and error', () => {
    const wrapper = fieldWith(
      { id: 'bio' },
      {
        label: () => 'Bio',
        description: () => h('em', 'Markdown ok'),
        error: () => 'Too long',
      },
    );
    expect(wrapper.find('label').text()).toBe('Bio');
    expect(wrapper.find('#bio-description em').text()).toBe('Markdown ok');
    expect(wrapper.find('#bio-error').text()).toBe('Too long');
    expect(wrapper.find('input').attributes('aria-describedby')).toBe('bio-description bio-error');
    expect(wrapper.find('input').attributes('aria-invalid')).toBe('true');
  });
});
