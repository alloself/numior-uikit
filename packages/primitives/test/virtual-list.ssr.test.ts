// @vitest-environment node
import { renderToString } from '@vue/test-utils';
import { describe, expect, it } from 'vite-plus/test';
import VirtualListHost from './fixtures/VirtualListHost.vue';

describe('useVirtualList on the server', () => {
  it('renders the initial window without measuring anything', async () => {
    const seen = { viewport: -1, total: -1, rendered: -1 };

    const html = await renderToString(VirtualListHost, {
      props: {
        count: 500,
        itemSize: 20,
        initialCount: 12,
        onReady: (virtual) => {
          seen.viewport = virtual.viewport.value;
          seen.total = virtual.totalSize.value;
          seen.rendered = virtual.items.value.length;
        },
      },
    });

    expect(seen).toEqual({ viewport: 0, total: 10_000, rendered: 12 });
    expect(html).toContain('Row 11');
    expect(html).not.toContain('Row 12');
  });
});
