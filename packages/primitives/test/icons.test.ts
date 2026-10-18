import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vite-plus/test';
import { defineComponent, h } from 'vue';
import { createNuiConfig, lazyIcon, provideIconDefaults, provideIcons, useIcons } from '../src';
import { captureSetup, nest, providing } from './harness/capture';

const glyph = (name: string) => defineComponent({ name, render: () => h('svg') });

describe('icon registry', () => {
  it('layers nested registries and resolves aliases', () => {
    const outerCheck = glyph('OuterCheck');
    const outerX = glyph('OuterX');
    const innerCheck = glyph('InnerCheck');

    const icons = captureSetup(
      () => {
        const registry = useIcons();

        return { check: registry.check, x: registry.x, missing: registry.trash };
      },
      {
        wrap: nest(
          providing(() => provideIcons({ check: outerCheck, x: outerX })),
          providing(() => provideIcons({ check: innerCheck })),
        ),
      },
    ).value;

    expect(icons.check).toBe(innerCheck);
    expect(icons.x).toBe(outerX);
    expect(icons.missing).toBeUndefined();
  });

  it('lets a package fill in icons the app has not chosen', () => {
    const appSearch = glyph('AppSearch');
    const packageSearch = glyph('PackageSearch');
    const packageCopy = glyph('PackageCopy');

    const icons = captureSetup(() => useIcons(), {
      wrap: nest(
        providing(() => provideIcons({ search: appSearch })),
        providing(() => provideIconDefaults({ search: packageSearch, copy: packageCopy })),
      ),
    }).value;

    expect(icons.search).toBe(appSearch);
    expect(icons.copy).toBe(packageCopy);
  });

  it('accepts app-level configuration through the plugin', () => {
    const appCheck = glyph('AppCheck');

    const icons = captureSetup(() => useIcons(), {
      plugins: [createNuiConfig({ icons: { check: appCheck } })],
    }).value;

    expect(icons.check).toBe(appCheck);
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
