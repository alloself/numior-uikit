import { expect, test } from '@playwright/test';
import { PlaygroundPage } from './pages/playground';

test.describe('tree', () => {
  test('expands on the chevron without selecting, selects on click and loads lazy children', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tree } = playground;
    await expect(tree.tree).toHaveRole('tree');
    const sources = tree.item(tree.tree, 'Исходники');
    await expect(sources).toHaveAttribute('aria-expanded', 'false');
    await tree.toggleOf(sources).click();
    await expect(sources).toHaveAttribute('aria-expanded', 'true');
    const components = tree.item(tree.tree, 'Компоненты');
    await expect(components).toHaveAttribute('aria-level', '2');
    expect((await tree.readOutput()).selected).toBeNull();
    await tree.labelOf(tree.item(tree.tree, 'index.ts')).click();
    await expect.poll(async () => (await tree.readOutput()).selected).toBe('index');
    await expect(tree.item(tree.tree, 'index.ts')).toHaveAttribute('aria-selected', 'true');
    const docs = tree.item(tree.tree, 'Документация');
    await tree.toggleOf(docs).click();
    await expect(docs).toHaveAttribute('aria-busy', 'true');
    await expect(tree.item(tree.tree, 'Руководство.md')).toBeVisible();
    await expect(docs).not.toHaveAttribute('aria-busy', 'true');
    await expect.poll(async () => (await tree.readOutput()).loaded).toEqual(['docs']);
  });

  test('keyboard walks the tree with arrows, asterisk, typeahead and Enter', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard scenario');
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tree } = playground;
    await tree.tree.focus();
    expect(await tree.activeLabel(tree.tree)).toBe('Исходники');
    await page.keyboard.press('ArrowRight');
    await expect(tree.item(tree.tree, 'Исходники')).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('ArrowRight');
    expect(await tree.activeLabel(tree.tree)).toBe('Компоненты');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    expect(await tree.activeLabel(tree.tree)).toBe('Кнопка.vue');
    await page.keyboard.press('ArrowDown');
    expect(await tree.activeLabel(tree.tree)).toBe('index.ts');
    await page.keyboard.press('ArrowLeft');
    expect(await tree.activeLabel(tree.tree)).toBe('Исходники');
    await page.keyboard.press('ArrowLeft');
    await expect(tree.item(tree.tree, 'Исходники')).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('*');
    await expect(tree.item(tree.tree, 'logo.svg')).toBeVisible();
    await expect(tree.item(tree.tree, 'Руководство.md')).toBeVisible();
    await page.keyboard.press('End');
    expect(await tree.activeLabel(tree.tree)).toBe('logo.svg');
    await tree.typeIn(tree.tree, 'д');
    expect(await tree.activeLabel(tree.tree)).toBe('Документация');
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await tree.readOutput()).selected).toBe('docs');
    await page.keyboard.press('Home');
    expect(await tree.activeLabel(tree.tree)).toBe('Исходники');
    await expect(tree.item(tree.tree, 'Исходники')).toHaveCSS('outline-style', 'solid');
  });

  test('checkable tree cascades through enabled descendants and reports mixed ancestors', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tree } = playground;
    const sources = tree.item(tree.checkTree, 'Исходники');
    await tree.toggleOf(sources).click();
    await tree.toggleOf(tree.item(tree.checkTree, 'Компоненты')).click();
    await tree.checkboxOf(sources).click();

    await expect
      .poll(async () => (await tree.readOutput()).checked)
      .toEqual(['src', 'components', 'button', 'index']);

    await expect(sources).toHaveAttribute('aria-checked', 'true');
    await expect(tree.item(tree.checkTree, 'Поле.vue')).toHaveAttribute('aria-checked', 'false');
    await tree.checkboxOf(tree.item(tree.checkTree, 'Кнопка.vue')).click();
    await expect.poll(async () => (await tree.readOutput()).checked).toEqual(['index']);
    await expect(sources).toHaveAttribute('aria-checked', 'mixed');
    expect((await tree.readOutput()).selected).toBeNull();
  });

  test('virtual tree renders a window of ten thousand nodes and keeps the active node rendered', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard scenario');
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tree } = playground;
    await expect(tree.item(tree.virtualTree, 'Узел 1')).toBeVisible();
    expect(await tree.renderedCount(tree.virtualTree)).toBeLessThan(100);
    await tree.virtualTree.focus();
    await page.keyboard.press('End');
    expect(await tree.activeLabel(tree.virtualTree)).toBe('Узел 10000');
    await expect(tree.item(tree.virtualTree, 'Узел 10000')).toBeVisible();
    await page.keyboard.press('ArrowUp');
    expect(await tree.activeLabel(tree.virtualTree)).toBe('Узел 9999');
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await tree.readOutput()).virtualSelected).toBe('n9999');
    await page.keyboard.press('Home');
    await expect(tree.item(tree.virtualTree, 'Узел 1')).toBeVisible();
    expect(await tree.renderedCount(tree.virtualTree)).toBeLessThan(100);
    await page.keyboard.press('PageDown');
    await page.keyboard.press('PageDown');
    await expect(tree.item(tree.virtualTree, 'Узел 11')).toBeVisible();

    const gaps = await tree.activeRowGaps(tree.virtualTree);

    expect(gaps?.top).toBeGreaterThanOrEqual(0);
    expect(gaps?.bottom).toBeGreaterThanOrEqual(0);
  });

  test('virtual tree keeps its rows on screen before the scroll event catches up', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'scrollbar scenario');
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tree } = playground;
    await expect(tree.item(tree.virtualTree, 'Узел 1')).toBeVisible();
    expect(await tree.rowsInViewAfterJump(tree.virtualTree, 200_000)).toBeGreaterThan(3);
    await expect(tree.item(tree.virtualTree, 'Узел 5556')).toBeVisible();
    expect(await tree.rowsInViewAfterJump(tree.virtualTree, 0)).toBeGreaterThan(3);
    await expect(tree.item(tree.virtualTree, 'Узел 1')).toBeVisible();
  });

  test('tree mirrors the chevron in RTL and swaps the horizontal arrows', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard scenario');
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await playground.setDirection('rtl');
    const { tree } = playground;
    const sources = tree.item(tree.tree, 'Исходники');
    const toggle = await tree.toggleOf(sources).boundingBox();
    const label = await tree.labelOf(sources).boundingBox();
    expect(toggle && label && toggle.x > label.x).toBe(true);
    await tree.tree.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(sources).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(sources).toHaveAttribute('aria-expanded', 'false');
  });

  test('tree has no automatically detectable WCAG AA violations', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tree } = playground;
    await tree.toggleOf(tree.item(tree.tree, 'Исходники')).click();
    await tree.checkboxOf(tree.item(tree.checkTree, 'Дизайн')).click();
    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      expect(await playground.wcagViolations()).toEqual([]);
    }
  });
});
