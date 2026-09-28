import { expect, test } from '@playwright/test';
import { NuxtApp } from '../pages/nuxt-app';

test('the nuxt app hydrates cleanly, applies the stored scheme and shows a toast', async ({
  page,
}) => {
  const app = new NuxtApp(page);
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

test('kit links route through NuxtLink without a reload', async ({ page }) => {
  const app = new NuxtApp(page);
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

test('the nuxt pages have no automatically detectable WCAG AA violations', async ({ page }) => {
  const app = new NuxtApp(page);
  await app.open('/');
  await expect(app.home).toBeVisible();
  expect(await app.wcagViolations()).toEqual([]);
  await app.open('/about');
  await expect(app.aboutPage).toBeVisible();
  expect(await app.wcagViolations()).toEqual([]);
});
