import { expect, test } from '../fixtures';

test('the home page copies the install line and leads to the guide', async ({ docs, page }) => {
  await docs.stubClipboard();
  await docs.open('/');
  const home = docs.home();
  await expect(home.title).toHaveText('UI-кит для Vue 3');
  await expect(docs.sidebar).toHaveCount(0);

  await home.copyInstall.click();

  await expect
    .poll(async () => (await docs.copiedTexts()).at(-1))
    .toBe('pnpm add @numior/vue @numior/tokens');

  await home.start.click();
  await expect(page).toHaveURL(/\/guide\/getting-started$/);
});

test('the back office on the home page changes its look and leaves the site as it was', async ({
  docs,
}) => {
  await docs.open('/');
  const home = docs.home();
  await expect(home.screen.getByRole('heading', { name: 'Заказы' })).toBeVisible();

  await home.pick('Тёмная');
  await home.turnRightToLeft();
  await home.pickAccent('Фиолетовый');

  await expect.poll(() => home.screenAttribute('data-nui-theme')).toBe('dark');
  await expect.poll(() => home.screenAttribute('dir')).toBe('rtl');
  await expect.poll(() => home.screenAttribute('data-nui-accent')).toBe('violet');
  expect(await home.siteAttribute('dir')).not.toBe('rtl');
  expect(await home.siteAttribute('data-nui-accent')).toBeNull();

  await home.pickAccent('Numior');
  await expect.poll(() => home.screenAttribute('data-nui-accent')).toBeNull();
});

test('a section of the home page shows a live block and leads to its page', async ({
  docs,
  page,
}) => {
  await docs.open('/');
  const table = docs.home().section('Разметка остаётся таблицей');
  await expect(docs.block('OrdersTable').content.getByRole('grid')).toBeVisible();

  await table.getByRole('link', { name: 'Открыть таблицу' }).click();

  await expect(page).toHaveURL(/\/components\/table$/);
});

test('the skip link moves focus to the home content', async ({ docs, page, isMobile }) => {
  test.skip(isMobile, 'keyboard only');
  await docs.open('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'К содержимому' })).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(docs.main).toBeFocused();
});
