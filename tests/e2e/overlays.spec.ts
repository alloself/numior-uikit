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

  test('open layers have no automatically detectable WCAG AA violations', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { overlays } = playground;
    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      await overlays.dialogOpen.click();
      await expect(overlays.dialog).toBeVisible();
      expect(await playground.wcagViolations()).toEqual([]);
      await overlays.pressEscape();
      await expect(overlays.dialog).toBeHidden();
    }
  });
});
