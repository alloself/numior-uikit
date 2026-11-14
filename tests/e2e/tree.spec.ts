import { expect, test } from './fixtures';
import { boxOf, rowFillInsets } from './helpers/geometry';
import { motionOf, slowMotion } from './helpers/motion';

test.describe('tree', () => {
  test('expands on the chevron without selecting, selects on click and loads lazy children', async ({
    playground,
    tree,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
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
    await expect(docs).toHaveAttribute('aria-expanded', 'false');
    await expect(tree.openFolderOf(docs)).toHaveCSS('opacity', '0');
    await expect(tree.item(tree.tree, 'Руководство.md')).toBeVisible();
    await expect(docs).not.toHaveAttribute('aria-busy', 'true');
    await expect(docs).toHaveAttribute('aria-expanded', 'true');
    await expect(tree.openFolderOf(docs)).toHaveCSS('opacity', '1');
    await expect.poll(async () => (await tree.readOutput()).loaded).toEqual(['docs']);
  });

  test('keyboard walks the tree with arrows, asterisk, typeahead and Enter', async ({
    playground,
    tree,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard scenario');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await tree.tree.focus();
    expect(await tree.activeLabel(tree.tree)).toBe('Исходники');

    await tree.moveFocus('right');
    await expect(tree.item(tree.tree, 'Исходники')).toHaveAttribute('aria-expanded', 'true');

    await tree.moveFocus('right');
    expect(await tree.activeLabel(tree.tree)).toBe('Компоненты');

    await tree.moveFocus('right');
    await tree.moveFocus('right');
    expect(await tree.activeLabel(tree.tree)).toBe('Кнопка.vue');

    await tree.moveFocus('down');
    expect(await tree.activeLabel(tree.tree)).toBe('index.ts');

    await tree.moveFocus('left');
    expect(await tree.activeLabel(tree.tree)).toBe('Исходники');

    await tree.moveFocus('left');
    await expect(tree.item(tree.tree, 'Исходники')).toHaveAttribute('aria-expanded', 'false');

    await tree.expandSiblings();
    await expect(tree.item(tree.tree, 'logo.svg')).toBeVisible();
    await expect(tree.item(tree.tree, 'Руководство.md')).toBeVisible();

    await tree.focusLastItem();
    expect(await tree.activeLabel(tree.tree)).toBe('logo.svg');

    await tree.typeIn(tree.tree, 'д');
    expect(await tree.activeLabel(tree.tree)).toBe('Документация');

    await tree.selectFocusedItem();
    await expect.poll(async () => (await tree.readOutput()).selected).toBe('docs');

    await tree.focusFirstItem();
    expect(await tree.activeLabel(tree.tree)).toBe('Исходники');
    await expect(tree.item(tree.tree, 'Исходники')).toHaveCSS('outline-style', 'solid');
  });

  test('checkable tree cascades through enabled descendants and reports mixed ancestors', async ({
    playground,
    tree,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
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

  test('a tree row changes its hover background at once', async ({
    playground,
    tree,
    isMobile,
  }) => {
    test.skip(isMobile, 'hover scenario');
    await playground.open();
    const row = tree.item(tree.virtualTree, 'Узел 3');

    await row.scrollIntoViewIfNeeded();
    await slowMotion(tree.virtualTree);
    await row.hover();

    await expect(row).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    expect(await motionOf(row, 'background-color')).toBeNull();
  });

  test('virtual tree renders a window of ten thousand nodes and keeps the active node rendered', async ({
    playground,
    tree,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard scenario');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await expect(tree.item(tree.virtualTree, 'Узел 1')).toBeVisible();
    expect(await tree.renderedCount(tree.virtualTree)).toBeLessThan(100);

    await tree.virtualTree.focus();
    await tree.focusLastItem();
    expect(await tree.activeLabel(tree.virtualTree)).toBe('Узел 10000');
    await expect(tree.item(tree.virtualTree, 'Узел 10000')).toBeVisible();

    await tree.moveFocus('up');
    expect(await tree.activeLabel(tree.virtualTree)).toBe('Узел 9999');

    await tree.selectFocusedItem();
    await expect.poll(async () => (await tree.readOutput()).virtualSelected).toBe('n9999');

    await tree.focusFirstItem();
    await expect(tree.item(tree.virtualTree, 'Узел 1')).toBeVisible();
    expect(await tree.renderedCount(tree.virtualTree)).toBeLessThan(100);

    await tree.pageDown();
    await tree.pageDown();
    await expect(tree.item(tree.virtualTree, 'Узел 11')).toBeVisible();

    const gaps = await tree.activeRowGaps(tree.virtualTree);

    expect(gaps?.top).toBeGreaterThanOrEqual(0);
    expect(gaps?.bottom).toBeGreaterThanOrEqual(0);
  });

  test('virtual tree keeps its rows on screen before the scroll event catches up', async ({
    playground,
    tree,
    isMobile,
  }) => {
    test.skip(isMobile, 'scrollbar scenario');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await expect(tree.item(tree.virtualTree, 'Узел 1')).toBeVisible();
    expect(await tree.rowsInViewAfterJump(tree.virtualTree, 200_000)).toBeGreaterThan(3);
    await expect(tree.item(tree.virtualTree, 'Узел 5556')).toBeVisible();
    expect(await tree.rowsInViewAfterJump(tree.virtualTree, 0)).toBeGreaterThan(3);
    await expect(tree.item(tree.virtualTree, 'Узел 1')).toBeVisible();
  });

  test('tree mirrors the chevron in RTL and swaps the horizontal arrows', async ({
    playground,
    tree,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard scenario');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await playground.setDirection('rtl');
    const sources = tree.item(tree.tree, 'Исходники');
    const toggle = await boxOf(tree.toggleOf(sources));
    const label = await boxOf(tree.labelOf(sources));
    expect(toggle.x).toBeGreaterThan(label.x);

    await tree.tree.focus();
    await tree.moveFocus('left');
    await expect(sources).toHaveAttribute('aria-expanded', 'true');

    await tree.moveFocus('right');
    await expect(sources).toHaveAttribute('aria-expanded', 'false');
  });

  test('a tree row keeps its content in the middle of its fill', async ({ playground, tree }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const sources = tree.item(tree.tree, 'Исходники');

    await tree.labelOf(sources).click();
    await expect(sources).toHaveAttribute('aria-selected', 'true');

    const insets = await rowFillInsets(sources);

    expect(insets.top).toBeCloseTo(0, 1);
    expect(insets.bottom).toBeCloseTo(0, 1);
  });

  test('tree has no automatically detectable WCAG AA violations', async ({ playground, tree }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await tree.toggleOf(tree.item(tree.tree, 'Исходники')).click();
    await tree.checkboxOf(tree.item(tree.checkTree, 'Дизайн')).click();

    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      expect(await playground.wcagViolations(tree.scope)).toEqual([]);
    }
  });
});
