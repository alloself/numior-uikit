import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vite-plus/test';
import { createNuiConfig, lazyIcon, provideIcons, useIcons } from '../src';
import CircleGlyph from './fixtures/CircleGlyph.vue';
import IconPair from './fixtures/IconPair.vue';
import SquareGlyph from './fixtures/SquareGlyph.vue';
import TriangleGlyph from './fixtures/TriangleGlyph.vue';
import { captureSetup } from './harness/capture';

describe('icon registry', () => {
  it('layers nested registries and resolves aliases', () => {
    const icons = captureSetup(
      () => {
        const registry = useIcons();

        return { check: registry.check, x: registry.x, missing: registry.trash };
      },
      {
        layers: [
          () => provideIcons({ check: SquareGlyph, x: CircleGlyph }),
          () => provideIcons({ check: TriangleGlyph }),
        ],
      },
    ).value;

    expect(icons.check).toBe(TriangleGlyph);
    expect(icons.x).toBe(CircleGlyph);
    expect(icons.missing).toBeUndefined();
  });

  it('accepts app-level configuration through the plugin', () => {
    const icons = captureSetup(() => useIcons(), {
      plugins: [createNuiConfig({ icons: { check: SquareGlyph } })],
    }).value;

    expect(icons.check).toBe(SquareGlyph);
  });

  it('loads a lazy icon once and renders it after resolution', async () => {
    const loads = { count: 0 };

    const Lazy = lazyIcon(() => {
      loads.count += 1;
      return Promise.resolve(SquareGlyph);
    });

    const rendered = mount(IconPair, { props: { icon: Lazy } });
    await vi.waitFor(() => expect(rendered.findAll('svg')).toHaveLength(2));
    expect(loads.count).toBe(1);
  });
});
