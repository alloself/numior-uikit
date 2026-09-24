import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { NuiConfigProvider, NuiIcon, useLocale, useToday } from '../src';

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

  it('supplies the locale and today to descendants', () => {
    const Probe = defineComponent({
      setup: () => {
        const locale = useLocale();
        const today = useToday();
        return () => h('output', `${locale.value} ${today()}`);
      },
    });
    const wrapper = mount(
      defineComponent({
        render: () =>
          h(NuiConfigProvider, { locale: 'de-DE', today: () => '2026-09-24' }, () =>
            h(NuiConfigProvider, {}, () => h(Probe)),
          ),
      }),
    );
    expect(wrapper.find('output').text()).toBe('de-DE 2026-09-24');
  });
});
