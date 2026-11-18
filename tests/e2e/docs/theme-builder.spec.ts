import { expect, test } from '../fixtures';

test('the builder restyles only its preview and hands over the CSS of the chosen theme', async ({
  docs,
}) => {
  await docs.stubClipboard();
  await docs.open('/theme/', 'light');
  const builder = docs.themeBuilder();
  const site = await builder.siteLook();
  await expect.poll(async () => (await builder.previewLook()).fill).toBe(site.fill);

  await builder.pick('Базовая');
  await builder.pickColor('Розовый');
  await builder.pick('12');
  await builder.pick('Тёмная');

  await expect.poll(async () => (await builder.previewLook()).radius).toBe('12px');
  await expect.poll(() => builder.previewScheme()).toBe('dark');
  expect((await builder.previewLook()).font).toContain('Inter Variable');
  expect((await builder.previewLook()).fill).not.toBe(site.fill);
  expect(await builder.siteLook()).toEqual(site);
  expect(await docs.scheme()).toBe('light');

  await builder.showCode();
  await builder.copyCss();

  await expect(builder.code).toContainText('--radius-base: 0.75rem;');
  await expect(builder.code).toContainText('pnpm add @fontsource-variable/inter');

  const css = (await docs.copiedTexts()).at(-1) ?? '';
  expect(css.startsWith("@import 'tailwindcss';")).toBe(true);
  expect(css).toContain('--color-primary: light-dark(oklch(0.52 0.2 10), oklch(0.79 0.12 5));');
  expect(css).not.toContain('--color-surface');
});

test('the Numior preset exports the theme of this site with its own surfaces', async ({ docs }) => {
  await docs.stubClipboard();
  await docs.open('/theme/', 'light');
  const builder = docs.themeBuilder();

  await builder.showCode();
  await builder.copyCss();

  const css = (await docs.copiedTexts()).at(-1) ?? '';
  expect(css).toContain('--color-surface: light-dark(#f3f2ef, #030304);');
  expect(css).toContain("--caption-open: '[ ';");
  expect(css).toContain('--radius-base: 0.25rem;');
});

test('the preview follows a dark system scheme until a scheme is picked', async ({ docs }) => {
  await docs.emulate({ colorScheme: 'dark' });

  await docs.open('/theme/');
  const builder = docs.themeBuilder();

  await expect.poll(() => builder.previewTone()).toBe('dark');

  await builder.pick('Светлая');

  await expect.poll(() => builder.previewTone()).toBe('light');
});
