import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, ref, type Component } from 'vue';
import { createNuiConfig, provideDirection, useDirection } from '../src';
import { captureSetup, providing } from './harness/capture';

const inRtlContainer = (child: Component): Component =>
  defineComponent({ setup: () => () => h('div', { dir: 'rtl' }, [h(child)]) });

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
    const anchor = ref<HTMLElement | null>(null);

    const capture = captureSetup(() => useDirection(anchor), { wrap: inRtlContainer });

    anchor.value = capture.wrapper.find('i').element;
    expect(capture.value.isRtl()).toBe(true);
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
      wrap: providing(() => provideDirection('rtl')),
    });

    expect(fromProvider.value.dir()).toBe('rtl');
  });
});
