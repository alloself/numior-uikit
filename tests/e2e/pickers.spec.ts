import { expect, test } from '@playwright/test';
import { PlaygroundPage } from './pages/playground';

test.describe('pickers', () => {
  test('select opens a listbox as wide as its trigger, picks by keyboard and clears', async ({
    page,
    isMobile,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { pickers } = playground;
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

  test('multiple select toggles options without closing and shows how many are picked', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { pickers } = playground;
    const trigger = pickers.tagsTrigger;
    await expect(trigger).toHaveText('Фронтенд');
    await trigger.click();
    await expect(pickers.listbox).toHaveAttribute('aria-multiselectable', 'true');
    await pickers.option('Дизайн').click();
    await expect(pickers.listbox).toBeVisible();
    await expect(trigger).toHaveText('2 выбрано');
    await pickers.option('Фронтенд').click();
    await expect(trigger).toHaveText('Дизайн');
    await expect.poll(async () => (await pickers.readOutput()).tags).toEqual(['design']);
    await page.keyboard.press('Escape');
    await expect(pickers.listbox).toBeHidden();
  });

  test('combobox searches asynchronously, tracks the active option and keeps chips in multiple mode', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { pickers } = playground;
    const city = pickers.cityInput;
    await city.click();
    await city.pressSequentially('ка');
    await expect(pickers.loadingStatus).toHaveText('Ищем…');
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
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'page buttons collapse on narrow containers');
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { pickers } = playground;
    await expect(pickers.rangeText).toHaveText('1–20 из 240');
    await pickers.pageButton(3).click();
    await expect(pickers.pageButton(3)).toHaveAttribute('aria-current', 'page');
    await expect.poll(async () => (await pickers.readOutput()).page).toBe(3);
    await pickers.nextButton.click();
    await expect(pickers.rangeText).toHaveText('61–80 из 240');
    await pickers.pageSizeTrigger.click();
    await pickers.option('50').click();
    await expect(pickers.rangeText).toHaveText('151–200 из 240');
    await expect.poll(async () => (await pickers.readOutput()).pageSize).toBe(50);
    await expect(pickers.pageLink(2)).toHaveAttribute('aria-current', 'page');
    await expect(pickers.pageLink(3)).toHaveAttribute('href', '#page-3');
    await pickers.pageLink(3).click();
    expect(page.url()).toContain('#page-3');
    await expect.poll(async () => (await pickers.readOutput()).linkPage).toBe(3);
  });

  test('pagination collapses into a status on narrow containers', async ({ page, isMobile }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { pickers } = playground;
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

  test('pickers have no automatically detectable WCAG AA violations', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { pickers } = playground;
    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      await pickers.countryTrigger.click();
      await expect(pickers.listbox).toBeVisible();
      expect(await playground.wcagViolations()).toEqual([]);
      await page.keyboard.press('Escape');
      await expect(pickers.listbox).toBeHidden();
    }
  });
});
