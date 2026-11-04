import { expect, test } from './fixtures';
import { boxOf } from './helpers/geometry';

test.describe('numbers and time', () => {
  test('number field formats on blur, steps with keys and steppers and follows the locale', async ({
    playground,
    intl,
    page,
    isMobile,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await expect(intl.price).toHaveValue(/1\s234,50\s€/);

    await intl.price.fill('99,9');
    await intl.price.blur();
    await expect.poll(async () => (await intl.readOutput()).price).toBe(99.9);
    await expect(intl.price).toHaveValue(/99,90\s€/);

    if (!isMobile) {
      await intl.price.focus();
      await page.keyboard.press('ArrowUp');
      await expect.poll(async () => (await intl.readOutput()).price).toBe(100);

      await page.keyboard.press('Shift+ArrowDown');
      await expect.poll(async () => (await intl.readOutput()).price).toBe(95);
    }

    await intl.stepperOf(intl.quantity, 'up').click();
    await expect.poll(async () => (await intl.readOutput()).quantity).toBe(1);
    await expect(intl.stepperOf(intl.quantity, 'down')).toBeEnabled();
    await expect(intl.stepperOf(intl.quantity, 'up')).toHaveAttribute('aria-label', 'Увеличить');

    await intl.setLocale('en-US');
    await expect(intl.price).toHaveValue(/€(95\.00|99\.90)/);
    await expect(intl.discount).toHaveValue('15%');
    await expect(intl.stepperOf(intl.quantity, 'up')).toHaveAttribute('aria-label', 'Increment');

    await intl.setLocale('de-DE');
    await expect(intl.price).toHaveValue(/(95,00|99,90)\s€/);
    await expect(intl.stepperOf(intl.quantity, 'down')).toHaveAttribute('aria-label', 'Verringern');
    await expect(intl.clockOf(intl.start, 'Uhrzeit wählen')).toHaveCount(1);
  });

  test('time field types with auto-advance, steps and picks on the wheels', async ({
    playground,
    intl,
    page,
    isMobile,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await expect(intl.segments(intl.start)).toHaveCount(2);

    await intl.segment(intl.start, 'час').click();
    await page.keyboard.type('0930');
    await expect.poll(async () => (await intl.readOutput()).start).toBe('09:30');
    await expect(intl.segment(intl.start, 'минута')).toBeFocused();

    await page.keyboard.press('ArrowUp');
    await expect.poll(async () => (await intl.readOutput()).start).toBe('09:31');

    await intl.clockOf(intl.start, 'Выбрать время').click();
    await expect(intl.panelOf(intl.start)).toBeVisible();
    await expect(intl.wheelOf(intl.start, 'минута')).toBeFocused();
    await expect(intl.wheelOf(intl.start, 'минута')).toHaveAttribute('aria-valuetext', '31');

    await page.keyboard.press('ArrowUp');
    await expect.poll(async () => (await intl.readOutput()).start).toBe('09:30');

    if (!isMobile) {
      await intl.turnWheel(intl.start, 'минута', -1);
      await expect.poll(async () => (await intl.readOutput()).start).toBe('09:00');
    }

    await page.keyboard.press('Home');
    await intl.wheelItem(intl.start, 'час', '10').click();
    await expect.poll(async () => (await intl.readOutput()).start).toBe('10:00');

    await intl.wheelOf(intl.start, 'час').focus();
    await page.keyboard.press('End');
    await expect.poll(async () => (await intl.readOutput()).start).toBe('18:00');
    await expect(intl.wheelItem(intl.start, 'минута', '30')).toHaveClass(/--disabled/);

    await page.keyboard.press('Home');
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await intl.readOutput()).start).toBe('09:00');
    await expect(intl.panelOf(intl.start)).toBeHidden();
    await expect(intl.segment(intl.start, 'час')).toBeFocused();

    await intl.clockOf(intl.start, 'Выбрать время').click();
    await intl.wheelItem(intl.start, 'час', '10').click();
    await expect.poll(async () => (await intl.readOutput()).start).toBe('10:00');

    await page.keyboard.press('Escape');
    await expect(intl.panelOf(intl.start)).toBeHidden();

    await intl.setLocale('en-US');
    await expect(intl.segments(intl.start)).toHaveCount(3);
    await expect(intl.segment(intl.start, 'hour')).toHaveValue('10');
    await expect(intl.segment(intl.start, 'AM/PM')).toHaveValue('AM');

    if (!isMobile) {
      await intl.segment(intl.start, 'AM/PM').click();
      await page.keyboard.type('p');
      await expect.poll(async () => (await intl.readOutput()).start).toBe('22:00');

      await page.keyboard.press('Tab');
      await expect.poll(async () => (await intl.readOutput()).start).toBe('18:00');
    }

    await expect(intl.segments(intl.precise)).toHaveCount(3);
    await expect(intl.segment(intl.precise, 'second')).toHaveValue('09');
  });

  test('time segments stay left-to-right in RTL without horizontal overflow', async ({
    playground,
    intl,
  }) => {
    await playground.open();
    await playground.setDirection('rtl');
    const hour = await boxOf(intl.segment(intl.start, 'час'));
    const minute = await boxOf(intl.segment(intl.start, 'минута'));
    expect(hour.x).toBeLessThan(minute.x);
    expect(await playground.hasHorizontalOverflow()).toBe(false);
  });

  test('fields follow density steps', async ({ playground, intl }) => {
    await playground.open();
    await expect(intl.frameOf(intl.quantity)).toHaveCSS('min-block-size', '40px');
    await expect(intl.frameOf(intl.start)).toHaveCSS('min-block-size', '40px');

    await playground.setDensity('compact');
    await expect(intl.frameOf(intl.quantity)).toHaveCSS('min-block-size', '32px');
    await expect(intl.frameOf(intl.start)).toHaveCSS('min-block-size', '32px');
  });

  test('number and time fields have no automatically detectable WCAG AA violations', async ({
    playground,
    intl,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await intl.clockOf(intl.start, 'Выбрать время').click();
    await expect(intl.panelOf(intl.start)).toBeVisible();

    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      expect(await playground.wcagViolations()).toEqual([]);
    }
  });
});
