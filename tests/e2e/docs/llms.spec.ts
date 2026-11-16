import { expect, test } from '../fixtures';

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
