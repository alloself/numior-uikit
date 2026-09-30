import { expect, test } from '@playwright/test';
import { OtpSection } from './pages/otp';
import { PlaygroundPage } from './pages/playground';

test.describe('one-time code field', () => {
  test('types a code slot by slot, skips letters and verifies it once complete', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { otp } = playground;
    await otp.clickSlot(otp.sms, 3);
    await expect(otp.sms).toBeFocused();
    await expect(otp.caretOf(otp.sms)).toHaveCount(1);
    expect(await otp.activeSlots(otp.sms)).toEqual([0]);
    await page.keyboard.type('12a3');
    expect(await otp.slotTexts(otp.sms)).toEqual(['1', '2', '3', '', '', '']);
    expect(await otp.activeSlots(otp.sms)).toEqual([3]);
    await page.keyboard.type('456');
    await expect.poll(async () => (await otp.readOutput()).state).toBe('passed');
    expect((await otp.readOutput()).completed).toEqual(['123456']);
    await expect(otp.caretOf(otp.sms)).toHaveCount(0);
    expect(await otp.activeSlots(otp.sms)).toEqual([5]);
  });

  test('clears a wrong code, shows the error and keeps the focus for another try', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { otp } = playground;
    await otp.clickSlot(otp.sms, 0);
    await page.keyboard.type('000000');
    await expect(otp.errorOf(otp.sms)).toHaveText('Неверный код, попробуйте ещё раз');
    await expect.poll(async () => (await otp.readOutput()).sms).toBe('');
    await expect(otp.sms).toBeFocused();
    expect(await otp.activeSlots(otp.sms)).toEqual([0]);
    await page.keyboard.type('1');
    await expect(otp.errorOf(otp.sms)).toHaveCount(0);
  });

  test('overwrites a clicked slot, deletes to the left and moves with the arrows', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { otp } = playground;
    await otp.clickSlot(otp.spare, 0);
    await page.keyboard.type('482913');
    await otp.clickSlot(otp.spare, 2);
    expect(await otp.activeSlots(otp.spare)).toEqual([2]);
    await page.keyboard.type('7');
    await expect.poll(async () => (await otp.readOutput()).spare).toBe('487913');
    expect(await otp.activeSlots(otp.spare)).toEqual([3]);
    await page.keyboard.press('Backspace');
    await expect.poll(async () => (await otp.readOutput()).spare).toBe('48713');
    expect(await otp.activeSlots(otp.spare)).toEqual([2]);
    await page.keyboard.press('ArrowLeft');
    expect(await otp.activeSlots(otp.spare)).toEqual([1]);
    await page.keyboard.press('End');
    expect(await otp.activeSlots(otp.spare)).toEqual([5]);
    await expect(otp.caretOf(otp.spare)).toHaveCount(1);
  });

  test('pastes a whole code with its separators and upper-cases access codes', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { otp } = playground;
    await otp.clickSlot(otp.spare, 0);
    await otp.paste(otp.spare, 'Код: 482-913');
    await expect.poll(async () => (await otp.readOutput()).spare).toBe('482913');
    await otp.clickSlot(otp.access, 0);
    await page.keyboard.type('k7qx-9m2a');
    await expect.poll(async () => (await otp.readOutput()).access).toBe('K7QX9M2A');
    expect(await otp.slotTexts(otp.access)).toEqual(['K', '7', 'Q', 'X', '9', 'M', '2', 'A']);
  });

  test('shows the last PIN digit for a second, then collapses it into a dot', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await page.clock.install();
    await playground.open();
    const { otp } = playground;
    await expect(otp.pin).toHaveAttribute('type', 'password');
    await otp.clickSlot(otp.pin, 0);
    await page.keyboard.type('48');
    await expect(otp.dots(otp.pin)).toHaveCount(2);
    expect(await otp.revealedSlots(otp.pin)).toEqual([1]);
    await page.clock.runFor(1000);
    await expect.poll(() => otp.revealedSlots(otp.pin)).toEqual([]);
    await expect.poll(async () => (await otp.readOutput()).pin).toBe('48');
  });

  test('fills the SMS code received through WebOTP', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await OtpSection.stubWebOtp(page, '123456');
    await playground.open();
    const { otp } = playground;
    await expect.poll(async () => (await otp.readOutput()).state).toBe('passed');
    expect(await otp.slotTexts(otp.sms)).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  test('offers another code only after the countdown', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await page.clock.install();
    await playground.open();
    const { otp } = playground;
    await expect(otp.resend).toBeDisabled();
    await expect(otp.resend).toHaveText('Отправить ещё раз через 30 с');
    await page.clock.runFor(30_000);
    await expect(otp.resend).toBeEnabled();
    await expect(otp.resend).toHaveText('Отправить ещё раз');
    await otp.resend.click();
    await expect(otp.resend).toBeDisabled();
  });

  test('keeps slots left-to-right in RTL and fits a narrow screen', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { otp } = playground;
    await playground.setDirection('rtl');
    const rtl = await otp.slotBoxes(otp.access);
    expect(rtl.every((box, index) => index === 0 || box.x > (rtl[index - 1]?.x ?? 0))).toBe(true);
    expect(await playground.hasHorizontalOverflow()).toBe(false);
    await playground.setDirection('ltr');
    await playground.resize({ width: 360, height: 720 });
    const narrow = await otp.slotBoxes(otp.access);
    expect(narrow.every((box) => box.x >= 0 && box.x + box.width <= 360)).toBe(true);
    expect(narrow.every((box) => Math.abs(box.width - box.height) < 1)).toBe(true);
    expect(await otp.overflows()).toBe(false);
  });

  test('slots follow sizes and density steps', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.resize({ width: 1280, height: 900 });
    await playground.open();
    const { otp } = playground;
    await expect(otp.slotOf(otp.sms, 0)).toHaveCSS('block-size', '40px');
    await expect(otp.slotOf(otp.spare, 0)).toHaveCSS('block-size', '48px');
    await expect(otp.slotOf(otp.readonlyCode, 0)).toHaveCSS('block-size', '32px');
    await playground.setDensity('compact');
    await expect(otp.slotOf(otp.sms, 0)).toHaveCSS('block-size', '32px');
  });

  test('one-time code fields have no automatically detectable WCAG AA violations', async ({
    page,
  }) => {
    test.slow();
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { otp } = playground;
    await otp.clickSlot(otp.spare, 0);
    await page.keyboard.type('48');
    await page.keyboard.press('Tab');
    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      expect(await playground.wcagViolations()).toEqual([]);
    }
  });
});
