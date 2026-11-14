// @vitest-environment node
import { runInNewContext } from 'node:vm';
import { renderToString } from '@vue/test-utils';
import { describe, expect, it } from 'vite-plus/test';
import { colorSchemeScript, createNuiConfig } from '../src';
import ColorSchemeProbe from './fixtures/ColorSchemeProbe.vue';

const pageWith = (stored: string | null, classes: readonly string[]) => {
  const list = new Set(classes);

  const document = {
    documentElement: {
      classList: {
        add: (...names: string[]) => {
          for (const name of names) {
            list.add(name);
          }
        },
        remove: (...names: string[]) => {
          for (const name of names) {
            list.delete(name);
          }
        },
      },
    },
  };

  return {
    context: { document, localStorage: { getItem: () => stored } },
    classes: () => [...list],
  };
};

describe('color scheme on the server', () => {
  it('renders the configured scheme without touching the document', async () => {
    const html = await renderToString(ColorSchemeProbe, {
      global: {
        plugins: [createNuiConfig({ colorScheme: { storageKey: 'nui-theme', initial: 'dark' } })],
      },
    });

    expect(html).toBe('<section class="nui-theme--dark">dark</section>');
  });

  it('puts the stored scheme class on the page before hydration', () => {
    const page = pageWith('light', ['site', 'nui-theme--system']);

    runInNewContext(colorSchemeScript('nui-theme', 'dark'), page.context);

    expect(page.classes()).toEqual(['site', 'nui-theme--light']);
  });

  it('falls back to the configured scheme when nothing is stored', () => {
    const page = pageWith(null, []);

    runInNewContext(colorSchemeScript('nui-theme', 'system'), page.context);

    expect(page.classes()).toEqual(['nui-theme--system']);
  });
});
