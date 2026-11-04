import { expect, test } from './fixtures';
import { paintedRgb, rgbDelta } from './helpers/color';
import { bottomOf } from './pages/feedback';
import { boxOf } from './helpers/geometry';

test.describe('feedback', () => {
  test('a toast fired from an open dialog paints above it and outlives it', async ({
    playground,
    feedback,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await feedback.toastDialogOpen.click();
    await expect(feedback.toastDialog).toBeVisible();

    await feedback.toastFromDialog.click();
    const toast = feedback.toastByText('Уведомление №1');
    await expect(toast).toBeVisible();

    const aboveDialog = await paintedRgb(toast);
    await page.keyboard.press('Escape');
    await expect(feedback.toastDialog).toBeHidden();
    await expect(toast).toBeVisible();
    expect(rgbDelta(aboveDialog, await paintedRgb(toast))).toBeLessThanOrEqual(2);

    await feedback.closeButtonOf(toast).click();
    await expect(toast).toBeHidden();
    await expect.poll(async () => (await feedback.readOutput()).toastCount).toBe(0);
  });

  test('toasts stack behind the newest one, expand on hover and close with square buttons', async ({
    playground,
    feedback,
    isMobile,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await feedback.toastShow.click();
    await feedback.toastShow.click();
    await feedback.toastError.click();
    const front = feedback.toastByText('Не удалось сохранить');
    await expect(front).toBeVisible();
    expect(await feedback.isSquare(feedback.closeButtonOf(front))).toBe(true);
    await expect(feedback.stackItems).toHaveCount(3);

    const [frontBox, behindBox] = [await feedback.stackBox(0), await feedback.stackBox(1)];
    expect(behindBox.y).toBeLessThan(bottomOf(frontBox));
    expect(bottomOf(behindBox)).toBeGreaterThan(bottomOf(frontBox));
    expect(behindBox.width).toBeLessThan(frontBox.width);

    if (!isMobile) {
      await front.hover();

      await expect
        .poll(async () => (await feedback.stackBox(1)).y)
        .toBeGreaterThanOrEqual(bottomOf(await feedback.stackBox(0)));

      expect(Math.round((await feedback.stackBox(1)).width)).toBe(Math.round(frontBox.width));
    }
  });

  test('toasts auto-dismiss after their duration and pause while hovered', async ({
    playground,
    feedback,
    page,
    isMobile,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await feedback.toastQuick.click();
    const toast = feedback.toastByText('Быстрое уведомление');
    await expect(toast).toBeVisible();

    if (!isMobile) {
      await toast.hover();
      await page.waitForTimeout(2000);
      await expect(toast).toBeVisible();

      await page.mouse.move(0, 0);
    }

    await expect(toast).toBeHidden({ timeout: 3000 });
    await expect.poll(async () => (await feedback.readOutput()).toastCount).toBe(0);
  });

  test('error toasts are alerts, keep focusable actions and close on Escape', async ({
    playground,
    feedback,
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard scenario');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await expect(feedback.toaster).toHaveAttribute('aria-live', 'polite');

    await feedback.toastError.click();
    const toast = feedback.toastByText('Не удалось сохранить');
    await expect(toast).toHaveRole('alert');

    await feedback.actionOf(toast).focus();
    await page.keyboard.press('Escape');
    await expect(toast).toBeHidden();

    await feedback.toastError.click();
    await feedback.actionOf(feedback.toastByText('Не удалось сохранить')).click();
    await expect(feedback.toastByText('Повторили')).toBeVisible();
    await expect(feedback.toastByText('Не удалось сохранить')).toBeHidden();
  });

  test('the toaster docks to its placement, mirrors in RTL and fills narrow screens', async ({
    playground,
    feedback,
    overlays,
    isMobile,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await feedback.toastError.click();
    const width = await overlays.fixedViewportWidth();
    const inset = isMobile ? 8 : 16;
    expect((await overlays.edges(feedback.toaster)).right).toBe(width - inset);

    await playground.setDirection('rtl');
    await feedback.setPlacement('top-start');
    expect((await overlays.edges(feedback.toaster)).right).toBe(width - inset);

    if (isMobile) {
      const box = await boxOf(feedback.toaster);
      expect(Math.round(box.width)).toBe(width - inset * 2);
    }
  });

  test('alert dismisses through its close button and progress exposes native semantics', async ({
    playground,
    feedback,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await expect(feedback.alert).toBeVisible();

    await feedback.alert.getByRole('button', { name: 'Закрыть' }).click();
    await expect(feedback.alert).toBeHidden();
    await expect.poll(async () => (await feedback.readOutput()).alertOpen).toBe(false);

    await feedback.alertReset.click();
    await expect(feedback.alert).toBeVisible();

    await feedback.setProgress('65');
    await expect(feedback.progressDeterminate).toHaveAttribute('value', '65');
    await expect(feedback.progressDeterminate).toHaveRole('progressbar');
    await expect(feedback.progressDeterminate).toHaveAccessibleName('Загрузка');
    await expect(feedback.progressDeterminate).toHaveAttribute('aria-valuetext', '65%');
    await expect(feedback.progressIndeterminate).toHaveJSProperty('position', -1);

    await expect(feedback.skeleton.locator('.nui-skeleton').first()).toHaveAttribute(
      'aria-hidden',
      'true',
    );

    expect(await feedback.animationName(feedback.skeletonLine)).toBe('none');
  });

  test('visible feedback has no automatically detectable WCAG AA violations', async ({
    playground,
    feedback,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();

    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      await feedback.toastShow.click();
      await feedback.toastError.click();
      await expect(feedback.toastByText('Не удалось сохранить')).toBeVisible();
      expect(await playground.wcagViolations()).toEqual([]);

      await feedback.closeButtonOf(feedback.toastByText('Не удалось сохранить')).click();
    }
  });
});
