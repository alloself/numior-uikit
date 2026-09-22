import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { NuiConfigProvider, NuiIcon } from '../src';

const glyph = (name: string) => defineComponent({ render: () => h('svg', { 'data-icon': name }) });

describe('NuiConfigProvider', () => {
  it('layers nested icon registries and passes the slot through', async () => {
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
    await vi.waitFor(() =>
      expect(wrapper.findAll('svg').map((svg) => svg.attributes('data-icon'))).toEqual([
        'inner',
        'outer-x',
      ]),
    );
  });
});
