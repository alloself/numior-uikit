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
  await page.getByLabel('Пароль').fill('correct horse');
  await page.getByRole('button', { name: 'Войти' }).click();

  await expect(docs.toasts).toHaveText([/Анна Титова, вы вошли/]);
});

test('a slash on an empty line of the product description inserts a callout', async ({ page }) => {
  await page.goto('/blocks/view/ProductDescription');
  const editor = page.getByRole('textbox', { name: 'Описание товара' });
  const blocks = page.getByRole('listbox', { name: 'Блоки' });

  await editor.getByText('Выдерживает до 120 кг').click();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.type('/');
  await blocks.getByRole('option', { name: 'Выноска' }).click();

  await expect(editor.getByRole('note')).toHaveCount(2);
});

test('the focused editor of the product description keeps its frame without an outer ring', async ({
  docs,
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'focus rings follow the keyboard');
  await docs.open('/blocks/view/ProductDescription');

  await page.getByRole('textbox', { name: 'Описание товара' }).focus();

  await expect(docs.editorFrame).toHaveCSS('outline-width', '0px');
});

test('the name box and the formula bar of the price sheet keep their frame without an outer ring', async ({
  docs,
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'focus rings follow the keyboard');
  await docs.open('/blocks/view/PriceSheet');

  await page.getByRole('textbox', { name: 'Поле имени' }).focus();

  await expect(docs.sheetNameBox).toHaveCSS('outline-width', '0px');

  await page.getByRole('textbox', { name: 'Строка формул' }).focus();

  await expect(docs.sheetEntry).toHaveCSS('outline-width', '0px');
});

test('the revenue chart of the sales block walks the days from the keyboard', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'keyboard only');
  await page.goto('/blocks/view/SalesDashboard');
  const revenue = page.getByRole('figure', { name: 'Выручка по дням' });

  await revenue.focus();
  await page.keyboard.press('ArrowRight');

  await expect(revenue).toContainText('22 700');
});
