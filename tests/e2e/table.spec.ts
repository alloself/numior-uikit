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

  test('table has no automatically detectable WCAG AA violations', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { table } = playground;
    await table.sortButton('Имя').click();
    await table.row('Анна').getByRole('checkbox').click();
    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      expect(await playground.wcagViolations()).toEqual([]);
    }
  });
});
