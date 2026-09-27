import { expect, test } from '@playwright/test';
import { PlaygroundPage } from './pages/playground';

test('separators carry semantics, stretch across their axis and take a label', async ({ page }) => {
  const playground = new PlaygroundPage(page);
  await playground.open();
  const { chrome } = playground;
  await expect(chrome.horizontalSeparator).toHaveRole('separator');
  await expect(chrome.horizontalSeparator).toHaveCSS('height', '1px');
  const toolbar = await chrome.toolbar.boundingBox();
  const vertical = await chrome.verticalSeparator.boundingBox();
  expect(vertical?.width).toBe(1);
  expect(vertical?.height).toBe(toolbar?.height);
  await expect(chrome.verticalSeparator).toHaveAttribute('aria-orientation', 'vertical');
  await expect(chrome.decorativeSeparator).toHaveAttribute('role', 'none');
  await expect(chrome.labelledSeparator).toHaveText('или');
  expect(await chrome.labelLineWidth()).toBeGreaterThan(40);
});

test('kbd renders combos per platform, boxed or plain', async ({ page }) => {
  const playground = new PlaygroundPage(page);
  await playground.open();
  const { chrome } = playground;
  const apple = await chrome.isApplePlatform();
  expect(await chrome.keysOf(chrome.comboKbd)).toEqual(apple ? ['⌘', 'K'] : ['Ctrl', 'K']);

  expect(await chrome.keysOf(chrome.listKbd)).toEqual(
    apple ? ['⇧', '⌘', 'P'] : ['Shift', 'Ctrl', 'P'],
  );

  expect(await chrome.keysOf(chrome.plainKbd)).toEqual(['Esc']);
  await expect(chrome.firstKeyOf(chrome.comboKbd)).toHaveCSS('border-bottom-width', '2px');
  await expect(chrome.firstKeyOf(chrome.plainKbd)).toHaveCSS('border-bottom-width', '0px');
});
