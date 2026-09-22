import { expect, test } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import { expectRgb } from './helpers/color';

test('standalone button activates by keyboard and loading blocks activation', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  const button = page.getByTestId('primary');
  if (isMobile) {
    await button.tap();
  } else {
    await button.focus();
    await expect(button).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(button).toHaveCSS('outline-style', 'solid');
  }
  await expect(page.getByRole('status')).toHaveText('Нажатий: 1');
  await page.getByTestId('loading').click();
  await expect(page.getByTestId('loading')).toBeDisabled();
  await expect(page.getByTestId('loading')).toHaveAttribute('aria-busy', 'true');
  await page.getByRole('checkbox').uncheck();
  await expect(page.getByTestId('loading')).toBeEnabled();
});

test('theme, scoped overrides, density and RTL work without Tailwind', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  const workspace = page.getByRole('main');
  const primary = page.getByTestId('primary');
  await expectRgb(workspace, 'background-color', [24, 24, 27]);
  await page.getByTestId('theme').selectOption('light');
  await expectRgb(workspace, 'background-color', [255, 255, 255]);
  await expectRgb(page.getByTestId('nested'), 'background-color', [165, 180, 252]);
  await page.getByTestId('accent').selectOption('emerald');
  await expectRgb(primary, 'background-color', [4, 120, 87]);
  await expectRgb(page.getByTestId('utility'), 'background-color', [4, 120, 87]);
  await expectRgb(page.getByTestId('nested'), 'background-color', [165, 180, 252]);
  await page.getByTestId('density').selectOption('compact');
  await expect(primary).toHaveCSS('min-block-size', '32px');
  await page.getByTestId('direction').selectOption('rtl');
  await expect(workspace).toHaveCSS('direction', 'rtl');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('Tailwind utilities consume the same runtime tokens as native CSS', async ({ page }) => {
  await page.goto('/tailwind.html');
  await page.getByTestId('theme').selectOption('light');
  await page.getByTestId('accent').selectOption('rose');
  for (const id of ['primary', 'utility', 'tailwind']) {
    await expectRgb(page.getByTestId(id), 'background-color', [190, 18, 60]);
    await expectRgb(page.getByTestId(id), 'color', [255, 255, 255]);
  }
});

test('light and dark playground have no automatically detectable WCAG AA violations', async ({
  page,
}) => {
  await page.goto('/');
  for (const theme of ['light', 'dark']) {
    await page.getByTestId('theme').selectOption(theme);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  }
});
