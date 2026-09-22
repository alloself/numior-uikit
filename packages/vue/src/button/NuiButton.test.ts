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

describe('NuiButton appearance contract', () => {
  it('exposes variant, tone and size as data attributes with solid primary md defaults', () => {
    const defaults = mount(NuiButton);
    expect(defaults.attributes('data-variant')).toBe('solid');
    expect(defaults.attributes('data-tone')).toBe('primary');
    expect(defaults.attributes('data-size')).toBe('md');
    const custom = mount(NuiButton, { props: { variant: 'outline', tone: 'error', size: 'sm' } });
    expect(custom.attributes('data-variant')).toBe('outline');
    expect(custom.attributes('data-tone')).toBe('error');
    expect(custom.attributes('data-size')).toBe('sm');
  });

  it('shows the loader icon from the registry while loading and hides it afterwards', async () => {
    const wrapper = mount(NuiButton, { props: { loading: true }, slots: { default: 'Save' } });
    const spinner = wrapper.find('svg.nui-icon');
    expect(spinner.exists()).toBe(true);
    expect(spinner.attributes('aria-hidden')).toBe('true');
    expect(spinner.attributes('data-alias')).toBe('loader');
    expect(spinner.classes()).toContain('nui-button__spinner');
    await wrapper.setProps({ loading: false });
    expect(wrapper.find('svg').exists()).toBe(false);
  });
});
