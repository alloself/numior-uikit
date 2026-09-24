import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { createNuiConfig, lazyIcon, provideIcons, useIcon } from '../src';
import { captureSetup, nest, providing } from './harness/capture';

const glyph = (name: string) => defineComponent({ name, render: () => h('svg') });

describe('icon registry', () => {
  it('layers nested registries and resolves aliases', () => {
    const outerCheck = glyph('OuterCheck');
    const outerX = glyph('OuterX');
    const innerCheck = glyph('InnerCheck');

    const icons = captureSetup(
      () => ({ check: useIcon('check'), x: useIcon('x'), missing: useIcon('missing') }),
      {
        wrap: nest(
          providing(() => provideIcons({ check: outerCheck, x: outerX })),
          providing(() => provideIcons({ check: innerCheck })),
        ),
      },
    ).value;

    expect(icons.check.value).toBe(innerCheck);
    expect(icons.x.value).toBe(outerX);
    expect(icons.missing.value).toBeUndefined();
  });

  it('accepts app-level configuration through the plugin', () => {
    const appCheck = glyph('AppCheck');

    const icon = captureSetup(() => useIcon('check'), {
      plugins: [createNuiConfig({ icons: { check: appCheck } })],
    }).value;

    expect(icon.value).toBe(appCheck);
  });

  it('loads a lazy icon once and renders it after resolution', async () => {
    const loads = { count: 0 };

    const Lazy = lazyIcon(() => {
      loads.count += 1;
      return Promise.resolve(glyph('LazyCheck'));
    });

    const rendered = mount(defineComponent({ setup: () => () => [h(Lazy), h(Lazy)] }));
    await vi.waitFor(() => expect(rendered.findAll('svg')).toHaveLength(2));
    expect(loads.count).toBe(1);
  });
});
