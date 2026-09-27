import { expect, test } from '@playwright/test';
import { rgbOf } from './helpers/color';
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

test('code blocks number and highlight lines, copy their source and expand', async ({ page }) => {
  const playground = new PlaygroundPage(page);
  const { chrome } = playground;
  await chrome.stubClipboard();
  await playground.open();
  const code = chrome.titledCode;
  await expect(code).toContainText('main.ts');
  expect(await chrome.hasLineNumber(code, 1)).toBe(true);
  expect(await chrome.hasLineNumber(code, 3)).toBe(true);
  expect(await chrome.hasLineNumber(chrome.plainCode, 1)).toBe(false);
  const plainLine = await rgbOf(chrome.lineOf(code, 1), 'background-color');
  const highlighted = await rgbOf(chrome.lineOf(code, 2), 'background-color');
  expect(highlighted).not.toEqual(plainLine);
  const collapsed = await chrome.bodyHeightOf(code);
  const expand = chrome.expandButtonOf(code);
  await expect(expand).toHaveAttribute('aria-expanded', 'false');
  await expand.click();
  await expect(expand).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(() => chrome.bodyHeightOf(code)).toBeGreaterThan(collapsed);
  const copy = chrome.copyButtonOf(code);
  await expect(copy).toHaveAccessibleName('Скопировать код');
  await copy.click();
  await expect(copy).toHaveAccessibleName('Скопировано');
  await expect(code).toHaveClass(/nui-code--copied/);
  expect(await chrome.copiedTexts()).toEqual([expect.stringContaining('import { NuiButton }')]);
  await expect(chrome.copyButtonOf(chrome.plainCode)).toHaveCSS('opacity', '0');
  await chrome.plainCode.hover();
  await expect(chrome.copyButtonOf(chrome.plainCode)).toHaveCSS('opacity', '1');
});

test('toggle groups pick one scheme or several panels and rove focus', async ({
  page,
  isMobile,
}) => {
  const playground = new PlaygroundPage(page);
  await playground.open();
  const { chrome } = playground;
  const dark = chrome.toggleItem(chrome.schemeToggle, 'Тёмная');
  await expect(dark).toHaveRole('radio');
  await expect(dark).toHaveAttribute('aria-checked', 'false');
  await dark.click();
  await expect(dark).toHaveAttribute('aria-checked', 'true');
  await expect(chrome.toggleOutput).toHaveText('dark · preview');
  await dark.click();
  await expect(dark).toHaveAttribute('aria-checked', 'true');
  const code = chrome.toggleItem(chrome.panelsToggle, 'Код');
  await expect(code).toHaveAttribute('aria-pressed', 'false');
  await code.click();
  await expect(code).toHaveAttribute('aria-pressed', 'true');
  await expect(chrome.toggleOutput).toHaveText('dark · preview, code');
  await expect(chrome.toggleItem(chrome.panelsToggle, 'Терминал')).toBeDisabled();
  if (isMobile) {
    return;
  }
  await dark.focus();
  await page.keyboard.press('ArrowRight');
  await expect(chrome.toggleItem(chrome.schemeToggle, 'Системная')).toBeFocused();
  await expect(dark).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Space');
  await expect(chrome.toggleOutput).toHaveText('system · preview, code');
});

test('collapsible and accordion reveal content with motion and hide it until found', async ({
  page,
  isMobile,
}) => {
  const playground = new PlaygroundPage(page);
  await playground.open();
  const { chrome } = playground;
  const trigger = chrome.triggerOf(chrome.collapsible);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(chrome.contentOf(chrome.collapsible)).toHaveAttribute('hidden', /.*/);
  expect(await chrome.panelHeightOf(chrome.collapsible)).toBe(0);
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(chrome.contentOf(chrome.collapsible)).not.toHaveAttribute('hidden');
  await expect.poll(() => chrome.panelHeightOf(chrome.collapsible)).toBeGreaterThan(20);
  await trigger.click();
  await expect.poll(() => chrome.panelHeightOf(chrome.collapsible)).toBe(0);
  await expect(chrome.contentOf(chrome.collapsible)).toHaveAttribute('hidden', /.*/);
  const ssr = chrome.triggerOf(chrome.accordion, 'SSR');
  const tailwind = chrome.triggerOf(chrome.accordion, 'Tailwind');
  await expect(ssr).toHaveAttribute('aria-expanded', 'true');
  await expect(chrome.triggerOf(chrome.accordion, 'RTL')).toBeDisabled();
  await tailwind.click();
  await expect(tailwind).toHaveAttribute('aria-expanded', 'true');
  await expect(ssr).toHaveAttribute('aria-expanded', 'false');
  if (isMobile) {
    return;
  }
  await ssr.focus();
  await page.keyboard.press('ArrowDown');
  await expect(tailwind).toBeFocused();
  await page.keyboard.press('Home');
  await expect(ssr).toBeFocused();
});

test('the command palette opens on top, filters as you type and picks with the keyboard', async ({
  page,
  isMobile,
}) => {
  const playground = new PlaygroundPage(page);
  await playground.open();
  const { chrome } = playground;
  await expect(chrome.commandDialog).toBeHidden();
  await chrome.commandOpen.click();
  await expect(chrome.commandDialog).toBeVisible();
  await expect(chrome.commandInput).toBeFocused();
  const box = await chrome.commandDialog.boundingBox();
  const viewport = page.viewportSize();
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThan((viewport?.height ?? 0) / 2 + 40);
  await expect(chrome.commandOptions()).toHaveCount(5);
  await expect(chrome.activeCommand()).toHaveText('Начало работы');
  await chrome.commandInput.fill('тем');
  await expect(chrome.commandOptions()).toHaveCount(2);
  await expect(chrome.activeCommand()).toHaveText('Темизация');
  await page.keyboard.press('ArrowDown');
  await expect(chrome.activeCommand()).toHaveText('Переключить тему');
  await page.keyboard.press('Enter');
  await expect(chrome.commandDialog).toBeHidden();
  await expect(chrome.commandOutput).toHaveText('theme');
  if (isMobile) {
    return;
  }
  await page.keyboard.press('Control+k');
  await expect(chrome.commandDialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(chrome.commandDialog).toBeHidden();
});
