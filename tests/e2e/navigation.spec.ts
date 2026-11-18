import { expect, test } from './fixtures';
import { boxOf } from './helpers/geometry';

test.describe('navigation', () => {
  test('menu opens by click and keyboard, walks items with arrows and typeahead, and restores focus on Escape', async ({
    playground,
    navigation,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard scenario');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await navigation.menuTrigger.click();
    await expect(navigation.menu).toBeVisible();
    await expect(navigation.menu).toHaveAttribute('role', 'menu');

    await navigation.closeMenu();
    await expect(navigation.menu).toBeHidden();
    await expect(navigation.menuTrigger).toBeFocused();

    await navigation.focusNextItem();
    await expect(navigation.item('Переименовать')).toBeFocused();

    await navigation.focusNextItem();
    await navigation.focusNextItem();
    await navigation.focusNextItem();
    await expect(navigation.item('Сетка')).toBeFocused();

    await navigation.focusLastItem();
    await expect(navigation.item('Удалить')).toBeFocused();

    await navigation.typeInMenu('п');
    await expect(navigation.item('Переименовать')).toBeFocused();

    await navigation.closeMenu();
    await expect(navigation.menu).toBeHidden();
    await expect(navigation.menuTrigger).toBeFocused();
  });

  test('menu opened with Enter, Space or a click takes the keyboard and rings only the item reached by keys', async ({
    playground,
    navigation,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard scenario');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();

    await navigation.menuTrigger.click();
    await navigation.item('Дублировать').hover();
    await expect(navigation.item('Дублировать')).toBeFocused();
    await expect.poll(() => navigation.itemRinged('Дублировать')).toBe(false);

    await navigation.closeMenu();
    await navigation.menuTrigger.click();
    await expect(navigation.menu).toBeFocused();

    await navigation.focusNextItem();
    await expect(navigation.item('Переименовать')).toBeFocused();
    await expect.poll(() => navigation.itemRinged('Переименовать')).toBe(true);

    await navigation.item('Документация').hover();
    await expect(navigation.item('Документация')).toBeFocused();
    await expect.poll(() => navigation.itemRinged('Документация')).toBe(false);

    for (const key of ['Enter', 'Space'] as const) {
      await navigation.closeMenu();
      await expect(navigation.menuTrigger).toBeFocused();

      await navigation.openFocusedTriggerWith(key);
      await expect(navigation.item('Переименовать')).toBeFocused();

      await navigation.focusNextItem();
      await expect(navigation.item('Дублировать')).toBeFocused();
      await expect.poll(() => navigation.itemRinged('Дублировать')).toBe(true);
    }
  });

  test('submenu opens on hover or ArrowRight, steps back with ArrowLeft, and light dismiss closes the chain', async ({
    playground,
    navigation,
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

    await navigation.movePointerAway();
    await navigation.menuTrigger.focus();
    await navigation.focusNextItem();
    await navigation.focusPreviousItem();
    await navigation.focusPreviousItem();
    await expect(navigation.subTrigger).toBeFocused();

    await navigation.openSubmenu();
    await expect(navigation.subMenu).toBeVisible();
    await expect(navigation.subItem('Почта')).toBeFocused();

    await navigation.closeSubmenu();
    await expect(navigation.subMenu).toBeHidden();
    await expect(navigation.subTrigger).toBeFocused();

    await navigation.openSubmenu();
    await expect(navigation.subMenu).toBeVisible();

    await navigation.clickOutside();
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
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard scenario');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await expect(navigation.activePanel).toHaveText('Панель обзора');

    await navigation.tab('Команда').click();
    await expect(navigation.activePanel).toHaveText('Панель команды');

    const teamIndicator = await navigation.indicatorBox(navigation.tabs);
    await navigation.moveTabFocus('right');
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
    await navigation.moveTabFocus('left');
    await expect(navigation.tab('Настройки')).toBeFocused();

    await playground.setDirection('ltr');
    await navigation.manualTab('День').click();
    await navigation.moveTabFocus('right');
    await expect(navigation.manualTab('Неделя')).toBeFocused();
    await expect(navigation.manualPanel).toHaveText('Период: День');

    await navigation.activateFocused();
    await expect(navigation.manualPanel).toHaveText('Период: Неделя');
    await expect.poll(async () => (await navigation.readOutput()).manualTab).toBe('week');
  });

  test('overflowing tabs scroll with the wheel and the edge buttons and keep the selected tab in view', async ({
    playground,
    navigation,
    isMobile,
  }) => {
    test.skip(isMobile, 'wheel and pointer scenario');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await navigation.overflowTabs.scrollIntoViewIfNeeded();

    await expect(navigation.tabEdge('start')).toBeHidden();
    await expect(navigation.tabEdge('end')).toBeVisible();
    await expect(navigation.monthTab('Декабрь')).not.toBeInViewport();

    const pageScroll = await navigation.pageScrollY();

    await navigation.monthTrack.hover();
    await navigation.turnWheel(120);

    await expect.poll(() => navigation.monthScroll()).toBe(120);
    await expect(navigation.tabEdge('start')).toBeVisible();
    expect(await navigation.pageScrollY()).toBe(pageScroll);

    await navigation.tabEdge('start').click();

    await expect.poll(() => navigation.monthScroll()).toBe(0);
    await expect(navigation.tabEdge('start')).toBeHidden();

    await navigation.tabEdge('end').click();

    await expect.poll(() => navigation.monthScroll()).toBe(358);

    await navigation.turnWheel(5000);

    await expect(navigation.tabEdge('end')).toBeHidden();
    await expect(navigation.monthTab('Декабрь')).toBeInViewport({ ratio: 1 });

    await navigation.monthTab('Декабрь').click();
    await navigation.focusFirstTab();

    await expect(navigation.monthTab('Январь')).toBeFocused();
    await expect(navigation.monthTab('Январь')).toBeInViewport({ ratio: 1 });
    await expect.poll(() => navigation.monthScroll()).toBe(0);
    expect(await navigation.pageScrollY()).toBe(pageScroll);
  });

  test('closable tabs close from the cross, Delete and the middle button while the indicator stays under the selected tab', async ({
    playground,
    navigation,
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

    await navigation.closeFocusedTab();
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
    await navigation.tabForward();

    await expect(navigation.pageLink('Клиенты')).toBeFocused();
    await expect(navigation.currentPage).toHaveText('Заказы');

    await navigation.activateFocused();

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
      expect(await navigation.summaryGrowth(navigation.stepper)).toBe(0);

      await navigation.step(navigation.stepper, 'Аккаунт').tap();
    } else {
      await expect(navigation.stepperSummary(navigation.stepper)).toBeHidden();

      await navigation.step(navigation.stepper, 'Аккаунт').focus();
      await navigation.activateFocused();
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

  test('readonly steps put the number on the first title line, the content under the title and a line between numbers', async ({
    playground,
    navigation,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();

    for (const direction of ['ltr', 'rtl'] as const) {
      await playground.setDirection(direction);
      await navigation.guideStepper.scrollIntoViewIfNeeded();

      await expect(navigation.stepButtons(navigation.guideStepper)).toHaveCount(0);
      await expect(navigation.guideSteps()).toHaveCount(3);

      const steps = await Promise.all([0, 1, 2].map((index) => navigation.guideStep(index)));

      const lines = await Promise.all(
        [0, 1, 2].map((index) => navigation.guideTitleFirstLine(index)),
      );

      for (const [index, step] of steps.entries()) {
        const center = step.indicator.y + step.indicator.height / 2;
        const titleStart = direction === 'ltr' ? step.title.x : step.title.x + step.title.width;

        const startSide =
          direction === 'ltr'
            ? step.indicator.x + step.indicator.width <= step.title.x
            : step.indicator.x >= step.title.x + step.title.width;

        expect(Math.abs(center - (lines[index] ?? Number.NaN))).toBeLessThanOrEqual(1);
        expect(startSide).toBe(true);

        if (!step.content) {
          continue;
        }

        const contentStart =
          direction === 'ltr' ? step.content.x : step.content.x + step.content.width;

        expect(Math.abs(contentStart - titleStart)).toBeLessThanOrEqual(0.5);
        expect(step.content.y).toBeGreaterThan(step.title.y + step.title.height);
      }

      for (const [index, step] of steps.slice(0, -1).entries()) {
        const next = steps[index + 1];
        const connector = step.connector;

        expect(connector).toBeDefined();
        expect(next).toBeDefined();

        if (!connector || !next) {
          continue;
        }

        expect(connector.y - (step.indicator.y + step.indicator.height)).toBeCloseTo(4, 0);
        expect(next.indicator.y - (connector.y + connector.height)).toBeCloseTo(4, 0);

        expect(connector.x + connector.width / 2).toBeCloseTo(
          step.indicator.x + step.indicator.width / 2,
          0,
        );
      }

      expect(steps[2]?.connector).toBeUndefined();
    }
  });

  test('navigation has no automatically detectable WCAG AA violations', async ({
    playground,
    navigation,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();

    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      await navigation.menuTrigger.click();
      await expect(navigation.menu).toBeVisible();
      expect(await playground.wcagViolations(navigation.scope)).toEqual([]);

      await navigation.closeMenu();
      await expect(navigation.menu).toBeHidden();
    }
  });
});
