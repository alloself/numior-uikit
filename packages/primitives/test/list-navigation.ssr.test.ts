// @vitest-environment node
import { renderToString } from '@vue/test-utils';
import { describe, expect, it } from 'vite-plus/test';
import ListNavigationHost from './fixtures/ListNavigationHost.vue';

describe('useListNavigation on the server', () => {
  it('renders without touching the DOM and reports no active item', async () => {
    const seen = { activeId: 'unset', items: -1 };

    const html = await renderToString(ListNavigationHost, {
      props: {
        labels: ['A'],
        onReady: (navigation) => {
          seen.activeId = navigation.activeId.value ?? 'none';
          seen.items = navigation.items().length;
        },
      },
    });

    expect(html).toContain('role="option"');
    expect(seen).toEqual({ activeId: 'none', items: 0 });
  });
});
