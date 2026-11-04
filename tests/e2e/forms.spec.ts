import { expect, test } from './fixtures';
import { expectRgb } from './helpers/color';
import { boxOf } from './helpers/geometry';

test.describe('form controls', () => {
  test('field wiring: labels focus controls, output follows input, errors are announced', async ({
    playground,
    forms,
    page,
  }) => {
    await playground.open();
    await forms.label('Имя').click();
    await expect(forms.nameInput).toBeFocused();

    await forms.nameInput.fill('Алексей');
    await expect.poll(async () => (await forms.readOutput()).name).toBe('Алексей');

    await forms.emailInput.fill('nope');
    await expect(forms.emailInput).toHaveAttribute('aria-invalid', 'true');

    const describedBy = await forms.emailInput.getAttribute('aria-describedby');
    expect(describedBy?.split(' ')).toHaveLength(2);
    await expect(page.getByText('Укажите адрес с символом @')).toBeVisible();

    await forms.emailInput.fill('a@b.co');
    await expect(forms.emailInput).not.toHaveAttribute('aria-invalid', 'true');
    await expect.poll(async () => (await forms.readOutput()).email).toBe('a@b.co');
  });

  test('masked input formats while typing and keeps the raw digits in the model', async ({
    playground,
    forms,
    page,
  }) => {
    await playground.open();
    await forms.phoneInput.click();
    await forms.phoneInput.pressSequentially('999123');
    await expect(forms.phoneInput).toHaveValue('+7 (999) 123');
    await expect.poll(async () => (await forms.readOutput()).phone).toBe('999123');

    await page.keyboard.press('Backspace');
    await expect(forms.phoneInput).toHaveValue('+7 (999) 12');

    await forms.phoneInput.pressSequentially('x34567');
    await expect(forms.phoneInput).toHaveValue('+7 (999) 123-45-67');
    await expect.poll(async () => (await forms.readOutput()).phone).toBe('9991234567');
  });

  test('checkboxes toggle boolean and array models and expose indeterminate', async ({
    playground,
    forms,
    page,
    isMobile,
  }) => {
    await playground.open();

    if (isMobile) {
      await forms.terms.tap();
    } else {
      await forms.terms.focus();
      await page.keyboard.press('Space');
    }

    await expect(forms.terms).toBeChecked();
    await expect.poll(async () => (await forms.readOutput()).terms).toBe(true);

    expect(
      await forms.indeterminate.evaluate(
        (element) => element instanceof HTMLInputElement && element.indeterminate,
      ),
    ).toBe(true);

    await forms.channelEmail.check();
    await forms.channelSms.check();
    await expect.poll(async () => (await forms.readOutput()).channels).toEqual(['email', 'sms']);

    await forms.channelEmail.uncheck();
    await expect.poll(async () => (await forms.readOutput()).channels).toEqual(['sms']);
  });

  test('radio group is a labelled native group with arrow-key navigation', async ({
    playground,
    forms,
    page,
    isMobile,
  }) => {
    await playground.open();
    await expect(forms.radioGroup).toHaveRole('radiogroup');
    await expect(forms.radioGroup).toHaveAccessibleName('Тариф');
    await expect(forms.radios.free).toBeChecked();

    if (isMobile) {
      await forms.radios.team.tap();
    } else {
      await forms.radios.free.focus();
      await page.keyboard.press('ArrowDown');
    }

    await expect(forms.radios.team).toBeChecked();
    await expect.poll(async () => (await forms.readOutput()).plan).toBe('team');

    const names = await Promise.all(
      Object.values(forms.radios).map((radio) => radio.getAttribute('name')),
    );

    expect(new Set(names).size).toBe(1);
  });

  test('switch is a native switch and stays inside its track in RTL', async ({
    playground,
    forms,
  }) => {
    await playground.open();
    await expect(forms.notifications).toHaveRole('switch');
    await expect(forms.notifications).toBeChecked();

    await forms.notifications.uncheck();
    await expect.poll(async () => (await forms.readOutput()).notifications).toBe(false);

    await playground.setDirection('rtl');
    await forms.notifications.check();
    await expect(forms.notifications).toBeChecked();
    expect(await playground.hasHorizontalOverflow()).toBe(false);
  });

  test('focused input keeps the focus border under the pointer', async ({ playground, forms }) => {
    await playground.open();
    await playground.setTheme('light');
    await forms.nameInput.focus();
    await forms.nameInput.hover();
    await expectRgb(forms.wrapperOf(forms.nameInput), 'border-top-color', [67, 56, 202]);
  });

  test('double-clicking a toggle label does not select its text', async ({
    playground,
    forms,
    page,
  }) => {
    await playground.open();
    await forms.label('Принимаю условия').dblclick();
    expect(await page.evaluate(() => document.getSelection()?.isCollapsed ?? true)).toBe(true);
  });

  test('controls follow density and size steps', async ({ playground, forms }) => {
    await playground.open();
    await expect(forms.wrapperOf(forms.nameInput)).toHaveCSS('min-block-size', '40px');
    await expect(forms.wrapperOf(forms.largeInput)).toHaveCSS('min-block-size', '48px');

    await playground.setDensity('compact');
    await expect(forms.wrapperOf(forms.nameInput)).toHaveCSS('min-block-size', '32px');
    await expect(forms.wrapperOf(forms.largeInput)).toHaveCSS('min-block-size', '40px');
  });

  test('controls keep their size and fit their field without a page-wide box-sizing reset', async ({
    playground,
    forms,
  }) => {
    await playground.open();
    const frame = await boxOf(forms.wrapperOf(forms.nameInput));
    const field = await boxOf(forms.fieldOf(forms.nameInput));
    expect(frame.height).toBe(40);
    expect(frame.width).toBeCloseTo(field.width, 0);
  });

  test('forms with a visible error have no detectable WCAG AA violations', async ({
    playground,
    forms,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await forms.emailInput.fill('nope');
    await expect(forms.emailInput).toHaveAttribute('aria-invalid', 'true');

    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      expect(await playground.wcagViolations(forms.scope)).toEqual([]);
    }
  });
});
