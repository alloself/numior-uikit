import { expect, test } from './fixtures';
import { rgbOf } from './helpers/color';
import { boxOf } from './helpers/geometry';

const SCROLL_RANGE_STEP = 1;

test('separators carry semantics, stretch across their axis and take a label', async ({
  playground,
  chrome,
}) => {
  await playground.open();
  await expect(chrome.horizontalSeparator).toHaveRole('separator');
  await expect(chrome.horizontalSeparator).toHaveCSS('height', '1px');

  const toolbar = await boxOf(chrome.toolbar);
  const vertical = await boxOf(chrome.verticalSeparator);
  expect(vertical.width).toBe(1);
  expect(vertical.height).toBe(toolbar.height);
  await expect(chrome.verticalSeparator).toHaveAttribute('aria-orientation', 'vertical');
  await expect(chrome.decorativeSeparator).toHaveAttribute('role', 'none');
  await expect(chrome.labelledSeparator).toHaveText('или');
  await expect(chrome.labelledSeparator).toHaveAccessibleName('или');
  expect(await chrome.labelLineWidth()).toBeGreaterThan(40);
  expect(await playground.wcagViolations(chrome.scope)).toEqual([]);
});

test('kbd renders combos per platform, boxed or plain', async ({ playground, chrome }) => {
  await playground.open();
  const apple = await chrome.isApplePlatform();
  expect(await chrome.keysOf(chrome.comboKbd)).toEqual(apple ? ['⌘', 'K'] : ['Ctrl', 'K']);

  expect(await chrome.keysOf(chrome.listKbd)).toEqual(
    apple ? ['⇧', '⌘', 'P'] : ['Ctrl', 'Shift', 'P'],
  );

  expect(await chrome.keysOf(chrome.plainKbd)).toEqual(['Esc']);
  await expect(chrome.firstKeyOf(chrome.comboKbd)).toHaveCSS('border-bottom-width', '2px');
  await expect(chrome.firstKeyOf(chrome.plainKbd)).toHaveCSS('border-bottom-width', '0px');
});

test('code blocks number and highlight lines, copy their source and expand', async ({
  playground,
  chrome,
}) => {
  await chrome.stubClipboard();
  await playground.open();
  const code = chrome.titledCode;
  await expect(code).toContainText('main.ts');
  expect(await chrome.hasLineNumber(code, 1)).toBe(true);
  expect(await chrome.hasLineNumber(code, 3)).toBe(true);
  expect(await chrome.hasLineNumber(chrome.plainCode, 1)).toBe(false);
  expect(await chrome.linePaddingOf(chrome.plainCode)).toBeGreaterThan(8);

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
  playground,
  chrome,
  isMobile,
}) => {
  await playground.open();
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
  await chrome.focusNextToggleItem();
  await expect(chrome.toggleItem(chrome.schemeToggle, 'Системная')).toBeFocused();
  await expect(dark).toHaveAttribute('aria-checked', 'true');

  await chrome.pressFocusedToggleItem();
  await expect(chrome.toggleOutput).toHaveText('system · preview, code');
});

test('an overflowing toggle group shows the chosen item and scrolls with its edge buttons and the wheel', async ({
  playground,
  chrome,
  isMobile,
}) => {
  await playground.emulate({ reducedMotion: 'reduce' });
  await playground.open();
  await chrome.periodToggle.scrollIntoViewIfNeeded();

  await expect(chrome.toggleItem(chrome.periodToggle, 'Квартал')).toBeInViewport({ ratio: 1 });
  await expect(chrome.periodEdge('end')).toBeVisible();

  await chrome.pagePeriodTo('end');

  await expect(chrome.periodEdge('end')).toBeHidden();
  await expect(chrome.periodEdge('start')).toBeVisible();
  await expect.poll(() => chrome.periodItemHiddenPart('Всё время')).toBeLessThan(SCROLL_RANGE_STEP);

  await chrome.pagePeriodTo('start');

  await expect(chrome.periodEdge('start')).toBeHidden();
  await expect.poll(() => chrome.periodScroll()).toBe(0);
  await expect(chrome.toggleItem(chrome.periodToggle, 'День')).toBeInViewport({ ratio: 1 });

  if (isMobile) {
    return;
  }

  const pageScroll = await chrome.pageScrollY();

  await chrome.wheelOverPeriod(120);

  await expect.poll(() => chrome.periodScroll()).toBe(120);
  await expect(chrome.periodEdge('start')).toBeVisible();
  expect(await chrome.pageScrollY()).toBe(pageScroll);
});

test('collapsible and accordion reveal content with motion and hide it until found', async ({
  playground,
  chrome,
  isMobile,
}) => {
  await playground.open();
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
  await chrome.focusNextTrigger();
  await expect(tailwind).toBeFocused();

  await chrome.focusFirstTrigger();
  await expect(ssr).toBeFocused();
});

test('the command palette opens on top, filters as you type and picks with the keyboard', async ({
  playground,
  chrome,
  page,
  isMobile,
}) => {
  await playground.open();
  await expect(chrome.commandDialog).toBeHidden();

  await chrome.commandOpen.click();
  await expect(chrome.commandDialog).toBeVisible();
  await expect(chrome.commandInput).toBeFocused();
  expect(await chrome.dialogCornerClipped()).toBe(true);

  const box = await boxOf(chrome.commandDialog);
  expect(box.y).toBeLessThan((page.viewportSize()?.height ?? 0) / 4);
  await expect(chrome.commandOptions()).toHaveCount(5);
  await expect(chrome.activeCommand()).toHaveText('Начало работы');

  await chrome.commandInput.fill('тем');
  await expect(chrome.commandOptions()).toHaveCount(2);
  await expect(chrome.activeCommand()).toHaveText('Темизация');

  await chrome.highlightNextCommand();
  await expect(chrome.activeCommand()).toHaveText('Переключить тему');

  await chrome.runHighlightedCommand();
  await expect(chrome.commandDialog).toBeHidden();
  await expect(chrome.commandOutput).toHaveText('theme');

  await chrome.commandOpen.click();
  await expect(chrome.commandInput).toHaveValue('');
  await expect(chrome.commandOptions()).toHaveCount(5);

  await chrome.commandInput.fill('темизация');
  await expect(chrome.commandOptions()).toHaveCount(1);

  await chrome.closeCommandPalette();
  await expect(chrome.commandDialog).toBeHidden();

  if (isMobile) {
    return;
  }

  await chrome.openCommandPaletteWithShortcut();
  await expect(chrome.commandDialog).toBeVisible();
  await expect(chrome.commandInput).toHaveValue('');

  await chrome.closeCommandPalette();
  await expect(chrome.commandDialog).toBeHidden();
});

test('the table of contents follows the section in view and links to headings', async ({
  playground,
  chrome,
}) => {
  await playground.open();
  await expect(chrome.toc).toHaveRole('navigation');
  await expect(chrome.toc).toHaveAccessibleName('На странице');
  await expect(chrome.tocLinks()).toHaveCount(5);
  await expect(chrome.tocLinks().nth(2)).toHaveAttribute('href', '#toc-basic');

  await chrome.tocArticle.scrollIntoViewIfNeeded();
  await expect(chrome.currentTocLink()).toHaveText('Установка');

  await chrome.scrollArticleTo('toc-advanced');
  await expect(chrome.currentTocLink()).toHaveText('Расширенный пример');

  await chrome.scrollArticleTo('toc-api');
  await expect(chrome.currentTocLink()).toHaveText('API');

  await chrome.tocLinks().nth(2).click();
  await expect(chrome.currentTocLink()).toHaveText('Базовый пример');

  await chrome.outwaitTocScroll();
  await expect(chrome.currentTocLink()).toHaveText('Базовый пример');
});

test('the table of contents marks the current section with a square on request', async ({
  playground,
  chrome,
}) => {
  await playground.open();
  await chrome.tocArticle.scrollIntoViewIfNeeded();
  await expect(chrome.toc).toHaveClass(/nui-toc--marker-line/);
  await expect(chrome.currentTocLink()).toHaveText('Установка');

  await chrome.tocMarkerSwitch.click();
  await expect(chrome.toc).toHaveClass(/nui-toc--marker-square/);
  await expect.poll(() => chrome.currentTocMarker()).toEqual({ opacity: 1, width: 6, height: 6 });

  await chrome.tocMarkerSwitch.click();
  await expect(chrome.toc).toHaveClass(/nui-toc--marker-line/);
});

test('the skip link appears on focus and moves focus to its target', async ({
  playground,
  isMobile,
}) => {
  test.skip(isMobile, 'keyboard navigation');
  await playground.open();
  await expect(playground.skipLink).toHaveCSS('opacity', '0');

  await playground.tabForward();
  await expect(playground.skipLink).toBeFocused();
  await expect(playground.skipLink).toHaveCSS('opacity', '1');

  await playground.activateFocusedControl();
  await expect(playground.formsTitle).toBeFocused();
});

test('the splitter resizes its first pane by pointer and keyboard within its bounds', async ({
  playground,
  chrome,
  isMobile,
}) => {
  await playground.open();
  await chrome.splitter.scrollIntoViewIfNeeded();
  await expect(chrome.splitterDivider).toHaveRole('separator');
  expect(await chrome.splitterValue()).toBe(50);

  const { width } = await boxOf(chrome.splitter);
  const before = await boxOf(chrome.splitterStart);

  if (!isMobile) {
    await chrome.dragDividerBy(width / 5);
    await expect.poll(() => chrome.splitterValue()).toBeGreaterThan(65);

    const after = await boxOf(chrome.splitterStart);
    expect(after.width).toBeGreaterThan(before.width + width / 8);
  }

  await chrome.splitterDivider.focus();
  await chrome.moveSplitterToMin();
  await expect.poll(() => chrome.splitterValue()).toBe(20);

  await chrome.nudgeSplitterForward();
  await expect.poll(() => chrome.splitterValue()).toBe(25);

  await chrome.moveSplitterToMax();
  await expect.poll(() => chrome.splitterValue()).toBe(80);
});
