import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { NuiIcon, useLocale, useToday } from '../src';
import { configScope } from './support/config-scope';

const glyph = (name: string) => defineComponent({ render: () => h('svg', { 'data-icon': name }) });

describe('provideNuiConfig', () => {
  it('layers nested icon registries for the subtree', async () => {
    const wrapper = mount(
      configScope({ icons: { check: glyph('outer'), x: glyph('outer-x') } }, () =>
        h(
          configScope({ icons: { check: glyph('inner') } }, () => [
            h(NuiIcon, { alias: 'check' }),
            h(NuiIcon, { alias: 'x' }),
          ]),
        ),
      ),
    );
    await vi.waitFor(() =>
      expect(wrapper.findAll('svg').map((svg) => svg.attributes('data-icon'))).toEqual([
        'inner',
        'outer-x',
      ]),
    );
  });

  it('supplies the locale and today to descendants through empty layers', () => {
    const Probe = defineComponent({
      setup: () => {
        const locale = useLocale();
        const today = useToday();
        return () => h('output', `${locale.value} ${today()}`);
      },
    });
    const wrapper = mount(
      configScope({ locale: 'de-DE', today: () => '2026-09-24' }, () =>
        h(configScope({}, () => h(Probe))),
      ),
    );
    expect(wrapper.find('output').text()).toBe('de-DE 2026-09-24');
  });
});
