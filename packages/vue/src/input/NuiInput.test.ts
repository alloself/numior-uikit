import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { h } from 'vue';
import NuiInput from './NuiInput.vue';

const emitted = (wrapper: ReturnType<typeof mount>) =>
  (wrapper.emitted('update:modelValue') ?? []).map(([value]) => value);

async function type(wrapper: ReturnType<typeof mount>, value: string, commit = false) {
  const input = wrapper.find('input');
  (input.element as HTMLInputElement).value = value;
  await input.trigger('input');
  if (commit) await input.trigger('change');
  return input;
}

describe('NuiInput', () => {
  it('updates the model on input and honors lazy and trim modifiers on commit', async () => {
    const eager = mount(NuiInput, { props: { modelValue: '' } });
    await type(eager, 'abc');
    expect(emitted(eager)).toEqual(['abc']);

    const lazy = mount(NuiInput, { props: { modelValue: '', modelModifiers: { lazy: true } } });
    await type(lazy, 'abc');
    expect(emitted(lazy)).toEqual([]);
    await lazy.find('input').trigger('change');
    expect(emitted(lazy)).toEqual(['abc']);

    // While the user is still typing (focused), spaces stay in the DOM; commit trims them.
    const trim = mount(NuiInput, {
      attachTo: document.body,
      props: { modelValue: '', modelModifiers: { trim: true } },
    });
    (trim.find('input').element as HTMLInputElement).focus();
    const input = await type(trim, ' a ');
    expect(emitted(trim)).toEqual(['a']);
    expect((input.element as HTMLInputElement).value).toBe(' a ');
    await input.trigger('change');
    expect((input.element as HTMLInputElement).value).toBe('a');
    trim.unmount();
  });

  it('writes external model changes into the native input', async () => {
    const wrapper = mount(NuiInput, { props: { modelValue: 'first' } });
    const input = wrapper.find('input').element as HTMLInputElement;
    expect(input.value).toBe('first');
    await wrapper.setProps({ modelValue: 'second' });
    expect(input.value).toBe('second');
  });

  it('routes class and style to the wrapper and other attributes to the native input', async () => {
    let focused = 0;
    const wrapper = mount(NuiInput, {
      attrs: {
        class: 'wide',
        style: 'max-width: 10rem',
        placeholder: 'Name',
        autocomplete: 'name',
        'aria-label': 'Name',
        onFocus: () => focused++,
      },
      props: { type: 'email', size: 'lg', readonly: true },
    });
    expect(wrapper.classes()).toContain('wide');
    expect(wrapper.attributes('style')).toContain('max-width');
    expect(wrapper.attributes('data-size')).toBe('lg');
    const input = wrapper.find('input');
    expect(input.attributes('placeholder')).toBe('Name');
    expect(input.attributes('autocomplete')).toBe('name');
    expect(input.attributes('aria-label')).toBe('Name');
    expect(input.attributes('type')).toBe('email');
    expect(input.attributes('readonly')).toBe('');
    expect(input.attributes('id')).toBeTruthy();
    await input.trigger('focus');
    expect(focused).toBe(1);
  });

  it('reflects invalid and disabled on the wrapper and the control', () => {
    const wrapper = mount(NuiInput, { props: { invalid: true, disabled: true, required: true } });
    expect(wrapper.attributes('data-invalid')).toBe('true');
    expect(wrapper.attributes('data-disabled')).toBe('true');
    const input = wrapper.find('input');
    expect(input.attributes('aria-invalid')).toBe('true');
    expect(input.attributes('disabled')).toBe('');
    expect(input.attributes('required')).toBe('');
    const plain = mount(NuiInput);
    expect(plain.attributes('data-invalid')).toBeUndefined();
    expect(plain.find('input').attributes('disabled')).toBeUndefined();
  });

  it('renders prefix and suffix slots only when provided and exposes focus()', () => {
    const bare = mount(NuiInput);
    expect(bare.find('.nui-input__prefix').exists()).toBe(false);
    const wrapper = mount(NuiInput, {
      attachTo: document.body,
      slots: { prefix: () => '@', suffix: () => h('b', '.ru') },
    });
    expect(wrapper.find('.nui-input__prefix').text()).toBe('@');
    expect(wrapper.find('.nui-input__suffix b').text()).toBe('.ru');
    (wrapper.vm as unknown as { focus(): void }).focus();
    expect(document.activeElement).toBe(wrapper.find('input').element);
    wrapper.unmount();
  });
});
