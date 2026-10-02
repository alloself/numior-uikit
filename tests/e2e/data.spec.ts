import { expect, test } from '@playwright/test';
import { motionOf, SLOW_MOTION, slowMotion } from './helpers/motion';
import { PlaygroundPage } from './pages/playground';

test.describe('data display', () => {
  test('badge caps its count, a status dot exposes its label and a floating badge sits on its host', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { data } = playground;
    await expect(data.badgeCount).toHaveText('99+');
    await expect(data.badgeDot).toHaveRole('img');
    await expect(data.badgeDot).toHaveAccessibleName('В сети');
    await expect(data.badgeDot).toHaveText('');
    const host = await data.badgeFloating.locator('..').boundingBox();
    const badge = await data.badgeFloating.boundingBox();

    expect(host && badge && badge.y < host.y && badge.x + badge.width > host.x + host.width).toBe(
      true,
    );
  });

  test('avatar falls back to initials or an icon and a group overlaps with an overflow count', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { data } = playground;
    await expect(data.avatarBroken.locator('.nui-avatar__initials')).toHaveText('АС');
    await expect(data.avatarBroken.locator('img')).toHaveCount(0);
    await expect(data.avatarIcon.locator('.nui-icon')).toBeVisible();
    await expect(data.avatarGroup).toHaveRole('group');
    const avatars = data.avatarGroup.locator('.nui-avatar');
    await expect(avatars).toHaveCount(4);
    await expect(avatars.last()).toHaveText('+2');
    const first = await avatars.nth(0).boundingBox();
    const second = await avatars.nth(1).boundingBox();
    expect(first?.width).toBe(40);
    expect(first && second && second.x < first.x + first.width && second.x > first.x).toBe(true);
    await playground.setDirection('rtl');
    const rtlFirst = await avatars.nth(0).boundingBox();
    const rtlSecond = await avatars.nth(1).boundingBox();
    expect(rtlFirst && rtlSecond && rtlSecond.x < rtlFirst.x).toBe(true);
  });

  test('a linked card is one link over its whole surface and a button card counts only its own clicks', async ({
    page,
    isMobile,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { data } = playground;
    const link = data.cardLink.getByRole('link');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAccessibleName('Тариф Team');
    await data.clickSurface(data.cardLink.locator('.nui-card__description'));
    await expect.poll(() => page.url()).toContain('#card');
    await data.cardNested.click();
    await expect.poll(async () => (await data.readOutput()).nestedClicks).toBe(1);
    expect((await data.readOutput()).cardClicks).toBe(0);
    await data.clickSurface(data.cardButton.locator('.nui-card__content'));
    await expect.poll(async () => (await data.readOutput()).cardClicks).toBe(1);
    if (!isMobile) {
      await data.cardLink.getByRole('link').focus();
      await page.keyboard.press('Tab');
      await expect(data.cardButton.getByRole('button', { name: 'Проект Numior' })).toBeFocused();
      await expect.poll(() => data.focusRingOf(data.cardButton)).toBe('solid');
      await page.keyboard.press('Enter');
      await expect.poll(async () => (await data.readOutput()).cardClicks).toBe(2);
    }
  });

  test('selectable list moves with arrows, toggles with Space and click and finds Cyrillic titles by typeahead', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard scenario');
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { data } = playground;
    const list = data.selectList;
    await expect(list).toHaveRole('listbox');
    await expect(list).toHaveAttribute('aria-multiselectable', 'true');
    await data.option(list, 'Go').click();
    await expect(data.option(list, 'Go')).toHaveAttribute('aria-selected', 'true');
    await expect.poll(async () => (await data.readOutput()).picked).toEqual(['go']);
    await data.option(list, 'Go').focus();
    await page.keyboard.press('ArrowDown');
    await expect(data.option(list, 'Rust')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(data.option(list, 'Котлин')).toBeFocused();
    await page.keyboard.press('Space');
    await expect.poll(async () => (await data.readOutput()).picked).toEqual(['go', 'kotlin']);
    await data.typeIn(list, 'к');
    await expect(data.option(list, 'Котлин')).toBeFocused();
    await page.keyboard.press('Home');
    await expect(data.option(list, 'Go')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(data.option(list, 'Go')).toHaveAttribute('tabindex', '0');
    await expect(data.option(list, 'Котлин')).toHaveAttribute('tabindex', '-1');
    await data.option(data.singleList, 'Push').click();
    await expect.poll(async () => (await data.readOutput()).channel).toBe('push');
  });

  test('a selected option fades its icon and its description together with its label', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { data } = playground;
    const option = data.option(data.singleList, 'Почта');
    await option.scrollIntoViewIfNeeded();
    await slowMotion(data.singleList);
    await option.click();
    const label = await motionOf(option, 'color');

    expect(label?.duration).toBe(SLOW_MOTION);
    expect(await motionOf(data.iconOf(option), 'color')).toEqual(label);
    expect(await motionOf(data.descriptionOf(option), 'color')).toEqual(label);
    expect(await motionOf(data.titleOf(option), 'color')).toBeNull();
  });

  test('a linked list item fades its hover background and leaves the text colour to its row', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'hover scenario');
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { data } = playground;
    const link = data.action(data.list, 'Документация');
    await link.scrollIntoViewIfNeeded();
    await slowMotion(data.list);
    await link.hover();

    expect((await motionOf(link, 'background-color'))?.duration).toBe(SLOW_MOTION);
    await expect(link).toHaveCSS('transition-property', 'background-color');
  });

  test('list items render as links or buttons and an emptied list shows the empty state', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { data, pickers } = playground;
    await expect(data.list.getByRole('link')).toHaveCount(2);
    await data.list.getByRole('button', { name: 'Запустить проверку' }).click();
    await expect.poll(async () => (await data.readOutput()).runs).toBe(1);
    await expect(data.tasksList.getByRole('listitem')).toHaveCount(2);
    await data.listToggle.click();
    await expect(data.tasksList.locator('.nui-empty')).toHaveText('Задач нет');
    await expect.poll(async () => (await data.readOutput()).listEmpty).toBe(true);
    await data.listToggle.click();
    await expect(data.tasksList.getByRole('listitem')).toHaveCount(2);
    await expect(data.empty.getByRole('button', { name: 'Создать проект' })).toBeVisible();
    await pickers.cityInput.fill('zzz');
    await expect(pickers.emptyState).toHaveText('Ничего не найдено');
  });

  test('data display has no automatically detectable WCAG AA violations', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await expect(playground.data.cardLink).toBeVisible();
    expect(await playground.wcagViolations()).toEqual([]);
    await playground.setTheme('dark');
    expect(await playground.wcagViolations()).toEqual([]);
  });
});
