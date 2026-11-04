import { expect, test } from './fixtures';
import { boxOf } from './helpers/geometry';

test.describe('dates', () => {
  test('calendar picks by click, moves with the keyboard and switches views', async ({
    playground,
    dates,
    page,
    isMobile,
  }) => {
    await playground.open();
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
    playground,
    dates,
    page,
  }) => {
    await playground.open();
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

  test('date fields mask typed digits and a field opens its calendar from a click', async ({
    playground,
    dates,
    page,
  }) => {
    await playground.open();
    const typed = dates.input(dates.picker);
    await typed.scrollIntoViewIfNeeded();
    await typed.click();
    await page.keyboard.type('4.5');

    await expect(typed).toHaveValue('04.05.');
    await expect(dates.dialog(dates.picker)).toBeHidden();

    await page.keyboard.type('2026');
    await expect.poll(async () => (await dates.readOutput()).picked).toBe('2026-05-04');

    await page.keyboard.press('Home');
    await page.keyboard.type('1');
    await expect(typed).toHaveValue('14.05.2026');

    const input = dates.input(dates.clickPicker);
    await input.scrollIntoViewIfNeeded();
    await input.click();

    await expect(dates.dialog(dates.clickPicker)).toBeVisible();
    await expect(input).toBeFocused();

    await page.keyboard.type('03102026');
    await expect(input).toHaveValue('03.10.2026');
    await expect.poll(async () => (await dates.readOutput()).delivery).toBe('2026-10-03');

    await page.keyboard.press('Escape');
    await expect(dates.dialog(dates.clickPicker)).toBeHidden();
    await expect(input).toBeFocused();
  });

  test('range picker takes two picks or a preset and the time picker keeps the time', async ({
    playground,
    dates,
    page,
    isMobile,
  }) => {
    await playground.open();
    await dates.rangePicker.scrollIntoViewIfNeeded();
    await dates.openButton(dates.rangePicker).click();
    await expect(dates.dialog(dates.rangePicker)).toBeVisible();
    await expect(dates.rangePicker.getByRole('grid')).toHaveCount(2);

    const third = await dates.dayOfThisMonth(3);
    const tenth = await dates.dayOfThisMonth(10);

    await dates.day(dates.rangePicker, tenth).click();
    await expect(dates.dialog(dates.rangePicker)).toBeVisible();

    await dates.day(dates.rangePicker, third).click();
    await expect(dates.dialog(dates.rangePicker)).toBeHidden();

    await expect
      .poll(async () => (await dates.readOutput()).period)
      .toEqual({ start: third, end: tenth });

    await expect(dates.input(dates.rangePicker, 0)).toHaveValue(dates.typed(third));
    await expect(dates.input(dates.rangePicker, 1)).toHaveValue(dates.typed(tenth));

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
    playground,
    dates,
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'pointer drag and hover need a mouse');
    await playground.open();
    await dates.range.scrollIntoViewIfNeeded();
    const eighth = await dates.dayOfThisMonth(8);
    const twelfth = await dates.dayOfThisMonth(12);

    await dates.day(dates.range, eighth).click();
    await dates.day(dates.range, twelfth).hover();

    await expect(dates.day(dates.range, await dates.dayOfThisMonth(10)).locator('..')).toHaveClass(
      /nui-calendar__cell--preview/,
    );

    await dates.day(dates.range, twelfth).click();

    await expect
      .poll(async () => (await dates.readOutput()).range)
      .toEqual({ start: eighth, end: twelfth });

    const from = await dates.dayOfThisMonth(21);
    const to = await dates.dayOfThisMonth(24);

    await dates.dragDays(dates.range, from, to);

    await expect
      .poll(async () => (await dates.readOutput()).range)
      .toEqual({ start: from, end: to });

    await playground.setDirection('rtl');
    await dates.day(dates.calendar, '2026-09-15').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(dates.day(dates.calendar, '2026-09-16')).toBeFocused();

    const box = await boxOf(dates.range);
    expect(box.x + box.width).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) + 1);

    await playground.setDirection('ltr');
  });

  test('dates have no automatically detectable WCAG AA violations', async ({
    playground,
    dates,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await dates.picker.scrollIntoViewIfNeeded();
    await dates.openButton(dates.picker).click();
    await expect(dates.dialog(dates.picker)).toBeVisible();

    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      expect(await playground.wcagViolations()).toEqual([]);
    }
  });
});
