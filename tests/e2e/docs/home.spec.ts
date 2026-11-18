import { expect, test } from '../fixtures';

test('the home page copies the install line and leads to the guide', async ({ docs, page }) => {
  await docs.stubClipboard();
  await docs.open('/');
  const home = docs.home();
  await expect(home.title).toHaveText('UI-кит для Vue 3');
  await expect(docs.sidebar).toHaveCount(0);

  await home.copyInstall.click();

  await expect.poll(async () => (await docs.copiedTexts()).at(-1)).toBe('pnpm add @numior/kit');

  await home.start.click();
  await expect(page).toHaveURL(/\/guide\/getting-started$/);
});

test('the components on the home page follow a dark system scheme from the first paint', async ({
  docs,
}) => {
  await docs.emulate({ colorScheme: 'dark' });

  await docs.open('/');
  const home = docs.home();

  await expect.poll(() => home.screenTone()).toBe('dark');
  await expect(home.shownScheme).toHaveAccessibleName('Тёмная');
});

test('the components on the home page change their look and leave the site as it was', async ({
  docs,
}) => {
  await docs.open('/');
  const home = docs.home();
  await expect(home.screen.getByRole('button', { name: 'Купить' })).toBeVisible();

  const numior = await home.screenLook();

  await home.pick('Тёмная');
  await home.turnRightToLeft();
  await home.pickAccent('Фиолетовый');

  await expect.poll(() => home.screenScheme()).toBe('dark');
  await expect.poll(() => home.screenDirection()).toBe('rtl');

  const violet = await home.screenLook();
  expect(numior.font).toContain('Manrope');
  expect(violet.font).not.toContain('Manrope');
  expect(violet.fill).not.toBe(numior.fill);
  expect(await home.siteDirection()).not.toBe('rtl');
  expect(await home.siteAccent()).toBeNull();

  await home.pickAccent('Numior');
  await expect.poll(async () => (await home.screenLook()).font).toContain('Manrope');
});

test('the editor on the home page takes text right on the page', async ({ docs }) => {
  await docs.open('/');
  const home = docs.home();
  await expect(docs.frames).toHaveCount(0);

  await home.typeInEditor(', если стоит на ровном полу');

  await expect(home.editor()).toContainText('Выдерживает до 120 кг, если стоит на ровном полу');
});

test('the home page shows the table and the tree among the components', async ({
  docs,
  isMobile,
}) => {
  test.skip(isMobile, 'a phone shows the first column of cards only');
  await docs.open('/');
  const home = docs.home();

  await expect(home.screen.getByRole('grid', { name: 'Последние заказы' })).toBeVisible();
  await expect(home.screen.getByRole('tree', { name: 'Разделы каталога' })).toBeVisible();
});

test('the skip link moves focus to the home content', async ({ docs, isMobile }) => {
  test.skip(isMobile, 'keyboard only');
  await docs.open('/');
  await docs.tabForward();
  await expect(docs.skipLink).toBeFocused();

  await docs.followFocusedLink();
  await expect(docs.main).toBeFocused();
});
