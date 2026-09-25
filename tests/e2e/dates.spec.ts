import { expect, test } from '@playwright/test';
import { PlaygroundPage } from './pages/playground';

test.describe('dates', () => {
  test('calendar picks by click, moves with the keyboard and switches views', async ({
    page,
    isMobile,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { dates } = playground;
    await dates.calendar.scrollIntoViewIfNeeded();
    await expect.poll(() => dates.captionText(dates.calendar)).toBe('сентябрь 2026');
    await dates.day(dates.calendar, '2026-09-10').click();
    await expect.poll(async () => (await dates.readOutput()).date).toBe('2026-09-10');
    await expect(dates.day(dates.calendar, '2026-09-12')).toHaveAttribute('aria-disabled', 'true');
    await dates.day(dates.calendar, '2026-09-12').click({ force: true });
    await expect.poll(async () => (await dates.readOutput()).date).toBe('2026-09-10');
    if (isMobile) {
      return;
    }
    await dates.day(dates.calendar, '2026-09-10').focus();
    await page.keyboard.press('ArrowRight');
    await expect(dates.day(dates.calendar, '2026-09-11')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(dates.day(dates.calendar, '2026-09-18')).toBeFocused();
    await page.keyboard.press('End');
    await expect(dates.day(dates.calendar, '2026-09-20')).toBeFocused();
    await page.keyboard.press('PageDown');
    await expect.poll(() => dates.captionText(dates.calendar)).toBe('октябрь 2026');
    await expect(dates.day(dates.calendar, '2026-10-20')).toBeFocused();
    await page.keyboard.press('Shift+PageDown');
    await expect.poll(() => dates.captionText(dates.calendar)).toBe('декабрь 2026');
    await expect(dates.day(dates.calendar, '2026-12-31')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await dates.readOutput()).date).toBe('2026-12-31');
    await dates.calendar.getByRole('button', { name: 'Выбрать месяц' }).click();
    await expect(dates.calendar.getByRole('group', { name: 'Выбрать месяц' })).toBeVisible();
    await dates.calendar.getByRole('button', { name: /^сент/ }).click();
    await expect.poll(() => dates.captionText(dates.calendar)).toBe('сентябрь 2026');
    await expect.poll(async () => (await dates.readOutput()).month).toBe('2026-09');
  });

  test('date picker parses typed text, opens from the button and returns focus after a pick', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { dates } = playground;
    const input = dates.input(dates.picker);
    await input.scrollIntoViewIfNeeded();
    await input.fill('24.09.2026');
    await expect.poll(async () => (await dates.readOutput()).picked).toBe('2026-09-24');
    await dates.openButton(dates.picker).click();
    await expect(dates.dialog(dates.picker)).toBeVisible();
    await expect(dates.day(dates.picker, '2026-09-24')).toBeFocused();
    await dates.day(dates.picker, '2026-09-30').click();
    await expect(dates.dialog(dates.picker)).toBeHidden();
    await expect(input).toHaveValue('30.09.2026');
    await expect(input).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(dates.dialog(dates.picker)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dates.dialog(dates.picker)).toBeHidden();
    await expect(input).toBeFocused();
    await dates.picker.getByRole('button', { name: 'Очистить' }).click();
    await expect.poll(async () => (await dates.readOutput()).picked).toBeNull();
  });

  test('range picker takes two picks or a preset and the time picker keeps the time', async ({
    page,
    isMobile,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { dates } = playground;
    await dates.rangePicker.scrollIntoViewIfNeeded();
    await dates.openButton(dates.rangePicker).click();
    await expect(dates.dialog(dates.rangePicker)).toBeVisible();
    await expect(dates.rangePicker.getByRole('grid')).toHaveCount(2);
    await dates.day(dates.rangePicker, '2026-09-10').click();
    await expect(dates.dialog(dates.rangePicker)).toBeVisible();
    await dates.day(dates.rangePicker, '2026-09-03').click();
    await expect(dates.dialog(dates.rangePicker)).toBeHidden();

    await expect
      .poll(async () => (await dates.readOutput()).period)
      .toEqual({
        start: '2026-09-03',
        end: '2026-09-10',
      });

    await expect(dates.input(dates.rangePicker, 0)).toHaveValue('03.09.2026');
    await expect(dates.input(dates.rangePicker, 1)).toHaveValue('10.09.2026');
    await dates.openButton(dates.rangePicker).click();
    await dates.preset(dates.dialog(dates.rangePicker), 'Последние 7 дней').click();
    await expect(dates.dialog(dates.rangePicker)).toBeHidden();
    const output = await dates.readOutput();
    expect(output.period.end).toBe(output.today);
    const timeInput = dates.input(dates.timePicker);
    await expect(timeInput).toHaveValue('24.09.2026 09:30');
    await timeInput.fill('25.09.2026 10:15');
    await expect.poll(async () => (await dates.readOutput()).moment).toBe('2026-09-25T10:15');
    if (isMobile) {
      return;
    }
    await dates.openButton(dates.timePicker).click();
    await dates.day(dates.timePicker, '2026-09-28').click();
    await expect(dates.dialog(dates.timePicker)).toBeVisible();
    await expect.poll(async () => (await dates.readOutput()).moment).toBe('2026-09-28T10:15');
    await page.keyboard.press('Escape');
    await expect(dates.dialog(dates.timePicker)).toBeHidden();
  });

  test('range calendar previews on hover, drags a range and stays left-to-right sane in RTL', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'pointer drag and hover need a mouse');
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { dates } = playground;
    await dates.range.scrollIntoViewIfNeeded();
    await dates.day(dates.range, '2026-09-08').click();
    await dates.day(dates.range, '2026-09-12').hover();

    await expect(dates.day(dates.range, '2026-09-10').locator('..')).toHaveClass(
      /nui-calendar__cell--preview/,
    );

    await dates.day(dates.range, '2026-09-12').click();

    await expect
      .poll(async () => (await dates.readOutput()).range)
      .toEqual({
        start: '2026-09-08',
        end: '2026-09-12',
      });

    await dates.dragDays(dates.range, '2026-09-21', '2026-09-24');

    await expect
      .poll(async () => (await dates.readOutput()).range)
      .toEqual({
        start: '2026-09-21',
        end: '2026-09-24',
      });

    await playground.setDirection('rtl');
    await dates.day(dates.calendar, '2026-09-15').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(dates.day(dates.calendar, '2026-09-16')).toBeFocused();
    const box = await dates.range.boundingBox();
    const viewport = page.viewportSize();
    expect(box && viewport && box.x + box.width <= viewport.width + 1).toBe(true);
    await playground.setDirection('ltr');
  });

  test('dates have no automatically detectable WCAG AA violations', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { dates } = playground;
    await dates.picker.scrollIntoViewIfNeeded();
    await dates.openButton(dates.picker).click();
    await expect(dates.dialog(dates.picker)).toBeVisible();
    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      expect(await playground.wcagViolations()).toEqual([]);
    }
  });
});
