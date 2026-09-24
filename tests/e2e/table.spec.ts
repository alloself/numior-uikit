import { expect, test } from '@playwright/test';
import { PlaygroundPage } from './pages/playground';

test.describe('table', () => {
  test('sorting cycles through ascending, descending and off', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { table } = playground;
    await expect(table.header('Возраст')).not.toHaveAttribute('aria-sort');
    await table.sortButton('Возраст').click();
    await expect(table.header('Возраст')).toHaveAttribute('aria-sort', 'ascending');
    await expect((await table.cellsOf(table.table, 'Возраст')).first()).toHaveText('23');
    await table.sortButton('Возраст').click();
    await expect(table.header('Возраст')).toHaveAttribute('aria-sort', 'descending');
    await expect((await table.cellsOf(table.table, 'Возраст')).first()).toHaveText('52');
    await table.sortButton('Возраст').click();
    await expect(table.header('Возраст')).not.toHaveAttribute('aria-sort');
    await expect.poll(async () => (await table.readOutput()).sort).toBeNull();
    await expect((await table.cellsOf(table.table, 'Имя')).first()).toHaveText('Анна');
  });

  test('rows select through checkboxes with a tri-state header and row clicks stay separate', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { table } = playground;
    await expect(table.selectAll).toHaveAccessibleName('Выбрать все строки');
    await table.selectAll.click();
    await expect
      .poll(async () => (await table.readOutput()).selected)
      .toEqual(['Анна', 'Борис', 'Вера', 'Глеб', 'Дина']);
    await expect(table.row('Вера')).toHaveAttribute('aria-selected', 'true');
    await table.row('Вера').getByRole('checkbox').click();
    await expect.poll(() => table.indeterminate(table.selectAll)).toBe(true);
    await expect.poll(async () => (await table.readOutput()).selected).toHaveLength(4);
    expect((await table.readOutput()).lastRowClick).toBeNull();
    await table.row('Глеб').getByText('Глеб', { exact: true }).click();
    await expect.poll(async () => (await table.readOutput()).lastRowClick).toBe('Глеб');
    if (await table.overflowsHorizontally(table.table)) {
      const before = await table.selectAll.boundingBox();
      await table.scrollHorizontally(table.table, 150);
      const after = await table.selectAll.boundingBox();
      expect(before && after && Math.abs(after.x - before.x) <= 1).toBe(true);
      await expect(table.table).toHaveClass(/nui-table--scrolled-start/);
    }
  });

  test('pagination moves between pages and changes the page size', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { table } = playground;
    await expect(table.rows(table.table)).toHaveCount(5);
    await expect(table.rangeText).toHaveText('1–5 из 12');
    await table.nextPage.click();
    await expect.poll(async () => (await table.readOutput()).page).toBe(2);
    await expect((await table.cellsOf(table.table, 'Имя')).first()).toHaveText('Егор');
    await table.pageSizeTrigger.click();
    await page.getByRole('option', { name: '10' }).click();
    await expect.poll(async () => (await table.readOutput()).pageSize).toBe(10);
    await expect(table.rows(table.table)).toHaveCount(2);
    await expect(table.rangeText).toHaveText('11–12 из 12');
  });

  test('loading shows skeleton rows and an emptied table shows the empty state', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { table } = playground;
    await table.loadingToggle.click();
    await expect(table.table.locator('table')).toHaveAttribute('aria-busy', 'true');
    await expect(table.skeletons).toHaveCount(5);
    await expect(table.selectAll).toBeDisabled();
    await table.loadingToggle.click();
    await expect(table.rows(table.table)).toHaveCount(5);
    await table.emptyToggle.click();
    await expect(table.emptyState).toHaveText('Нет данных');
    await expect.poll(async () => (await table.readOutput()).empty).toBe(true);
    await table.emptyToggle.click();
    await expect(table.rows(table.table)).toHaveCount(5);
  });

  test('virtual table windows five thousand rows, keeps the header sticky and scrolls inside its box', async ({
    page,
    isMobile,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { table } = playground;
    const virtual = table.virtualTable;
    await expect(virtual.locator('table')).toHaveAttribute('aria-rowcount', '5001');
    expect(await table.rows(virtual).count()).toBeLessThan(60);
    await table.scrollToBottom(virtual);
    await expect(table.rows(virtual).last()).toContainText('Сотрудник 5000');
    await expect(table.scroller(virtual)).toHaveAttribute('tabindex', '0');
    const scroller = await table.scroller(virtual).boundingBox();
    const header = await virtual.locator('thead th').first().boundingBox();
    expect(scroller && header && Math.abs(header.y - scroller.y) <= 1).toBe(true);
    if (isMobile) {
      expect(await table.overflowsHorizontally(virtual)).toBe(true);
      expect(await playground.hasHorizontalOverflow()).toBe(false);
    }
  });

  test('columns resize from the keyboard and the pointer within their limits', async ({
    page,
    isMobile,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { table } = playground;
    const resizer = table.resizer('Возраст');
    await expect(resizer).toHaveAttribute('aria-valuenow', '112');
    expect(await table.scrollSlack(table.table)).toBeLessThanOrEqual(1);
    if (!isMobile) {
      await resizer.focus();
      await page.keyboard.press('ArrowRight');
      await expect.poll(async () => (await table.readOutput()).widths.age).toBe(122);
      await page.keyboard.press('Shift+ArrowLeft');
      await expect.poll(async () => (await table.readOutput()).widths.age).toBe(72);
      await page.keyboard.press('Enter');
      await expect.poll(async () => (await table.readOutput()).widths.age).toBeUndefined();
    }
    await table.dragBy(resizer, 40);
    await expect.poll(async () => (await table.readOutput()).widths.age).toBe(152);
    const box = await table.header('Возраст').boundingBox();
    expect(box && Math.abs(box.width - 152) <= 1).toBe(true);
    await table.dragBy(resizer, -400);
    await expect.poll(async () => (await table.readOutput()).widths.age).toBe(64);
    const label = table.header('Возраст').locator('.nui-table__label');
    expect(await label.evaluate((element) => getComputedStyle(element).textOverflow)).toBe(
      'ellipsis',
    );
    expect(await label.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
    expect(await table.scrollSlack(table.table)).toBeLessThanOrEqual(1);
  });

  test('columns reorder by keyboard grab and by dragging a header', async ({ page, isMobile }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { table } = playground;
    expect(await table.headerLabels()).toEqual(['', 'Имя', 'Роль', 'Возраст', 'Балл']);
    if (!isMobile) {
      expect(await table.opacityOf(table.columnGrip('Имя'))).toBe('0');
      await table.header('Имя').hover();
      await expect.poll(() => table.opacityOf(table.columnGrip('Имя'))).toBe('1');
      await table.columnGrip('Балл').focus();
      await page.keyboard.press('Space');
      await expect(table.table.locator('.nui-table__live')).toContainText('Балл grabbed');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('Space');
      await expect
        .poll(async () => (await table.readOutput()).columnOrder)
        .toEqual(['name', 'role', 'score', 'age']);
      expect(await table.headerLabels()).toEqual(['', 'Имя', 'Роль', 'Балл', 'Возраст']);
    }
    await table.dragBetween(table.header('Имя'), table.header('Роль'), 20, 0, async () => {
      await expect(table.ghost).toContainText('Имя');
      const line = await table.dropLine(table.table).boundingBox();
      const head = await table.table.locator('thead').boundingBox();
      expect(line && head && line.y >= head.y - 1).toBe(true);
    });
    await expect(table.ghost).toHaveCount(0);
    await expect.poll(async () => (await table.readOutput()).columnOrder.indexOf('name')).toBe(1);
    expect((await table.readOutput()).sort).toBeNull();
  });

  test('tree rows expand, load lazily and reorder among siblings', async ({ page, isMobile }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { table } = playground;
    await expect(table.rows(table.treeTable)).toHaveCount(3);
    await table.toggleOf('Анна').click();
    await expect(table.rows(table.treeTable)).toHaveCount(5);
    await expect(table.toggleOf('Анна')).toHaveAttribute('aria-expanded', 'true');
    const rootToggle = await table.treeRow('Анна').locator('.nui-table__toggle').boundingBox();
    const childToggle = await table.treeRow('Айгуль').locator('.nui-table__toggle').boundingBox();
    expect(rootToggle && childToggle && childToggle.x > rootToggle.x + 16).toBe(true);
    await table.toggleOf('Вера').click();
    await expect(table.toggleOf('Вера')).toHaveAttribute('aria-busy', 'true');
    await expect(table.treeRow('Влад')).toBeVisible();
    await expect.poll(async () => (await table.readOutput()).loaded).toEqual(['Вера']);
    if (!isMobile) {
      await table.gripOf('Борис').focus();
      await page.keyboard.press('Space');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Space');
      await expect.poll(async () => (await table.readOutput()).lastReorder).toBe('Борис:1->2');
      await expect
        .poll(async () => (await table.readOutput()).teamOrder)
        .toEqual(['Анна', 'Вера', 'Борис']);
    }
    await table.dragBetween(table.gripOf('Айгуль'), table.gripOf('Артём'), 0, 8, async () => {
      await expect(table.ghost).toContainText('Айгуль');
    });
    await expect(table.ghost).toHaveCount(0);
    await expect.poll(async () => (await table.readOutput()).lastReorder).toBe('Айгуль:0->1');
    await table
      .header('Возраст', table.treeTable)
      .getByRole('button', { name: 'Возраст', exact: true })
      .click();
    await expect(table.gripOf('Анна')).toBeDisabled();
  });

  test('pinned columns and pinned rows stay in place while the virtual table scrolls', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { table } = playground;
    const virtual = table.virtualTable;
    await virtual.scrollIntoViewIfNeeded();
    const before = await table.header('№', virtual).boundingBox();
    await table.scrollHorizontally(virtual, 300);
    const after = await table.header('№', virtual).boundingBox();
    expect(before && after && Math.abs(after.x - before.x) <= 1).toBe(true);
    await expect(virtual).toHaveClass(/nui-table--scrolled-start/);
    await table.scrollToBottom(virtual);
    const pinned = virtual.locator('.nui-table__body--pinned .nui-table__row');
    await expect(pinned).toContainText('Итого по отделу');
    const pinnedBox = await pinned.boundingBox();
    const header = await virtual.locator('thead').boundingBox();
    expect(pinnedBox && header && Math.abs(pinnedBox.y - (header.y + header.height)) <= 1).toBe(
      true,
    );
  });

  test('table has no automatically detectable WCAG AA violations', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { table } = playground;
    await table.sortButton('Имя').click();
    await table.row('Анна').getByRole('checkbox').click();
    await table.toggleOf('Анна').click();
    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      expect(await playground.wcagViolations()).toEqual([]);
    }
  });
});
