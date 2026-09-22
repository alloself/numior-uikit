import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import NuiButton from './NuiButton.vue';

describe('NuiButton native contract', () => {
  it('does not submit a parent form by default and forwards attributes and clicks', async () => {
    let clicks = 0;
    const wrapper = mount(NuiButton, {
      attrs: { 'aria-label': 'Save document', onClick: () => clicks++ },
      slots: { default: 'Save' },
    });
    expect(wrapper.attributes('type')).toBe('button');
    expect(wrapper.attributes('aria-label')).toBe('Save document');
    await wrapper.trigger('click');
    expect(clicks).toBe(1);
    expect(wrapper.text()).toBe('Save');
  });

  it('prevents native activation while loading and recovers after loading', async () => {
    let clicks = 0;
    const wrapper = mount(NuiButton, {
      props: { loading: true, type: 'submit' },
      attrs: { onClick: () => clicks++ },
    });
    wrapper.element.click();
    expect(clicks).toBe(0);
    expect(wrapper.attributes('aria-busy')).toBe('true');
    await wrapper.setProps({ loading: false });
    wrapper.element.click();
    expect(clicks).toBe(1);
    expect(wrapper.attributes('aria-busy')).toBeUndefined();
    expect(wrapper.attributes('type')).toBe('submit');
  });
});
