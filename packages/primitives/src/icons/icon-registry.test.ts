import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { createNuiConfig } from '../config/nui-config';
import { provideIcons, useIcon } from './icon-registry';

const glyph = (name: string) => defineComponent({ render: () => h('svg', { 'data-icon': name }) });
const Probe = defineComponent({
  props: { alias: { type: String, required: true } },
  setup(props) {
    const icon = useIcon(() => props.alias);
    return () => (icon.value ? h(icon.value) : h('i', { 'data-empty': '' }));
  },
});

describe('icon registry', () => {
  it('layers nested registries and resolves aliases', () => {
    const Inner = defineComponent({
      setup() {
        provideIcons({ check: glyph('inner-check') });
        return () =>
          h(
            'div',
            ['check', 'x', 'missing'].map((alias) => h(Probe, { alias, key: alias })),
          );
      },
    });
    const wrapper = mount(
      defineComponent({
        setup() {
          provideIcons({ check: glyph('outer-check'), x: glyph('outer-x') });
          return () => h(Inner);
        },
      }),
    );
    const icons = wrapper.findAll('svg').map((svg) => svg.attributes('data-icon'));
    expect(icons).toEqual(['inner-check', 'outer-x']);
    expect(wrapper.find('i[data-empty]').exists()).toBe(true);
  });

  it('accepts app-level configuration through the plugin', () => {
    const wrapper = mount(Probe, {
      props: { alias: 'check' },
      global: { plugins: [createNuiConfig({ icons: { check: glyph('app-check') } })] },
    });
    expect(wrapper.attributes('data-icon')).toBe('app-check');
  });
});
