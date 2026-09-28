import { fileURLToPath } from 'node:url';
import { $fetch, setup } from '@nuxt/test-utils/e2e';
import { colorSchemeScript } from '@numior/vue';
import { describe, expect, it } from 'vitest';

describe('the fixture app built on @numior/nuxt', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('../fixture', import.meta.url)),
    server: true,
    browser: false,
  });

  it('renders kit components on the server with the configured locale and app config texts', async () => {
    const html = await $fetch<string>('/');

    expect(html).toMatch(/<html[^>]*\slang="ru"/);
    expect(html).toContain(colorSchemeScript('nui-theme', 'light'));
    expect(html).toContain('rel="stylesheet"');
    expect(html).toContain('class="nui-code');
    expect(html).toContain('aria-label="Скопировать команду"');
    expect(html).toContain('href="/about"');
    expect(html).toContain('class="nui-toaster');
  });

  it('serves the second page with the kit link on the router', async () => {
    const html = await $fetch<string>('/about');

    expect(html).toContain('class="nui-link');
    expect(html).toContain('href="/"');
  });
});
