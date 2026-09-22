import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import NuiTextarea from './NuiTextarea.vue';

describe('NuiTextarea', () => {
  it('is a native textarea that receives attributes directly and reflects props', () => {
    const wrapper = mount(NuiTextarea, {
      attrs: { class: 'tall', placeholder: 'Bio', 'aria-label': 'Bio' },
      props: { rows: 5, resize: 'none', size: 'sm', invalid: true, readonly: true },
    });
    expect(wrapper.element.tagName).toBe('TEXTAREA');
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['nui-textarea', 'tall']));
    expect(wrapper.attributes('placeholder')).toBe('Bio');
    expect(wrapper.attributes('rows')).toBe('5');
    expect(wrapper.attributes('data-resize')).toBe('none');
    expect(wrapper.attributes('data-size')).toBe('sm');
    expect(wrapper.attributes('data-invalid')).toBe('true');
    expect(wrapper.attributes('aria-invalid')).toBe('true');
    expect(wrapper.attributes('readonly')).toBe('');
    expect(wrapper.attributes('id')).toBeTruthy();
  });

  it('updates the model on input, or on change with the lazy modifier', async () => {
    const eager = mount(NuiTextarea, { props: { modelValue: '' } });
    (eager.element as HTMLTextAreaElement).value = 'text';
    await eager.trigger('input');
    expect(eager.emitted('update:modelValue')).toEqual([['text']]);

    const lazy = mount(NuiTextarea, { props: { modelValue: '', modelModifiers: { lazy: true } } });
    (lazy.element as HTMLTextAreaElement).value = 'text';
    await lazy.trigger('input');
    expect(lazy.emitted('update:modelValue')).toBeUndefined();
    await lazy.trigger('change');
    expect(lazy.emitted('update:modelValue')).toEqual([['text']]);
  });
});
