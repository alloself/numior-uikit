import { expect, test } from './fixtures';
import { boxOf } from './helpers/geometry';

test.describe('navigation', () => {
  test('menu opens by click and keyboard, walks items with arrows and typeahead, and restores focus on Escape', async ({
    playground,
    navigation,
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard scenario');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await navigation.menuTrigger.click();
    await expect(navigation.menu).toBeVisible();
    await expect(navigation.menu).toHaveAttribute('role', 'menu');

    await page.keyboard.press('Escape');
    await expect(navigation.menu).toBeHidden();
    await expect(navigation.menuTrigger).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(navigation.item('Переименовать')).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(navigation.item('Сетка')).toBeFocused();

    await page.keyboard.press('End');
    await expect(navigation.item('Удалить')).toBeFocused();

    await navigation.typeInMenu('п');
    await expect(navigation.item('Переименовать')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(navigation.menu).toBeHidden();
    await expect(navigation.menuTrigger).toBeFocused();
  });

  test('a menu opened by click or Enter takes focus, so the arrows walk its items', async ({
    playground,
    navigation,
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard scenario');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();

    await navigation.menuTrigger.click();

    await expect(navigation.menu).toBeFocused();

    await page.keyboard.press('ArrowDown');

    await expect(navigation.item('Переименовать')).toBeFocused();

    await page.keyboard.press('Escape');
    await page.keyboard.press('Enter');

    await expect(navigation.item('Переименовать')).toBeFocused();
  });

  test('submenu opens on hover or ArrowRight, steps back with ArrowLeft, and light dismiss closes the chain', async ({
    playground,
    navigation,
    page,
    isMobile,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await navigation.menuTrigger.click();

    if (isMobile) {
      await navigation.subTrigger.tap();
      await expect(navigation.subMenu).toBeVisible();

      await navigation.subItem('Ссылка').tap();
      await expect.poll(async () => (await navigation.readOutput()).lastAction).toBe('link');
      await expect(navigation.menu).toBeHidden();
      return;
    }

    await navigation.subTrigger.hover();
    await expect(navigation.subMenu).toBeVisible();

    await navigation.subItem('Почта').click();
    await expect.poll(async () => (await navigation.readOutput()).lastAction).toBe('email');
    await expect(navigation.menu).toBeHidden();

    await page.mouse.move(0, 0);
    await navigation.menuTrigger.focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await expect(navigation.subTrigger).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(navigation.subMenu).toBeVisible();
    await expect(navigation.subItem('Почта')).toBeFocused();

    await page.keyboard.press('ArrowLeft');
    await expect(navigation.subMenu).toBeHidden();
    await expect(navigation.subTrigger).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(navigation.subMenu).toBeVisible();

    await page.mouse.click(4, 4);
    await expect(navigation.subMenu).toBeHidden();
    await expect(navigation.menu).toBeHidden();
  });

  test('checkbox items toggle without closing while radio items pick a value and close', async ({
    playground,
    navigation,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await navigation.menuTrigger.click();
    await expect(navigation.item('Сетка')).toHaveAttribute('aria-checked', 'false');

    await navigation.item('Сетка').click();
    await expect(navigation.item('Сетка')).toHaveAttribute('aria-checked', 'true');
    await expect(navigation.menu).toBeVisible();
    await expect.poll(async () => (await navigation.readOutput()).gridOn).toBe(true);

    await navigation.item('По дате').click();
    await expect(navigation.menu).toBeHidden();
    await expect.poll(async () => (await navigation.readOutput()).sort).toBe('date');

    await navigation.menuTrigger.click();
    await expect(navigation.item('По дате')).toHaveAttribute('aria-checked', 'true');
    await expect(navigation.item('Архивировать')).toHaveAttribute('aria-disabled', 'true');
  });

  test('tabs activate on arrows, mirror in RTL, slide the indicator and honour manual activation', async ({
    playground,
    navigation,
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard scenario');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await expect(navigation.activePanel).toHaveText('Панель обзора');

    await navigation.tab('Команда').click();
    await expect(navigation.activePanel).toHaveText('Панель команды');

    const teamIndicator = await navigation.indicatorBox(navigation.tabs);
    await page.keyboard.press('ArrowRight');
    await expect(navigation.tab('Настройки')).toBeFocused();
    await expect(navigation.activePanel).toHaveText('Панель настроек');
    await expect.poll(async () => (await navigation.readOutput()).tab).toBe('settings');

    const settingsIndicator = await navigation.indicatorBox(navigation.tabs);
    expect(settingsIndicator.x).toBeGreaterThan(teamIndicator.x);

    await playground.setDirection('rtl');

    await expect
      .poll(async () => (await navigation.indicatorBox(navigation.tabs)).x)
      .toBeCloseTo((await boxOf(navigation.tab('Настройки'))).x, 0);

    await navigation.tab('Команда').click();
    await page.keyboard.press('ArrowLeft');
    await expect(navigation.tab('Настройки')).toBeFocused();

    await playground.setDirection('ltr');
    await navigation.manualTab('День').click();
    await page.keyboard.press('ArrowRight');
    await expect(navigation.manualTab('Неделя')).toBeFocused();
    await expect(navigation.manualPanel).toHaveText('Период: День');

    await page.keyboard.press('Enter');
    await expect(navigation.manualPanel).toHaveText('Период: Неделя');
    await expect.poll(async () => (await navigation.readOutput()).manualTab).toBe('week');
  });

  test('closable tabs close from the cross, Delete and the middle button while the indicator stays under the selected tab', async ({
    playground,
    navigation,
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'pointer and keyboard scenario');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();

    await expect(navigation.openDocuments).toHaveText([
      'Договор',
      'Счёт на оплату',
      'Акт',
      'Смета',
      'Архив',
    ]);

    await navigation.documentTab('Акт').click();
    await expect(navigation.documentPanel).toHaveText('Документ: Акт');

    await navigation.documentCross('Счёт на оплату').click();
    await expect(navigation.openDocuments).toHaveText(['Договор', 'Акт', 'Смета', 'Архив']);
    await expect(navigation.documentPanel).toHaveText('Документ: Акт');

    await expect
      .poll(() => navigation.indicatorDrift(navigation.closableTabs, navigation.documentTab('Акт')))
      .toEqual({ start: 0, size: 0 });

    await expect(navigation.documentTab('Акт')).toBeFocused();

    await page.keyboard.press('Delete');
    await expect(navigation.openDocuments).toHaveText(['Договор', 'Смета', 'Архив']);
    await expect(navigation.documentTab('Смета')).toBeFocused();
    await expect(navigation.documentPanel).toHaveText('Документ: Смета');

    await navigation.documentTab('Договор').click({ button: 'middle' });
    await expect(navigation.openDocuments).toHaveText(['Смета', 'Архив']);

    await expect
      .poll(() =>
        navigation.indicatorDrift(navigation.closableTabs, navigation.documentTab('Смета')),
      )
      .toEqual({ start: 0, size: 0 });
  });

  test('link tabs are links in the Tab order that mark the current page and move the indicator', async ({
    playground,
    navigation,
    page,
    isMobile,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await expect(navigation.linkTabs).toHaveJSProperty('tagName', 'NAV');
    await expect(navigation.linkTabs).toHaveAttribute('aria-label', 'Страницы раздела');
    await expect(navigation.linkTabs.getByRole('tab')).toHaveCount(0);
    await expect(navigation.currentPage).toHaveText('Сводка');

    await navigation.pageLink('Заказы').click();

    await expect(page).toHaveURL(/#nav-page-orders$/);
    await expect(navigation.currentPage).toHaveText('Заказы');

    await expect
      .poll(() => navigation.indicatorDrift(navigation.linkTabs, navigation.pageLink('Заказы')))
      .toEqual({ start: 0, size: 0 });

    test.skip(isMobile, 'keyboard scenario');

    await navigation.pageLink('Заказы').focus();
    await page.keyboard.press('Tab');

    await expect(navigation.pageLink('Клиенты')).toBeFocused();
    await expect(navigation.currentPage).toHaveText('Заказы');

    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/#nav-page-clients$/);
    await expect(navigation.currentPage).toHaveText('Клиенты');
  });

  test('a right click on a tab opens no tab and leaves the focus where it was', async ({
    playground,
    navigation,
    isMobile,
  }) => {
    test.skip(isMobile, 'mouse scenario');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await navigation.tab('Команда').click({ button: 'right' });

    await expect(navigation.activePanel).toHaveText('Панель обзора');
    await expect(navigation.tab('Команда')).not.toBeFocused();
  });

  test('breadcrumbs collapse the middle into a menu that keeps the hidden links', async ({
    playground,
    navigation,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await expect(navigation.crumbs).toHaveAccessibleName('Путь');
    await expect(navigation.crumbLinks(navigation.crumbs)).toHaveCount(1);
    await expect(navigation.currentCrumb(navigation.crumbs)).toHaveText('Оплата');
    await expect(navigation.crumbLinks(navigation.shortCrumbs)).toHaveCount(2);
    await expect(navigation.currentCrumb(navigation.shortCrumbs)).toHaveText('Numior');

    await navigation.moreButton.click();
    await expect(navigation.moreMenu).toBeVisible();
    await expect(navigation.hiddenCrumb('Проекты')).toBeVisible();

    await navigation.hiddenCrumb('Numior').click();
    await expect(navigation.moreMenu).toBeHidden();
    expect(page.url()).toContain('#numior');
  });

  test('steppers advance with the actions, go back through completed steps and pick any step when not linear', async ({
    playground,
    navigation,
    page,
    isMobile,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await navigation.stepper.scrollIntoViewIfNeeded();
    await expect(navigation.stepper).toHaveAccessibleName('Регистрация');
    await expect(navigation.currentStep(navigation.stepper)).toHaveAccessibleName(/^Профиль/);
    await expect(navigation.stepButtons(navigation.stepper)).toHaveCount(2);

    await navigation.stepperNext.click();
    await expect(navigation.currentStep(navigation.stepper)).toHaveAccessibleName(/^Тариф/);
    await expect(navigation.step(navigation.stepper, 'Профиль')).toHaveAccessibleName(/выполнено/);
    await expect.poll(async () => (await navigation.readOutput()).signupStep).toBe('plan');

    if (isMobile) {
      await expect(navigation.stepperSummary(navigation.stepper)).toContainText('Шаг 3 из 4');

      await navigation.step(navigation.stepper, 'Аккаунт').tap();
    } else {
      await expect(navigation.stepperSummary(navigation.stepper)).toBeHidden();

      await navigation.step(navigation.stepper, 'Аккаунт').focus();
      await page.keyboard.press('Enter');
    }

    await expect.poll(async () => (await navigation.readOutput()).signupStep).toBe('account');
    await expect(navigation.stepperBack).toBeDisabled();
    await expect(navigation.stepButtons(navigation.verticalStepper)).toHaveCount(4);
    await expect(navigation.step(navigation.verticalStepper, 'Удаление')).toBeDisabled();

    await navigation.step(navigation.verticalStepper, 'Оплата').click();
    await expect.poll(async () => (await navigation.readOutput()).settingsStep).toBe('billing');

    await expect(navigation.currentStep(navigation.verticalStepper)).toHaveAccessibleName(
      /^Оплата/,
    );
  });

  test('navigation has no automatically detectable WCAG AA violations', async ({
    playground,
    navigation,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();

    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      await navigation.menuTrigger.click();
      await expect(navigation.menu).toBeVisible();
      expect(await playground.wcagViolations(navigation.scope)).toEqual([]);

      await page.keyboard.press('Escape');
      await expect(navigation.menu).toBeHidden();
    }
  });
});
