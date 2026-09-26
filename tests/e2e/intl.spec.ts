import { expect, test } from '@playwright/test';
import { PlaygroundPage } from './pages/playground';

test.describe('numbers and time', () => {
  test('number field formats on blur, steps with keys and steppers and follows the locale', async ({
    page,
    isMobile,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { intl } = playground;
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

  test('time field types with auto-advance, steps and picks a suggestion', async ({
    page,
    isMobile,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { intl } = playground;
    await expect(intl.segments(intl.start)).toHaveCount(2);
    await intl.segment(intl.start, 'час').click();
    await page.keyboard.type('0930');
    await expect.poll(async () => (await intl.readOutput()).start).toBe('09:30');
    await expect(intl.segment(intl.start, 'минута')).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect.poll(async () => (await intl.readOutput()).start).toBe('09:31');
    await intl.clockOf(intl.start, 'Выбрать время').click();
    await expect(intl.listboxOf(intl.start)).toBeVisible();
    await intl.option(intl.start, '10:00').click();
    await expect.poll(async () => (await intl.readOutput()).start).toBe('10:00');
    await expect(intl.listboxOf(intl.start)).toBeHidden();
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

  test('time segments stay left-to-right in RTL without horizontal overflow', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { intl } = playground;
    await playground.setDirection('rtl');
    const hour = await intl.segment(intl.start, 'час').boundingBox();
    const minute = await intl.segment(intl.start, 'минута').boundingBox();
    expect(hour && minute && hour.x < minute.x).toBe(true);
    expect(await playground.hasHorizontalOverflow()).toBe(false);
  });

  test('fields follow density steps', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { intl } = playground;
    await expect(intl.frameOf(intl.quantity)).toHaveCSS('min-block-size', '40px');
    await expect(intl.frameOf(intl.start)).toHaveCSS('min-block-size', '40px');
    await playground.setDensity('compact');
    await expect(intl.frameOf(intl.quantity)).toHaveCSS('min-block-size', '32px');
    await expect(intl.frameOf(intl.start)).toHaveCSS('min-block-size', '32px');
  });

  test('number and time fields have no automatically detectable WCAG AA violations', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { intl } = playground;
    await intl.clockOf(intl.start, 'Выбрать время').click();
    await expect(intl.listboxOf(intl.start)).toBeVisible();
    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      expect(await playground.wcagViolations()).toEqual([]);
    }
  });
});
