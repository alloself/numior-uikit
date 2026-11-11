import { expect, test } from '../fixtures';

test('an example shows the preview first and switches to the source', async ({ docs }) => {
  await docs.open('/components/button');
  const example = docs.example();
  await expect(example.preview).toBeVisible();
  await expect(example.preview.getByRole('button', { name: 'Сохранить' })).toBeVisible();
  await expect(example.code).toBeHidden();

  await example.codeToggle.click();
  await expect(example.code).toBeVisible();
  await expect(example.code).toContainText('<NuiButton>Сохранить заказ</NuiButton>');
  await expect(example.preview).toBeHidden();
});

test('the inverted theme and the reading direction apply to the preview frame', async ({
  docs,
}) => {
  await docs.open('/components/button', 'light');
  const example = docs.example();
  await example.invertTheme.click();
  await expect(example.preview).toHaveAttribute('data-nui-theme', 'dark');

  await example.rtl.click();
  await expect(example.preview).toHaveAttribute('dir', 'rtl');

  await example.invertTheme.click();
  await expect(example.preview).not.toHaveAttribute('data-nui-theme', /./);
});

test('copying puts the example source on the clipboard', async ({ docs }) => {
  await docs.stubClipboard();
  await docs.open('/components/button');
  const example = docs.example();
  await example.codeToggle.click();
  await expect(example.code).toBeVisible();

  await example.copy.click();

  await expect
    .poll(async () => (await docs.copiedTexts()).at(-1))
    .toContain('<NuiButton variant="ghost" tone="neutral">Отмена</NuiButton>');
});

test('the configurator drives the live component and the generated code', async ({ docs }) => {
  await docs.open('/components/button');
  const configurator = docs.configurator();
  await configurator.showCode();
  await expect(configurator.code).toContainText('<NuiButton>Сохранить</NuiButton>');

  await configurator.showPreview();
  await configurator.choose('variant', 'soft');
  await configurator.enable('disabled');
  const button = configurator.preview.getByRole('button', { name: 'Сохранить' });
  await expect(button).toHaveClass(/nui-button--variant-soft/);
  await expect(button).toBeDisabled();

  await configurator.showCode();

  await expect(configurator.code).toContainText(
    '<NuiButton variant="soft" disabled>Сохранить</NuiButton>',
  );
});

test('a configurator scene keeps its own data and prints the whole example', async ({ docs }) => {
  await docs.open('/components/tree');
  const configurator = docs.configurator();
  const tree = configurator.preview.getByRole('tree', { name: 'Категории' });
  await expect(tree.getByRole('treeitem', { name: 'Столы' })).toBeVisible();

  await configurator.choose('size', 'sm');
  await configurator.enable('checkable');
  await expect(tree).toHaveClass(/nui-tree--size-sm/);

  await configurator.showCode();
  await expect(configurator.files).toHaveText(['Example.vue', 'products.ts']);
  await expect(configurator.code).toContainText('size="sm"');
  await expect(configurator.code).toContainText('checkable');
  await expect(configurator.code).toContainText('label="Категории"');
  await expect(configurator.code).toContainText("import { categories } from './products';");
});
