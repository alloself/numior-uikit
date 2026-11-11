import { expect, test } from '../fixtures';

test('a page is copied as Markdown with the code of its examples', async ({ docs }) => {
  await docs.stubClipboard();
  await docs.open('/components/button');

  await docs.copyPage.click();

  await expect.poll(async () => (await docs.copiedTexts()).at(-1) ?? '').toMatch(/^# Button\n/);
  expect((await docs.copiedTexts()).at(-1)).toContain('<NuiButton>Сохранить</NuiButton>');
  expect((await docs.copiedTexts()).at(-1)).toContain('| `variant` | `NuiButtonVariant` |');
});

test('the catalog for language models links to the Markdown copy of every page', async ({
  docs,
}) => {
  const catalog = await docs.markdownOf('/llms.txt');

  expect(catalog).toMatch(/^# Numior UI\n/);
  expect(catalog).toContain('- [Button](/en/components/button.md)');

  const russian = await docs.markdownOf('/llms-ru.txt');

  expect(russian).toContain('- [Button](/components/button.md)');
  expect(await docs.markdownOf('/components/button.md')).toMatch(/^# Button\n/);
  expect(await docs.markdownOf('/llms-full.txt')).toContain('\n# Select\n');
});
