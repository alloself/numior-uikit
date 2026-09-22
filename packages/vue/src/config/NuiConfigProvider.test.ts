import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiConfigProvider from './NuiConfigProvider.vue';

const glyph = (name: string) => defineComponent({ render: () => h('svg', { 'data-icon': name }) });

describe('NuiConfigProvider', () => {
  it('layers nested icon registries and passes the slot through', () => {
    const wrapper = mount(
      defineComponent({
        render: () =>
          h(NuiConfigProvider, { icons: { check: glyph('outer'), x: glyph('outer-x') } }, () =>
            h(NuiConfigProvider, { icons: { check: glyph('inner') } }, () => [
              h(NuiIcon, { alias: 'check' }),
              h(NuiIcon, { alias: 'x' }),
            ]),
          ),
      }),
    );
    const icons = wrapper.findAll('svg').map((svg) => svg.attributes('data-icon'));
    expect(icons).toEqual(['inner', 'outer-x']);
  });
});
