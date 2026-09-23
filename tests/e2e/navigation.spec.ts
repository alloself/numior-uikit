import { expect, test } from '@playwright/test';
import { PlaygroundPage } from './pages/playground';

test.describe('navigation', () => {
  test('menu opens by click and keyboard, walks items with arrows and typeahead, and restores focus on Escape', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard scenario');
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { navigation } = playground;
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

  test('submenu opens on hover or ArrowRight, steps back with ArrowLeft, and light dismiss closes the chain', async ({
    page,
    isMobile,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { navigation } = playground;
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
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { navigation } = playground;
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
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard scenario');
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { navigation } = playground;
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

  test('breadcrumbs collapse the middle into a menu that keeps the hidden links', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { navigation } = playground;
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

  test('navigation has no automatically detectable WCAG AA violations', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { navigation } = playground;
    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      await navigation.menuTrigger.click();
      await expect(navigation.menu).toBeVisible();
      expect(await playground.wcagViolations()).toEqual([]);
      await page.keyboard.press('Escape');
      await expect(navigation.menu).toBeHidden();
    }
  });
});
