import { expect, test, type Page } from '@playwright/test';
import { expectRgb, rgbOf } from './helpers/color';
import { PlaygroundPage } from './pages/playground';
import { boxOf } from './helpers/geometry';

const openSignup = async (page: Page): Promise<PlaygroundPage> => {
  const playground = new PlaygroundPage(page);

  await playground.emulate({ reducedMotion: 'reduce' });
  await playground.open();
  await playground.setTheme('light');
  return playground;
};

test.describe('signup form', () => {
  test('Enter in an empty form focuses the first invalid field and keeps errors red under focus and hover', async ({
    page,
  }) => {
    const playground = await openSignup(page);
    const { signup } = playground;
    await signup.email.focus();
    await page.keyboard.press('Enter');
    await expect(signup.login).toBeFocused();
    await expect(signup.login).toHaveAttribute('aria-invalid', 'true');
    await expect(signup.errorOf(signup.login)).toHaveText('Заполните поле');
    await expect(signup.errorOf(signup.terms)).toHaveText('Нужно принять условия');
    await expect.poll(async () => (await signup.readOutput()).submitCount).toBe(1);
    const error = await rgbOf(signup.errorOf(signup.login), 'color');
    await expectRgb(signup.frameOf(signup.login), 'border-top-color', error);
    await expectRgb(signup.frameOf(signup.login), 'outline-color', error);
    await signup.email.hover();
    await expectRgb(signup.frameOf(signup.email), 'border-top-color', error);
    expect(await playground.hasHorizontalOverflow()).toBe(false);
  });

  test('a keyboard submit with only the terms left moves a visible error ring to the checkbox', async ({
    page,
  }) => {
    const { signup } = await openSignup(page);
    await signup.fillAccount();
    await page.keyboard.press('Enter');
    await expect(signup.terms).toBeFocused();
    expect(await signup.isFocusVisible(signup.terms)).toBe(true);
    const error = await rgbOf(signup.errorOf(signup.terms), 'color');
    await expectRgb(signup.checkboxBoxOf(signup.terms), 'outline-color', error);
    expect((await signup.readOutput()).submitted).toBe(0);
  });

  test('the login is checked when the field is left, with a spinner while the check runs', async ({
    page,
  }) => {
    const { signup } = await openSignup(page);
    await signup.login.fill('admin');
    await signup.email.focus();
    await expect(signup.checkingOf(signup.login)).toBeVisible();
    await expect(signup.errorOf(signup.login)).toHaveText('Этот логин уже занят');
    await expect(signup.checkingOf(signup.login)).toBeHidden();
    await expect(signup.login).toHaveAttribute('aria-invalid', 'true');
    await signup.login.fill('annie');
    await signup.email.focus();
    await expect(signup.errorOf(signup.login)).toBeHidden();
    await expect(signup.login).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('a server error on a field lands on it, takes the focus and clears once the value changes', async ({
    page,
  }) => {
    const { signup } = await openSignup(page);
    await signup.answer('Ошибка поля');
    await signup.fillValid();
    await signup.submit.click();
    await expect(signup.errorOf(signup.email)).toHaveText('Этот адрес уже зарегистрирован');
    await expect(signup.email).toBeFocused();
    await expect(signup.email).toHaveAttribute('aria-invalid', 'true');
    await signup.email.fill('ann@example.org');
    await expect(signup.errorOf(signup.email)).toBeHidden();
    expect((await signup.readOutput()).submitted).toBe(0);
  });

  test('a server error without a field shows an alert above the fields and moves the focus there', async ({
    page,
  }) => {
    const { signup } = await openSignup(page);
    await signup.answer('Ошибка формы');
    await signup.fillValid();
    await signup.submit.click();
    await expect(signup.alert).toBeFocused();
    await expect(signup.alert.getByRole('alert')).toContainText('Не удалось отправить форму');

    await expect(signup.alert.getByRole('alert')).toContainText(
      'Сервис регистрации временно недоступен',
    );

    expect((await boxOf(signup.alert)).y).toBeLessThan((await boxOf(signup.login)).y);

    await expect
      .poll(async () => (await signup.readOutput()).formErrors)
      .toEqual(['Сервис регистрации временно недоступен']);
  });

  test('a slow submit keeps the pressed button focused and as wide as before and ignores a second press', async ({
    page,
  }) => {
    const { signup } = await openSignup(page);
    await signup.answer('Медленный ответ');
    await signup.fillValid();
    const { width } = await boxOf(signup.submit);
    await signup.submit.focus();
    await page.keyboard.press('Enter');
    await expect(signup.form).toHaveAttribute('aria-busy', 'true');
    await expect(signup.submit).toBeFocused();
    await expect(signup.reset).toBeDisabled();
    expect((await boxOf(signup.submit)).width).toBeCloseTo(width, 0);
    await page.keyboard.press('Enter');
    await expect(signup.form).not.toHaveAttribute('aria-busy', 'true');
    await expect.poll(async () => (await signup.readOutput()).submitted).toBe(1);
    expect((await signup.readOutput()).submitCount).toBe(1);
  });

  test('the about field sends its formatted text as HTML, also when the form is sent by script while typing', async ({
    page,
  }) => {
    const { signup } = await openSignup(page);

    await signup.fillValid();
    await signup.about.click();
    await page.keyboard.type('Люблю ');
    await page.keyboard.press('ControlOrMeta+b');
    await page.keyboard.type('интерфейсы');
    await signup.submit.click();

    await expect
      .poll(async () => (await signup.readOutput()).about)
      .toBe(
        '<p class="nui-content__paragraph">Люблю <strong class="nui-content__bold">интерфейсы</strong></p>',
      );

    await signup.about.click();
    await page.keyboard.press('ControlOrMeta+End');
    await page.keyboard.type('!');

    await signup.form.evaluate((form) => {
      if (form instanceof HTMLFormElement) {
        form.requestSubmit();
      }
    });

    await expect.poll(async () => (await signup.readOutput()).about).toContain('интерфейсы!</');
  });

  test('a double click on submit sends the form once', async ({ page }) => {
    const { signup } = await openSignup(page);
    await signup.answer('Медленный ответ');
    await signup.fillValid();
    await signup.submit.dblclick();
    await expect(signup.form).toHaveAttribute('aria-busy', 'true');
    await expect(signup.form).not.toHaveAttribute('aria-busy', 'true');
    await expect.poll(async () => (await signup.readOutput()).submitted).toBe(1);
    expect((await signup.readOutput()).submitCount).toBe(1);
  });

  test('Enter picks and adds tags without sending, and Enter in the number field sends the typed value', async ({
    page,
  }) => {
    const { signup } = await openSignup(page);
    await signup.fillValid();
    await signup.tags.click();
    await signup.tags.pressSequentially('Диз');
    await page.keyboard.press('Enter');
    await signup.tags.pressSequentially('vue');
    await page.keyboard.press('Enter');
    await expect(signup.chipsOf(signup.tags)).toHaveText(['Дизайн', 'vue']);
    await expect(signup.listbox).toBeHidden();
    expect((await signup.readOutput()).submitCount).toBe(0);
    await signup.seats.fill('7');
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await signup.readOutput()).submitted).toBe(1);
    const output = await signup.readOutput();
    expect(output.seats).toBe(7);
    expect(output.tags).toEqual(['design', 'vue']);
  });

  test('reset brings back the initial values and clears the errors', async ({ page }) => {
    const { signup } = await openSignup(page);
    await signup.login.fill('annie');
    await signup.email.fill('nope');
    await signup.submit.click();

    await expect(signup.errorOf(signup.email)).toHaveText(
      'Введите корректный адрес электронной почты',
    );

    await signup.reset.click();
    await expect(signup.login).toHaveValue('');
    await expect(signup.email).toHaveValue('');
    await expect(signup.errorOf(signup.email)).toBeHidden();
    await expect(signup.reset).toBeDisabled();
    await expect.poll(async () => (await signup.readOutput()).dirty).toBe(false);
  });

  test('with room kept for errors a failed submit leaves the form height as it was', async ({
    page,
  }) => {
    const { signup } = await openSignup(page);
    await signup.reserve.check();
    const before = await boxOf(signup.form);
    await signup.submit.click();
    await expect(signup.errorOf(signup.login)).toHaveText('Заполните поле');
    await expect(signup.errorOf(signup.terms)).toHaveText('Нужно принять условия');
    const after = await boxOf(signup.form);
    expect(after.height).toBeCloseTo(before.height, 0);
  });

  test('paired fields keep their controls level when only one has a description', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'the pair stacks into one column on phones');
    const { signup } = await openSignup(page);
    const password = await boxOf(signup.frameOf(signup.password));
    const confirm = await boxOf(signup.frameOf(signup.confirm));
    expect(confirm.y).toBeCloseTo(password.y, 0);
    expect(confirm.height).toBeCloseTo(password.height, 0);
  });

  test('in RTL the fields share one text edge and nothing overflows', async ({ page }) => {
    const playground = await openSignup(page);
    const { signup } = playground;
    await playground.setDirection('rtl');
    await signup.submit.click();
    await expect(signup.errorOf(signup.login)).toBeVisible();
    expect(await playground.hasHorizontalOverflow()).toBe(false);
    const email = await boxOf(signup.email);
    const minutes = await boxOf(signup.segmentsOf(signup.call).last());
    expect(Math.abs(minutes.x + minutes.width - (email.x + email.width))).toBeLessThanOrEqual(3);
  });

  test('the form with field errors has no detectable WCAG AA violations', async ({ page }) => {
    test.slow();
    const playground = await openSignup(page);
    const { signup } = playground;
    await signup.submit.click();
    await expect(signup.errorOf(signup.login)).toBeVisible();
    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      expect(await playground.wcagViolations()).toEqual([]);
    }
  });

  test('the form with a server alert has no detectable WCAG AA violations', async ({ page }) => {
    const playground = await openSignup(page);
    const { signup } = playground;
    await signup.answer('Ошибка формы');
    await signup.fillValid();
    await signup.submit.click();
    await expect(signup.alert).toBeVisible();
    expect(await playground.wcagViolations()).toEqual([]);
  });
});
