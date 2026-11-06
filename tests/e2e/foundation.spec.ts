import { expect, test } from './fixtures';
import { expectRgb, rgbOf, tokenRgbIn } from './helpers/color';
import { boxOf } from './helpers/geometry';
import type { Theme } from './pages/playground';

test('standalone button activates by keyboard and loading blocks activation', async ({
  playground,
  buttons: { primary, loading, loadingToggle, link },
  page,
  isMobile,
}) => {
  await playground.open();

  if (isMobile) {
    await primary.tap();
  } else {
    await primary.focus();
    await expect(primary).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(primary).toHaveCSS('outline-style', 'solid');
  }

  await expect(playground.clickCount).toHaveText('Нажатий: 1');
  expect(await link.evaluate((element) => element.tagName)).toBe('A');
  await expect(link).toHaveAttribute('href', '#buttons-title');
  await expect(link).toHaveCSS('text-decoration-line', 'none');

  const [linkBox, primaryBox] = await Promise.all([boxOf(link), boxOf(primary)]);
  expect(linkBox.height).toBe(primaryBox.height);

  const idleBox = await boxOf(loading);

  if (isMobile) {
    await loading.tap();
  } else {
    await loading.focus();
    await page.keyboard.press('Enter');
    await expect(loading).toBeFocused();
  }

  await expect(loading).toBeDisabled();
  await expect(loading).toHaveAttribute('aria-busy', 'true');

  const busyBox = await boxOf(loading);
  expect(busyBox.width).toBe(idleBox.width);

  await loadingToggle.uncheck();
  await expect(loading).toBeEnabled();
});

test('theme, scoped overrides, density and RTL work without Tailwind', async ({
  playground,
  buttons: { primary, nested, large },
}) => {
  await playground.emulate({ colorScheme: 'dark' });
  await playground.open();
  await expectRgb(playground.workspace, 'background-color', [24, 24, 27]);
  await expect(playground.resolvedScheme).toHaveText('dark');

  await playground.setTheme('light');
  await expectRgb(playground.workspace, 'background-color', [255, 255, 255]);
  await expect(playground.resolvedScheme).toHaveText('light');
  await expectRgb(nested, 'background-color', [165, 180, 252]);

  await playground.setAccent('emerald');
  await expectRgb(primary, 'background-color', [11, 118, 77]);
  await expectRgb(playground.tailwindSwatch, 'background-color', [11, 118, 77]);
  await expectRgb(nested, 'background-color', [165, 180, 252]);
  await expect(large).toHaveCSS('min-block-size', '48px');

  await playground.setDensity('compact');
  await expect(primary).toHaveCSS('min-block-size', '32px');
  await expect(large).toHaveCSS('min-block-size', '40px');

  await playground.setDirection('rtl');
  await expect(playground.workspace).toHaveCSS('direction', 'rtl');
  expect(await playground.hasHorizontalOverflow()).toBe(false);
});

test('soft fills inside an overlay mix with the overlay surface, not the page', async ({
  playground,
  navigation,
}) => {
  await playground.emulate({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await playground.open();
  await navigation.menuTrigger.click();

  await expect(navigation.menu).toBeVisible();

  const onPage = await tokenRgbIn(playground.workspace, '--nui-neutral-soft');
  const inMenu = await tokenRgbIn(navigation.menu, '--nui-neutral-soft');
  const menuSurface = await rgbOf(navigation.menu, 'background-color');

  expect(inMenu[0]).toBeGreaterThan(onPage[0]);
  expect(inMenu[0]).toBeGreaterThan(menuSurface[0] + 8);
});

test('Tailwind utilities consume the same runtime tokens as native CSS', async ({
  playground,
  buttons,
}) => {
  await playground.open();
  await playground.setTheme('light');
  await playground.setAccent('rose');

  for (const target of [buttons.primary, playground.tailwindSwatch]) {
    await expectRgb(target, 'background-color', [191, 18, 78]);
    await expectRgb(target, 'color', [255, 255, 255]);
  }
});

test('every enabled control that reacts to a click shows the pointer cursor', async ({
  playground,
}) => {
  await playground.open();
  expect(await playground.controlsWithoutPointer()).toEqual([]);
});

test('light and dark playground have no automatically detectable WCAG AA violations', async ({
  playground,
}) => {
  test.slow();
  await playground.emulate({ reducedMotion: 'reduce' });
  await playground.open();

  const themes: Theme[] = ['light', 'dark'];

  for (const theme of themes) {
    await playground.setTheme(theme);
    expect(await playground.wcagViolations()).toEqual([]);
  }
});
