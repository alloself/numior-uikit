import { expect, test } from '../fixtures';

test('a block runs in its own screen and narrows to a phone', async ({ docs, isMobile }) => {
  test.skip(isMobile, 'the screen width switch is hidden on phones');
  await docs.open('/blocks/');
  const block = docs.block('OrdersTable');
  await expect(block.content.getByRole('heading', { name: 'Заказы' })).toBeVisible();
  await expect(block.content.getByRole('row')).toHaveCount(11);

  await block.resize('Телефон');

  await expect.poll(() => block.width()).toBe(390);

  await block.showCode();
  await expect(block.code).toContainText("import { ordersOf } from './many-orders';");
});

test('a block screen grows with its content instead of scrolling', async ({ docs, isMobile }) => {
  test.skip(isMobile, 'the screen width switch is hidden on phones');
  await docs.open('/blocks/');
  const block = docs.block('SalesDashboard');
  await block.screen.scrollIntoViewIfNeeded();
  await expect(block.content.getByRole('heading', { name: 'Продажи' })).toBeVisible();
  await expect.poll(() => block.hiddenHeight()).toBe(0);

  const wide = await block.height();

  await block.resize('Телефон');

  await expect.poll(() => block.height()).toBeGreaterThan(wide);
  await expect.poll(() => block.hiddenHeight()).toBe(0);
  await expect.poll(() => block.hiddenWidth()).toBe(0);
});

test('a block page has no site chrome and follows the theme of the site', async ({
  docs,
  page,
}) => {
  await docs.open('/blocks/', 'dark');
  const block = docs.block('SignIn');
  await block.screen.scrollIntoViewIfNeeded();
  await expect(block.content.getByRole('button', { name: 'Войти' })).toBeVisible();
  await expect.poll(() => block.theme()).toBe('dark');
  await expect(block.content.locator('.nui-app-bar')).toHaveCount(0);

  await page.goto('/blocks/view/SignIn');
  await docs.signIn('correct horse');

  await expect(docs.toasts).toHaveText([/Анна Титова, вы вошли/]);
});

test('a slash on an empty line of the product description inserts a callout', async ({
  docs,
  page,
}) => {
  await page.goto('/blocks/view/ProductDescription');
  await docs.productDescription.getByText('Выдерживает до 120 кг').click();
  await docs.openSlashMenuOnNewLine();
  await docs.blockOptions.getByRole('option', { name: 'Выноска' }).click();

  await expect(docs.productDescription.getByRole('note')).toHaveCount(2);
});

test('the focused editor of the product description keeps its frame without an outer ring', async ({
  docs,
  isMobile,
}) => {
  test.skip(isMobile, 'focus rings follow the keyboard');
  await docs.open('/blocks/view/ProductDescription');

  await docs.productDescription.focus();

  await expect(docs.editorFrame).toHaveCSS('outline-width', '0px');
});

test('the name box and the formula bar of the price sheet keep their frame without an outer ring', async ({
  docs,
  isMobile,
}) => {
  test.skip(isMobile, 'focus rings follow the keyboard');
  await docs.open('/blocks/view/PriceSheet');

  await docs.sheetNameField.focus();

  await expect(docs.sheetNameBox).toHaveCSS('outline-width', '0px');

  await docs.formulaField.focus();

  await expect(docs.sheetEntry).toHaveCSS('outline-width', '0px');
});

test('the revenue chart of the sales block walks the days from the keyboard', async ({
  docs,
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'keyboard only');
  await page.goto('/blocks/view/SalesDashboard');
  await docs.revenueChart.focus();
  await docs.stepFocusedChartForward();

  await expect(docs.revenueChart).toContainText('22 700');
});
