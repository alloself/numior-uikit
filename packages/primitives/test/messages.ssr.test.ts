// @vitest-environment node
import { renderToString } from '@vue/test-utils';
import { describe, expect, it } from 'vite-plus/test';
import { createNuiConfig } from '../src';
import MessagesButton from './fixtures/MessagesButton.vue';

describe('message dictionary on the server', () => {
  it('renders the configured language and overrides like the client', async () => {
    const html = await renderToString(MessagesButton, {
      global: {
        plugins: [
          createNuiConfig({ locale: 'ru-RU', messages: { ru: { probe: { close: 'Скрыть' } } } }),
        ],
      },
    });

    expect(html).toBe('<button aria-label="Скрыть">Выбрано: 2</button>');
  });
});
