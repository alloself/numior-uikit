import { expect, test } from '@playwright/test';
import { expectRgb } from './helpers/color';
import { PlaygroundPage } from './pages/playground';

test.describe('layers', () => {
  test('dialog opens modally, traps focus, closes on Escape and restores focus', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { overlays } = playground;
    await overlays.dialogOpen.click();
    await expect(overlays.dialog).toBeVisible();
    await expect(overlays.dialog).toHaveAccessibleName('Удалить проект?');
    await expect(overlays.dialog).toHaveAccessibleDescription('Действие нельзя отменить.');
    expect(await overlays.focusIsInside(overlays.dialog)).toBe(true);
    expect(await overlays.documentOverflow()).toBe('hidden');
    await overlays.pressEscape();
    await expect(overlays.dialog).toBeHidden();
    await expect(overlays.dialogOpen).toBeFocused();
    expect(await overlays.documentOverflow()).not.toBe('hidden');
  });

  test('dialog closes from a method=dialog form with its return value and from the backdrop', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { overlays } = playground;
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
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { overlays } = playground;
    await overlays.dialogOpen.click();
    await overlays.stackedOpen.click();
    await expect(overlays.stackedDialog).toBeVisible();
    await expect(overlays.stackedDialog).toHaveClass(/nui-dialog--nested/);
    expect(await overlays.backdropColor(overlays.stackedDialog)).toBe('rgba(0, 0, 0, 0)');
    expect(await overlays.backdropColor(overlays.dialog)).not.toBe('rgba(0, 0, 0, 0)');
    expect(await overlays.focusIsInside(overlays.stackedDialog)).toBe(true);
    await overlays.pressEscape();
    await expect(overlays.stackedDialog).toBeHidden();
    await expect(overlays.dialog).toBeVisible();
    await expect(overlays.stackedOpen).toBeFocused();
    await expect.poll(async () => (await overlays.readOutput()).stackedOpen).toBe(false);
    await overlays.pressEscape();
    await expect(overlays.dialog).toBeHidden();
    await expect(overlays.dialogOpen).toBeFocused();
  });

  test('persistent dialog ignores Escape and the backdrop until its button is used', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { overlays } = playground;
    await overlays.persistentOpen.click();
    await expect(overlays.persistentDialog).toBeVisible();
    await overlays.pressEscape();
    await overlays.clickBackdrop();
    await expect(overlays.persistentDialog).toBeVisible();
    await overlays.persistentClose.click();
    await expect(overlays.persistentDialog).toBeHidden();
  });

  test('drawer docks to the end edge and shows its content', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { overlays } = playground;
    await overlays.drawerOpen.click();
    await expect(overlays.drawer).toBeVisible();
    expect((await overlays.edges(overlays.drawer)).right).toBe(await overlays.fixedViewportWidth());
    await expect(overlays.drawerInput).toBeVisible();
    await overlays.pressEscape();
    await expect(overlays.drawer).toBeHidden();
  });

  test('drawer follows RTL for the start side and docks to the top edge', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { overlays } = playground;
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
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await playground.setTheme('light');
    const { overlays } = playground;
    await overlays.nestedDialogOpen.click();
    await expect(overlays.nestedDialog).toBeVisible();
    await expectRgb(overlays.nestedDialog, 'background-color', [39, 39, 42]);
    await expectRgb(playground.workspace, 'background-color', [255, 255, 255]);
  });

  test('popover opens from its native invoker, positions in view and light-dismisses', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { overlays } = playground;
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

  test('popover content follows the trigger in the tab order', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard navigation is a desktop scenario');
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { overlays } = playground;
    await overlays.popoverTrigger.focus();
    await page.keyboard.press('Enter');
    await expect(overlays.popover).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(overlays.popoverInput).toBeFocused();
  });

  test('tooltip appears on hover and focus, hides on leave and Escape, ignores touch', async ({
    page,
    isMobile,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { overlays } = playground;
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

  test('open layers have no automatically detectable WCAG AA violations', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { overlays } = playground;
    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      await overlays.popoverTrigger.click();
      await expect(overlays.popover).toBeVisible();
      expect(await playground.wcagViolations()).toEqual([]);
      await overlays.pressEscape();
      await expect(overlays.popover).toBeHidden();
      await overlays.dialogOpen.click();
      await expect(overlays.dialog).toBeVisible();
      expect(await playground.wcagViolations()).toEqual([]);
      await overlays.pressEscape();
      await expect(overlays.dialog).toBeHidden();
    }
  });
});
