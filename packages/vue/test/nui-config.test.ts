import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { NuiDialog, NuiIcon, useLocale, type NuiConfigOptions } from '../src';
import { configScope } from './support/config-scope';

const closeText = (outer: NuiConfigOptions, inner: NuiConfigOptions = {}) => {
  const wrapper = mount(configScope(outer, () => h(configScope(inner, () => h(NuiDialog)))));
  const label = wrapper.find('.nui-dialog__close').attributes('aria-label');

  wrapper.unmount();
  return label;
};

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

  it('supplies the locale to descendants through empty layers', () => {
    const Probe = defineComponent({
      setup: () => {
        const locale = useLocale();
        return () => h('output', locale.value);
      },
    });

    const wrapper = mount(
      configScope({ locale: 'de-DE' }, () => h(configScope({}, () => h(Probe)))),
    );

    expect(wrapper.find('output').text()).toBe('de-DE');
  });

  it('resolves built-in texts through nested configs and a translate hook', () => {
    expect(closeText({ locale: 'ru-RU' })).toBe('Закрыть');

    expect(
      closeText({ locale: 'ru-RU' }, { messages: { ru: { dialog: { close: 'Скрыть' } } } }),
    ).toBe('Скрыть');

    expect(
      closeText({ locale: 'de-AT', messages: { de: { dialog: { close: 'Schließen' } } } }),
    ).toBe('Schließen');

    expect(closeText({ locale: 'fr-FR' })).toBe('Close');

    expect(
      closeText({
        locale: 'ru-RU',
        translate: (key, _params, locale) =>
          key === 'dialog.close' ? `i18n ${locale}` : undefined,
      }),
    ).toBe('i18n ru-RU');
  });
});
