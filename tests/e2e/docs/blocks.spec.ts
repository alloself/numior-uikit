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
