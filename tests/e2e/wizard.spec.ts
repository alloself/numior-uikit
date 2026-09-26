import { expect, test, type Page } from '@playwright/test';
import { PlaygroundPage } from './pages/playground';

const openWizard = async (page: Page): Promise<PlaygroundPage> => {
  const playground = new PlaygroundPage(page);

  await playground.emulate({ reducedMotion: 'reduce' });
  await playground.open();
  await playground.setTheme('light');
  return playground;
};

test.describe('wizard', () => {
  test('Next checks only the current step and focuses its first invalid field', async ({
    page,
  }) => {
    const { wizard } = await openWizard(page);
    await wizard.next.click();
    await expect(wizard.control('email')).toBeFocused();
    await expect(wizard.errorOf(wizard.control('email'))).toHaveText('Заполните поле');
    await expect(wizard.errorOf(wizard.control('password'))).toHaveText('Заполните поле');
    await expect(wizard.stepItem('Аккаунт')).toHaveClass(/nui-stepper__item--error/);
    await expect(wizard.panel('Команда')).toBeHidden();
    await expect(wizard.errorOf(wizard.control('team'))).toHaveCount(0);
  });

  test('Enter moves to the next step, the change is announced and Back returns without errors', async ({
    page,
  }) => {
    const { wizard } = await openWizard(page);
    await wizard.fillAccount();
    await wizard.control('password').press('Enter');
    await expect(wizard.panel('Команда')).toBeVisible();
    await expect(wizard.control('team')).toBeFocused();
    await expect(wizard.live).toHaveText('Шаг 2 из 3: Команда');
    await expect.poll(async () => (await wizard.readOutput()).step).toBe('team');
    await wizard.back.click();
    await expect(wizard.panel('Аккаунт')).toBeVisible();
    await expect(wizard.control('email')).toHaveValue('ann@example.com');
    await expect(wizard.errorOf(wizard.control('email'))).toHaveCount(0);
    await expect(wizard.stepItem('Аккаунт')).not.toHaveClass(/nui-stepper__item--error/);
  });

  test('a visited step opens again from the stepper', async ({ page }) => {
    const { wizard } = await openWizard(page);
    await wizard.reachConfirmation();
    await expect(wizard.panel('Подтверждение')).toBeVisible();
    await wizard.stepButton('Аккаунт').click();
    await expect(wizard.panel('Аккаунт')).toBeVisible();
    await expect(wizard.control('email')).toBeFocused();
  });

  test('the last step asks for the rules, and a server error on the email brings the wizard back to it', async ({
    page,
  }) => {
    const { wizard } = await openWizard(page);
    await wizard.reachConfirmation('taken@example.com');
    await wizard.create.click();
    await expect(wizard.errorOf(wizard.rules)).toHaveText('Подтвердите согласие с правилами');
    await expect(wizard.rules).toBeFocused();
    await wizard.rules.check();
    await wizard.create.click();
    await expect(wizard.panel('Аккаунт')).toBeVisible();

    await expect(wizard.errorOf(wizard.control('email'))).toHaveText(
      'Этот адрес уже зарегистрирован',
    );

    await expect(wizard.control('email')).toBeFocused();
    await expect(wizard.stepItem('Аккаунт')).toHaveClass(/nui-stepper__item--error/);
    await wizard.control('email').fill('ann@example.com');
    await wizard.next.click();
    await wizard.next.click();
    await wizard.create.click();
    await expect.poll(async () => (await wizard.readOutput()).submitted).toBe(1);
    expect((await wizard.readOutput()).team).toBe('Numior');
  });

  test('the wizard with errors passes axe in light and dark and fits phones', async ({
    page,
    isMobile,
  }) => {
    const playground = await openWizard(page);
    const { wizard } = playground;
    await wizard.next.click();
    await expect(wizard.errorOf(wizard.control('email'))).toBeVisible();
    if (isMobile) {
      await expect(wizard.summary).toContainText('Шаг 1 из 3');
    }
    expect(await playground.hasHorizontalOverflow()).toBe(false);
    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      expect(await playground.wcagViolations()).toEqual([]);
    }
  });

  test('in RTL the stepper runs from the right and nothing overflows', async ({
    page,
    isMobile,
  }) => {
    const playground = await openWizard(page);
    const { wizard } = playground;
    await playground.setDirection('rtl');
    await wizard.next.click();
    await expect(wizard.errorOf(wizard.control('email'))).toBeVisible();
    expect(await playground.hasHorizontalOverflow()).toBe(false);
    const first = await wizard.stepItem('Аккаунт').boundingBox();
    const second = await wizard.stepItem('Команда').boundingBox();
    if (!isMobile && first && second) {
      expect(first.x).toBeGreaterThan(second.x);
    }
  });
});
