// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { useVirtualList } from '../src';

describe('useVirtualList on the server', () => {
  it('renders the initial window without measuring anything', async () => {
    const seen = { viewport: -1, total: -1, rendered: -1 };

    const Probe = defineComponent({
      setup() {
        const container = ref<HTMLElement | null>(null);
        const virtual = useVirtualList(container, { count: 500, itemSize: 20, initialCount: 12 });
        seen.viewport = virtual.viewport.value;
        seen.total = virtual.totalSize.value;
        seen.rendered = virtual.items.value.length;
        return () =>
          h(
            'div',
            { ref: container },
            virtual.items.value.map((item) => h('div', { key: item.index }, `Row ${item.index}`)),
          );
      },
    });

    const html = await renderToString(h(Probe));
    expect(seen).toEqual({ viewport: 0, total: 10_000, rendered: 12 });
    expect(html).toContain('Row 11');
    expect(html).not.toContain('Row 12');
  });
});
