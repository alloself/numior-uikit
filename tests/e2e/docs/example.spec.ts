import { expect, test } from '@playwright/test';
import { DocsSite } from '../pages/docs';

test('an example shows the preview first and switches to the source', async ({ page }) => {
  const docs = new DocsSite(page);
  await docs.open('/components/button');
  const example = docs.example();
  await expect(example.preview).toBeVisible();
  await expect(example.preview.getByRole('button', { name: 'Сохранить' })).toBeVisible();
  await expect(example.code).toBeHidden();
  await example.codeToggle.click();
  await expect(example.code).toBeVisible();
  await expect(example.code).toContainText('<NuiButton>Сохранить</NuiButton>');
  await expect(example.preview).toBeHidden();
});

test('the inverted theme and the reading direction apply to the preview frame', async ({
  page,
}) => {
  const docs = new DocsSite(page);
  await docs.open('/components/button', 'light');
  const example = docs.example();
  await example.invertTheme.click();
  await expect(example.preview).toHaveAttribute('data-nui-theme', 'dark');
  await example.rtl.click();
  await expect(example.preview).toHaveAttribute('dir', 'rtl');
  await example.invertTheme.click();
  await expect(example.preview).not.toHaveAttribute('data-nui-theme', /./);
});

test('copying puts the example source on the clipboard', async ({ page }) => {
  const docs = new DocsSite(page);
  await docs.stubClipboard();
  await docs.open('/components/button');
  const example = docs.example();
  await example.codeToggle.click();
  await expect(example.code).toBeVisible();
  await example.copy.click();

  await expect
    .poll(async () => (await docs.copiedTexts()).at(-1))
    .toContain('<NuiButton variant="link">Подробнее</NuiButton>');
});

test('the configurator drives the live component and the generated code', async ({ page }) => {
  const docs = new DocsSite(page);
  await docs.open('/components/button');
  const configurator = docs.configurator();
  await page.getByRole('tab', { name: 'Код', exact: true }).last().click();
  await expect(configurator.code).toContainText('<NuiButton>Сохранить</NuiButton>');
  await configurator.choose('variant', 'soft');
  await configurator.enable('disabled');
  const button = configurator.preview.getByRole('button', { name: 'Сохранить' });
  await expect(button).toHaveClass(/nui-button--variant-soft/);
  await expect(button).toBeDisabled();

  await expect(configurator.code).toContainText(
    '<NuiButton variant="soft" disabled>Сохранить</NuiButton>',
  );
});
