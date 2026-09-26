// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createSSRApp, defineComponent, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createNuiConfig, useMessages } from '../src';
import { probeMessages } from './harness/messages';

describe('message dictionary on the server', () => {
  it('renders the configured language and overrides like the client', async () => {
    const Probe = defineComponent({
      setup() {
        const messages = useMessages(probeMessages);
        return () =>
          h('button', { 'aria-label': messages.value.close }, messages.value.count({ count: 2 }));
      },
    });

    const app = createSSRApp(Probe);

    app.use(createNuiConfig({ locale: 'ru-RU', messages: { ru: { probe: { close: 'Скрыть' } } } }));
    expect(await renderToString(app)).toBe('<button aria-label="Скрыть">Выбрано: 2</button>');
  });
});
