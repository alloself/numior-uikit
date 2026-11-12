import { expect, test } from './fixtures';
import { expectRgb } from './helpers/color';
import { boxOf, gapBetween } from './helpers/geometry';

test.describe('layers', () => {
  test('dialog opens modally, traps focus, closes on Escape and restores focus', async ({
    playground,
    overlays,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const before = await boxOf(overlays.dialogOpen);
    await overlays.dialogOpen.click();
    await expect(overlays.dialog).toBeVisible();
    await expect(overlays.dialog).toHaveAccessibleName('Удалить проект?');
    await expect(overlays.dialog).toHaveAccessibleDescription('Действие нельзя отменить.');
    expect(await overlays.focusIsInside(overlays.dialog)).toBe(true);
    expect(await overlays.documentOverflow()).toBe('hidden');
    expect((await boxOf(overlays.dialogOpen)).x).toBe(before.x);

    await overlays.pressEscape();
    await expect(overlays.dialog).toBeHidden();
    await expect(overlays.dialogOpen).toBeFocused();
    expect(await overlays.documentOverflow()).not.toBe('hidden');
  });

  test('the page stays locked for as long as a closing dialog is on screen and its text is never scaled', async ({
    playground,
    overlays,
  }) => {
    await playground.open();
    const before = await boxOf(overlays.dialogOpen);

    await overlays.dialogOpen.click();
    await expect(overlays.dialog).toBeVisible();
    expect(await overlays.scaleOf(overlays.dialog)).toBe('none');

    await overlays.watchLeave(overlays.dialog);
    await overlays.pressEscape();
    await expect(overlays.dialog).toBeHidden();
    await expect.poll(() => overlays.leaveState(overlays.dialog)).toBe('locked');
    await expect.poll(() => overlays.documentOverflow()).not.toBe('hidden');
    expect((await boxOf(overlays.dialogOpen)).x).toBe(before.x);
  });

  test('a closing dialog fades over several frames with the page still locked', async ({
    playground,
    overlays,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'Firefox and WebKit remove a closed dialog at once');
    await playground.open();
    await overlays.dialogOpen.click();
    await expect(overlays.dialog).toBeVisible();

    await overlays.watchLeave(overlays.dialog);
    await overlays.pressEscape();
    await expect.poll(() => overlays.leaveState(overlays.dialog)).toBe('locked');
    expect(await overlays.leaveFrames(overlays.dialog)).toBeGreaterThan(1);
  });

  test('dialog closes from a method=dialog form with its return value and from the backdrop', async ({
    playground,
    overlays,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await overlays.dialogOpen.click();
    await overlays.dialogConfirm.click();
    await expect(overlays.dialog).toBeHidden();
    await expect.poll(async () => (await overlays.readOutput()).dialogResult).toBe('confirm');

    await overlays.dialogOpen.click();
    await expect(overlays.dialog).toBeVisible();

    await overlays.clickBackdrop();
    await expect(overlays.dialog).toBeHidden();
    await expect.poll(async () => (await overlays.readOutput()).dialogOpen).toBe(false);
  });

  test('stacked dialogs share one backdrop, close one level per Escape and hand focus back down', async ({
    playground,
    overlays,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await overlays.dialogOpen.click();
    await overlays.stackedOpen.click();
    await expect(overlays.stackedDialog).toBeVisible();
    await expect(overlays.dialog).toHaveClass(/nui-dialog--covered/);
    expect(await overlays.backdropColor(overlays.dialog)).toBe('rgba(0, 0, 0, 0)');
    expect(await overlays.backdropColor(overlays.stackedDialog)).not.toBe('rgba(0, 0, 0, 0)');
    expect(await overlays.focusIsInside(overlays.stackedDialog)).toBe(true);

    await overlays.pressEscape();
    await expect(overlays.stackedDialog).toBeHidden();
    await expect(overlays.dialog).toBeVisible();
    await expect(overlays.dialog).not.toHaveClass(/nui-dialog--covered/);
    await expect(overlays.stackedOpen).toBeFocused();
    await expect.poll(async () => (await overlays.readOutput()).stackedOpen).toBe(false);

    await overlays.pressEscape();
    await expect(overlays.dialog).toBeHidden();
    await expect(overlays.dialogOpen).toBeFocused();
  });

  test('persistent dialog ignores Escape and the backdrop until its button is used', async ({
    playground,
    overlays,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await overlays.persistentOpen.click();
    await expect(overlays.persistentDialog).toBeVisible();

    await overlays.pressEscape();
    await overlays.clickBackdrop();
    await expect(overlays.persistentDialog).toBeVisible();

    await overlays.pressEscape();
    await overlays.pressEscape();
    await overlays.pressEscape();

    await expect(overlays.persistentDialog).toBeVisible();

    await overlays.persistentClose.click();
    await expect(overlays.persistentDialog).toBeHidden();
  });

  test('a long dialog scrolls its body and keeps the title and the footer in view', async ({
    playground,
    overlays,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await overlays.longDialogOpen.click();
    await expect(overlays.longDialog).toBeVisible();

    expect(await overlays.scrollers(overlays.longDialog)).toEqual({ frame: false, body: true });
    expect(await overlays.isInsideViewport(overlays.longDialog)).toBe(true);

    await overlays.scrollBodyToEnd(overlays.longDialog);

    await expect(
      overlays.longDialog.getByRole('heading', { name: 'Условия сервиса' }),
    ).toBeInViewport();

    await expect(overlays.longDialogAccept).toBeInViewport();

    await overlays.longDialogAccept.click();
    await expect(overlays.longDialog).toBeHidden();
  });

  test('drawer docks to the end edge and shows its content', async ({ playground, overlays }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await overlays.drawerOpen.click();
    await expect(overlays.drawer).toBeVisible();
    expect((await overlays.edges(overlays.drawer)).right).toBe(await overlays.fixedViewportWidth());
    await expect(overlays.drawerInput).toBeVisible();

    await overlays.pressEscape();
    await expect(overlays.drawer).toBeHidden();
  });

  test('drawer follows RTL for the start side and docks to the top edge', async ({
    playground,
    overlays,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await playground.setDirection('rtl');
    await overlays.setDrawerSide('start');
    await overlays.drawerOpen.click();
    await expect(overlays.drawer).toBeVisible();
    expect((await overlays.edges(overlays.drawer)).right).toBe(await overlays.fixedViewportWidth());
    expect(await playground.hasHorizontalOverflow()).toBe(false);

    await overlays.pressEscape();
    await expect(overlays.drawer).toBeHidden();

    await overlays.setDrawerSide('top');
    await overlays.drawerOpen.click();
    await expect(overlays.drawer).toBeVisible();
    expect((await overlays.edges(overlays.drawer)).top).toBe(0);
  });

  test('a dialog opened inside a nested dark scope keeps that theme in the top layer', async ({
    playground,
    overlays,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await playground.setTheme('light');
    await overlays.nestedDialogOpen.click();
    await expect(overlays.nestedDialog).toBeVisible();
    await expectRgb(overlays.nestedDialog, 'background-color', [39, 39, 42]);
    await expectRgb(playground.workspace, 'background-color', [255, 255, 255]);
  });

  test('popover opens from its native invoker, positions in view and light-dismisses', async ({
    playground,
    overlays,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await overlays.popoverTrigger.click();
    await expect(overlays.popover).toBeVisible();
    await expect(overlays.popoverTrigger).toHaveAttribute('aria-expanded', 'true');
    expect(await overlays.isInsideViewport(overlays.popover)).toBe(true);
    await expect.poll(async () => (await overlays.readOutput()).popoverOpen).toBe(true);

    await overlays.pressEscape();
    await expect(overlays.popover).toBeHidden();
    await expect(overlays.popoverTrigger).toHaveAttribute('aria-expanded', 'false');

    await overlays.popoverTrigger.click();
    await expect(overlays.popover).toBeVisible();

    await overlays.clickBackdrop();
    await expect(overlays.popover).toBeHidden();
    await expect.poll(async () => (await overlays.readOutput()).popoverOpen).toBe(false);
  });

  test('a popover stands as far from its trigger as a menu and steps back for its arrow', async ({
    playground,
    overlays,
    navigation,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();

    const arrowed = await overlays.popoverGap();

    await overlays.popoverArrow.click();

    const plain = await overlays.popoverGap();

    await navigation.menuTrigger.click();
    await expect(navigation.menu).toBeVisible();

    expect(plain).toBe(await gapBetween(navigation.menuTrigger, navigation.menu));
    expect(plain).toBe(4);
    expect(arrowed).toBe(8);
  });

  test('popover content follows the trigger in the tab order', async ({
    playground,
    overlays,
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard navigation is a desktop scenario');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await overlays.popoverTrigger.focus();
    await page.keyboard.press('Enter');
    await expect(overlays.popover).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(overlays.popoverInput).toBeFocused();
  });

  test('tooltip shows the keys of its action level with the text and as tall as a plain one', async ({
    playground,
    overlays,
    chrome,
    isMobile,
  }) => {
    test.skip(isMobile, 'tooltips stay hidden on touch');

    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await overlays.tooltipTrigger.focus();

    const plain = await boxOf(overlays.tooltip);

    await overlays.keysTooltipTrigger.focus();

    await expect(overlays.keysTooltip).toBeVisible();

    expect(await overlays.tooltipKeys()).toEqual(
      (await chrome.isApplePlatform()) ? ['⇧', '⌘', 'C'] : ['Ctrl', 'Shift', 'C'],
    );

    expect(await overlays.tooltipKeysSkew()).toBeLessThanOrEqual(1);
    expect((await boxOf(overlays.keysTooltip)).height).toBe(plain.height);
    await expect(overlays.keysTooltipTrigger).toHaveAccessibleDescription(/^Скопировать ссылку/);
  });

  test('tooltip appears on hover and focus, hides on leave and Escape, ignores touch', async ({
    playground,
    overlays,
    page,
    isMobile,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();

    if (isMobile) {
      await overlays.tooltipTrigger.tap();
      await page.waitForTimeout(500);
      await expect(overlays.tooltip).toBeHidden();
      return;
    }

    await overlays.tooltipTrigger.hover();
    await expect(overlays.tooltip).toBeVisible();
    await expect(overlays.tooltip).toHaveRole('tooltip');

    await expect(overlays.tooltipTrigger).toHaveAccessibleDescription(
      'Сохраняет документ и историю',
    );

    await page.mouse.move(0, 0);
    await expect(overlays.tooltip).toBeHidden();

    await overlays.tooltipTrigger.focus();
    await expect(overlays.tooltip).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(overlays.tooltip).toBeHidden();
    await expect(overlays.tooltipTrigger).toBeFocused();
  });

  test('open layers have no automatically detectable WCAG AA violations', async ({
    playground,
    overlays,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();

    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      await overlays.popoverTrigger.click();
      await expect(overlays.popover).toBeVisible();
      expect(await playground.wcagViolations(overlays.scope)).toEqual([]);

      await overlays.pressEscape();
      await expect(overlays.popover).toBeHidden();

      await overlays.dialogOpen.click();
      await expect(overlays.dialog).toBeVisible();
      expect(await playground.wcagViolations(overlays.scope)).toEqual([]);

      await overlays.pressEscape();
      await expect(overlays.dialog).toBeHidden();
    }
  });
});
