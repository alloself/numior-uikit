import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { ref } from 'vue';
import { createNuiConfig, provideDirection, useDirection } from '../src';
import RtlAnchor from './fixtures/RtlAnchor.vue';
import { captureSetup } from './harness/capture';

describe('direction context', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('dir');
  });

  it('defaults to ltr and reads the document direction when nothing is configured', () => {
    expect(captureSetup(() => useDirection()).value.dir()).toBe('ltr');

    document.documentElement.dir = 'rtl';
    expect(captureSetup(() => useDirection()).value.isRtl()).toBe(true);
  });

  it('follows the nearest dir attribute above the anchor element', () => {
    const wrapper = mount(RtlAnchor);

    expect(wrapper.vm.direction.isRtl()).toBe(true);
  });

  it('lets the plugin or a provider decide and keeps that decision reactive', () => {
    const direction = ref<'ltr' | 'rtl'>('rtl');

    const fromPlugin = captureSetup(() => useDirection(), {
      plugins: [createNuiConfig({ dir: direction })],
    });

    expect(fromPlugin.value.isRtl()).toBe(true);

    direction.value = 'ltr';
    expect(fromPlugin.value.isRtl()).toBe(false);

    const fromProvider = captureSetup(() => useDirection(), {
      layers: [() => provideDirection('rtl')],
    });

    expect(fromProvider.value.dir()).toBe('rtl');
  });
});
