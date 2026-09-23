// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { useListNavigation } from '../src';

describe('useListNavigation on the server', () => {
  it('renders without touching the DOM and reports no active item', async () => {
    const seen = { activeId: 'unset', items: -1 };
    const Probe = defineComponent({
      setup() {
        const container = ref<HTMLElement | null>(null);
        const navigation = useListNavigation(container, { selector: '[role="option"]' });
        seen.activeId = navigation.activeId.value ?? 'none';
        seen.items = navigation.items().length;
        return () =>
          h('div', { ref: container, role: 'listbox' }, [h('div', { role: 'option' }, 'A')]);
      },
    });
    const html = await renderToString(h(Probe));
    expect(html).toContain('role="option"');
    expect(seen).toEqual({ activeId: 'none', items: 0 });
  });
});
