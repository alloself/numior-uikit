import { expect, test } from '@playwright/test';
import { PlaygroundPage } from './pages/playground';

test.describe('data grid', () => {
  test('windows ten thousand rows and keeps the pinned columns in place while scrolling', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { grid } = playground;
    await grid.root.scrollIntoViewIfNeeded();
    await expect(grid.viewport).toHaveAttribute('aria-rowcount', '10001');
    await expect(grid.header(0)).toHaveText('№');
    await expect(grid.cell(0, 10)).toContainText('Новый');
    expect(await grid.renderedRowCount()).toBeLessThan(60);

    const pinnedBefore = await grid.cellBox(0, 0);
    const endBefore = await grid.cellBox(0, 10);
    const centreBefore = await grid.cellBox(0, 1);
    await grid.scrollTo({ left: 400 });
    await expect.poll(async () => (await grid.cellBox(0, 1)).x).toBeLessThan(centreBefore.x - 300);
    expect((await grid.cellBox(0, 0)).x).toBeCloseTo(pinnedBefore.x, 0);
    expect((await grid.cellBox(0, 10)).x).toBeCloseTo(endBefore.x, 0);

    expect((await grid.cellBox(0, 10)).x + endBefore.width).toBeCloseTo(
      await grid.clientRight(),
      0,
    );

    await grid.scrollToBottom();
    await expect(grid.cell(9999, 0)).toHaveText('10000');
    await expect(grid.cell(9999, 0)).toBeInViewport();
    expect(await grid.renderedRowCount()).toBeLessThan(60);
  });

  test('walks the cells with the keyboard and keeps the active one in view', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard walk on desktop');
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { grid } = playground;
    await grid.root.scrollIntoViewIfNeeded();
    await grid.cell(0, 1).click();
    expect(await grid.focusedCell()).toEqual({ row: 0, col: 1 });

    for (let step = 0; step < 3; step += 1) {
      await page.keyboard.press('ArrowDown');
    }
    expect(await grid.focusedCell()).toEqual({ row: 3, col: 1 });
    await page.keyboard.press('End');
    expect(await grid.focusedCell()).toEqual({ row: 3, col: 10 });
    await page.keyboard.press('Control+End');
    expect(await grid.focusedCell()).toEqual({ row: 9999, col: 10 });

    const last = await grid.cellBox(9999, 10);
    const frame = await grid.viewportBox();
    expect(last.y).toBeGreaterThanOrEqual((await grid.headerBottom()) - 1);
    expect(last.y + last.height).toBeLessThanOrEqual(frame.y + frame.height + 1);
    await page.keyboard.press('Control+Home');
    expect(await grid.focusedCell()).toEqual({ row: 0, col: 0 });
    expect(await grid.scrollTop()).toBe(0);
    await page.keyboard.press('ArrowUp');
    expect(await grid.focusedCell()).toEqual({ row: -1, col: 0 });

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');

    for (let step = 0; step < 8; step += 1) {
      await page.keyboard.press('ArrowRight');
    }
    expect(await grid.focusedCell()).toEqual({ row: 0, col: 9 });
    const revealed = await grid.cellBox(0, 9);
    expect(revealed.x + revealed.width).toBeLessThanOrEqual((await grid.cellBox(0, 10)).x + 1);
  });

  test('mirrors the pinned panes and the arrow keys in RTL', async ({ page, isMobile }) => {
    test.skip(isMobile, 'direction switch on desktop');
    const playground = new PlaygroundPage(page);
    await playground.open();
    await playground.setDirection('rtl');
    const { grid } = playground;
    await grid.root.scrollIntoViewIfNeeded();
    const start = await grid.cellBox(0, 0);
    const end = await grid.cellBox(0, 10);
    expect(start.x + start.width).toBeCloseTo(await grid.clientRight(), 0);
    expect(end.x).toBeCloseTo(await grid.clientLeft(), 0);
    await grid.cell(0, 1).click();
    await page.keyboard.press('ArrowLeft');
    expect(await grid.focusedCell()).toEqual({ row: 0, col: 2 });
    await playground.setDirection('ltr');
  });

  test('shows the empty state and brings the rows back', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { grid } = playground;
    await grid.root.scrollIntoViewIfNeeded();
    await grid.emptyToggle.click();
    await expect(grid.empty).toContainText('Нет строк для показа');
    await expect(grid.viewport).toHaveAttribute('aria-rowcount', '1');
    await grid.emptyToggle.click();
    await expect(grid.empty).toHaveCount(0);
    await expect(grid.cell(0, 0)).toHaveText('1');
  });

  test('data grid has no automatically detectable WCAG AA violations', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await playground.grid.root.scrollIntoViewIfNeeded();

    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      expect(await playground.wcagViolations()).toEqual([]);
    }
  });
});
