import { expect, test } from './fixtures';
import { paintedRgb, rgbDelta } from './helpers/color';

test.describe('pickers', () => {
  test('select opens a listbox as wide as its trigger, picks by keyboard and clears', async ({
    playground,
    pickers,
    page,
    isMobile,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const trigger = pickers.countryTrigger;
    await expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    await expect(trigger).toHaveText('Выберите страну');

    await trigger.click();
    await expect(pickers.listbox).toBeVisible();

    expect(await pickers.widthOf(pickers.listbox)).toBeGreaterThanOrEqual(
      await pickers.widthOf(trigger),
    );

    await pickers.option('Германия').click();
    await expect(pickers.listbox).toBeHidden();
    await expect(trigger).toHaveText('Германия');
    await expect.poll(async () => (await pickers.readOutput()).country).toBe('de');

    if (!isMobile) {
      await trigger.focus();
      await page.keyboard.press('ArrowDown');
      await expect(pickers.option('Германия')).toBeFocused();

      await page.keyboard.press('ArrowDown');
      await expect(pickers.option('Вьетнам')).toBeFocused();

      await page.keyboard.press('Enter');
      await expect(pickers.listbox).toBeHidden();
      await expect(trigger).toBeFocused();
      await expect.poll(async () => (await pickers.readOutput()).country).toBe('vn');
    }

    await pickers.clearButton(trigger).click();
    await expect(trigger).toHaveText('Выберите страну');
    await expect.poll(async () => (await pickers.readOutput()).country).toBeNull();
  });

  test('select opened with a click, Enter or Space takes the keyboard into its list', async ({
    playground,
    pickers,
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard scenario');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();

    await pickers.countryTrigger.click();
    await expect(pickers.option('Австрия')).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(pickers.option('Бельгия')).toBeFocused();

    for (const key of ['Enter', 'Space']) {
      await page.keyboard.press('Escape');
      await expect(pickers.countryTrigger).toBeFocused();

      await page.keyboard.press(key);
      await expect(pickers.option('Австрия')).toBeFocused();

      await page.keyboard.press('ArrowDown');
      await expect(pickers.option('Бельгия')).toBeFocused();
    }

    await page.keyboard.press('Escape');
    await pickers.treeTrigger.click();
    await expect(pickers.tree).toBeFocused();
  });

  test('a long value truncates with an ellipsis and keeps the clear button off the text', async ({
    playground,
    pickers,
  }) => {
    await playground.open();
    await expect(pickers.longValue).toHaveText(/Дальневосточный/);
    await expect(pickers.longValue).toHaveCSS('text-overflow', 'ellipsis');
    expect(await pickers.longValueOverflows()).toBe(true);
    expect(await pickers.longClearGap()).toBeGreaterThanOrEqual(0);
  });

  test('multiple select toggles options without closing and shows how many are picked', async ({
    playground,
    pickers,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const trigger = pickers.tagsTrigger;
    await expect(trigger).toHaveText('Фронтенд');

    await trigger.click();
    await expect(pickers.listbox).toHaveAttribute('aria-multiselectable', 'true');

    await pickers.option('Дизайн').click();
    await expect(pickers.listbox).toBeVisible();
    await expect(trigger).toHaveText('Выбрано: 2');

    await pickers.option('Фронтенд').click();
    await expect(trigger).toHaveText('Дизайн');
    await expect.poll(async () => (await pickers.readOutput()).tags).toEqual(['design']);

    await page.keyboard.press('Escape');
    await expect(pickers.listbox).toBeHidden();
  });

  test('select shows a tree for nested options, reveals the selected node and picks by keyboard', async ({
    playground,
    pickers,
    page,
    isMobile,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const trigger = pickers.treeTrigger;
    await expect(trigger).toHaveAttribute('aria-haspopup', 'tree');

    await trigger.click();
    await expect(pickers.tree).toBeVisible();

    await pickers.treeToggleOf(pickers.treeItem('Электроника')).click();
    await pickers.treeLabelOf(pickers.treeItem('Ноутбуки')).click();
    await expect(pickers.tree).toBeHidden();
    await expect(trigger).toHaveText('Ноутбуки');
    await expect.poll(async () => (await pickers.readOutput()).category).toBe('laptops');

    await trigger.click();
    await expect(pickers.treeItem('Электроника')).toHaveAttribute('aria-expanded', 'true');
    await expect(pickers.treeItem('Ноутбуки')).toHaveAttribute('aria-selected', 'true');
    expect(await playground.wcagViolations(pickers.scope)).toEqual([]);

    await page.keyboard.press('Escape');
    await expect(pickers.tree).toBeHidden();

    if (!isMobile) {
      await trigger.focus();
      await page.keyboard.press('ArrowDown');
      await expect(pickers.tree).toBeFocused();

      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('Enter');
      await expect(pickers.tree).toBeHidden();
      await expect(trigger).toBeFocused();
      await expect.poll(async () => (await pickers.readOutput()).category).toBe('phones');
    }

    await pickers.clearButton(trigger).click();
    await expect(trigger).toHaveText('Выберите категорию');
    await expect.poll(async () => (await pickers.readOutput()).category).toBeNull();
  });

  test('combobox searches asynchronously, tracks the active option and keeps chips in multiple mode', async ({
    playground,
    pickers,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const city = pickers.cityInput;
    await city.click();
    await city.pressSequentially('ка');
    await expect(pickers.loadingStatus).toHaveText('Загрузка');
    await expect(pickers.option('Казань')).toBeVisible();
    await expect(pickers.option('Москва')).toBeHidden();
    await expect(city).toHaveAttribute('aria-activedescendant', /option-0$/);

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(city).toHaveValue('Калуга');
    await expect(pickers.listbox).toBeHidden();
    await expect.poll(async () => (await pickers.readOutput()).city).toBe('kaluga');

    const keywords = pickers.keywordsInput;
    await keywords.click();
    await keywords.pressSequentially('Vi');
    await page.keyboard.press('Enter');
    await expect(pickers.chips(keywords)).toHaveText(['Vite']);

    await keywords.pressSequentially('Nuxt');
    await page.keyboard.press('Enter');
    await expect(pickers.chips(keywords)).toHaveText(['Vite', 'Nuxt']);

    await page.keyboard.press('Backspace');
    await expect(pickers.chips(keywords)).toHaveText(['Vite']);
    await expect.poll(async () => (await pickers.readOutput()).keywords).toEqual(['vite']);
  });

  test('pagination moves through pages, changes the page size and renders links in href mode', async ({
    playground,
    pickers,
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'page buttons collapse on narrow containers');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await expect(pickers.rangeText).toHaveText('1–20 из 240');

    await pickers.pageButton(3).click();
    await expect(pickers.pageButton(3)).toHaveAttribute('aria-current', 'page');
    await expect.poll(async () => (await pickers.readOutput()).page).toBe(3);

    await pickers.nextButton.click();
    await expect(pickers.rangeText).toHaveText('61–80 из 240');

    await pickers.pageSizeTrigger.click();
    await pickers.option('50').click();
    await expect(pickers.rangeText).toHaveText('51–100 из 240');
    await expect.poll(async () => (await pickers.readOutput()).pageSize).toBe(50);
    await expect(pickers.pageLink(2)).toHaveAttribute('aria-current', 'page');
    await expect(pickers.pageLink(3)).toHaveAttribute('href', '#page-3');

    await pickers.pageLink(3).click();
    expect(page.url()).toContain('#page-3');
    await expect.poll(async () => (await pickers.readOutput()).linkPage).toBe(3);
  });

  test('the current page keeps its tone under the pointer in the dark theme', async ({
    playground,
    pickers,
    isMobile,
  }) => {
    test.skip(isMobile, 'page buttons collapse on narrow containers');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await playground.setTheme('dark');
    await expect(pickers.pageButton(1)).toHaveAttribute('aria-current', 'page');

    const rest = await paintedRgb(pickers.pageButton(1));

    await pickers.pageButton(2).hover();
    const idleHover = await paintedRgb(pickers.pageButton(2));
    await pickers.pageButton(1).hover();
    const currentHover = await paintedRgb(pickers.pageButton(1));

    expect(rgbDelta(currentHover, rest)).toBeGreaterThan(3);
    expect(rgbDelta(currentHover, idleHover)).toBeGreaterThan(10);
  });

  test('pagination collapses into a status on narrow containers', async ({
    playground,
    pickers,
    isMobile,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();

    if (isMobile) {
      await expect(pickers.status).toHaveText('1 / 12');
      await expect(pickers.pageButton(3)).toBeHidden();

      await pickers.nextButton.click();
      await expect(pickers.status).toHaveText('2 / 12');
      return;
    }

    await expect(pickers.status).toBeHidden();
    await expect(pickers.pageButton(3)).toBeVisible();
  });

  test('pickers have no automatically detectable WCAG AA violations', async ({
    playground,
    pickers,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();

    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      await pickers.countryTrigger.click();
      await expect(pickers.listbox).toBeVisible();
      expect(await playground.wcagViolations(pickers.scope)).toEqual([]);

      await page.keyboard.press('Escape');
      await expect(pickers.listbox).toBeHidden();
    }
  });
});
