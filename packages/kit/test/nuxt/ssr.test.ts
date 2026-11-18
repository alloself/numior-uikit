import { fileURLToPath } from 'node:url';
import { $fetch, setup } from '@nuxt/test-utils/e2e';
import { colorSchemeScript } from '@numior/vue';
import { describe, expect, it } from 'vitest';

const STYLESHEET_LINK = /<link rel="stylesheet" href="([^"]+\.css)"/g;

describe('the fixture app built on @numior/kit/nuxt', async () => {
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

  it('ships the styles of the kit components the pages use and no others', async () => {
    const html = await $fetch<string>('/');
    const sheets = [...html.matchAll(STYLESHEET_LINK)].map(([, href = '']) => href);
    const css = (await Promise.all(sheets.map((href) => $fetch<string>(href)))).join('\n');

    expect(css).toContain('.nui-button');
    expect(css).toContain('.nui-code');
    expect(css).toContain('.nui-link');
    expect(css).toContain('.nui-toaster');
    expect(css).not.toContain('.nui-table');
    expect(css).not.toContain('.nui-editor');
  });
});
