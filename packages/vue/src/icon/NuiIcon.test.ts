import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import NuiConfigProvider from '../config/NuiConfigProvider.vue';
import NuiIcon from './NuiIcon.vue';

const Custom = defineComponent({ render: () => h('svg', { 'data-custom': 'true' }) });

describe('NuiIcon', () => {
  it('renders the Lucide default for a known alias as decorative markup', () => {
    const wrapper = mount(NuiIcon, { props: { alias: 'check' } });
    const svg = wrapper.find('svg');
    expect(svg.classes()).toContain('nui-icon');
    expect(svg.classes()).toContain('lucide-check');
    expect(svg.attributes('aria-hidden')).toBe('true');
    expect(svg.attributes('data-alias')).toBe('check');
  });

  it('prefers the provided registry, then an explicit component, and renders nothing otherwise', () => {
    const wrapper = mount(
      defineComponent({
        render: () =>
          h(NuiConfigProvider, { icons: { check: Custom } }, () => [
            h(NuiIcon, { alias: 'check', class: 'from-registry' }),
            h(NuiIcon, { alias: 'x', class: 'from-defaults' }),
            h(NuiIcon, { alias: 'check', icon: Custom, class: 'explicit' }),
            h(NuiIcon, { alias: 'unknown-alias', class: 'missing' }),
          ]),
      }),
    );
    expect(wrapper.find('.from-registry').attributes('data-custom')).toBe('true');
    expect(wrapper.find('.from-defaults').classes()).toContain('lucide-x');
    expect(wrapper.find('.explicit').attributes('data-custom')).toBe('true');
    expect(wrapper.find('.missing').exists()).toBe(false);
  });
});
