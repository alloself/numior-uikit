import { expect, test } from '../fixtures';

test('the home page copies the install line and leads to the guide', async ({ docs, page }) => {
  await docs.stubClipboard();
  await docs.open('/');
  const home = docs.home();
  await expect(home.title).toHaveText('UI-кит для Vue 3');
  await expect(docs.sidebar).toHaveCount(0);
  await expect(home.facts.getByText(/^\d+$/)).toBeVisible();

  await home.copyInstall.click();

  await expect
    .poll(async () => (await docs.copiedTexts()).at(-1))
    .toBe('pnpm add @numior/vue @numior/tokens');

  await home.start.click();
  await expect(page).toHaveURL(/\/guide\/getting-started$/);
});

test('the skip link moves focus to the home content', async ({ docs, page, isMobile }) => {
  test.skip(isMobile, 'keyboard only');
  await docs.open('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'К содержимому' })).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(docs.main).toBeFocused();
});
