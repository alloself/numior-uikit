import { expect, test } from '../fixtures';

test('the nuxt app hydrates cleanly, applies the stored scheme and shows a toast', async ({
  app,
}) => {
  await app.open('/', 'dark');
  await expect(app.home).toBeVisible();
  expect(await app.theme()).toBe('dark');
  await expect(app.install).toContainText('pnpm add @numior/nuxt');

  await app.notify.click();
  await expect(app.toasts).toHaveCount(1);
  await expect(app.toasts.first()).toContainText('Готово');
  expect(app.hydrationProblems).toEqual([]);
  expect(app.errors).toEqual([]);
});

test('kit links route through NuxtLink without a reload', async ({ app, page }) => {
  await app.open('/');
  await expect(app.home).toBeVisible();

  await app.mark();
  await app.about.click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(app.aboutPage).toBeVisible();
  expect(await app.marked()).toBe('kept');

  await app.back.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(app.home).toBeVisible();
  expect(await app.marked()).toBe('kept');
});

test('the nuxt pages have no automatically detectable WCAG AA violations', async ({ app }) => {
  await app.open('/');
  await expect(app.home).toBeVisible();
  expect(await app.wcagViolations()).toEqual([]);

  await app.open('/about');
  await expect(app.aboutPage).toBeVisible();
  expect(await app.wcagViolations()).toEqual([]);
});
