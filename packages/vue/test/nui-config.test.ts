import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vite-plus/test';
import { Heart, Star, Sun } from '@lucide/vue';
import { markRaw } from 'vue';
import type { NuiConfigOptions } from '../src';
import NestedConfig from './fixtures/NestedConfig.vue';
import { configPlugins } from './support/config';

const closeText = (outer: NuiConfigOptions, inner: NuiConfigOptions = {}) => {
  const wrapper = mount(NestedConfig, {
    props: { inner, content: 'dialog' },
    global: { plugins: configPlugins(outer) },
  });

  const label = wrapper.find('.nui-dialog__close').attributes('aria-label');

  wrapper.unmount();
  return label;
};

describe('provideNuiConfig', () => {
  it('layers nested icon registries for the subtree', async () => {
    const wrapper = mount(NestedConfig, {
      props: { inner: { icons: { check: markRaw(Sun) } }, content: 'icons' },
      global: { plugins: configPlugins({ icons: { check: markRaw(Heart), x: markRaw(Star) } }) },
    });

    await vi.waitFor(() => expect(wrapper.findAll('svg')).toHaveLength(2));

    expect(wrapper.findAll('svg')[0]?.classes()).toContain('lucide-sun');
    expect(wrapper.findAll('svg')[1]?.classes()).toContain('lucide-star');
  });

  it('supplies the locale to descendants through empty layers', () => {
    const wrapper = mount(NestedConfig, {
      props: { content: 'number' },
      global: { plugins: configPlugins({ locale: 'de-DE' }) },
    });

    expect(wrapper.find('input').element.value).toBe('1.234,5');
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
