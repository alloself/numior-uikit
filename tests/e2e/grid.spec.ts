import { expect, test } from '@playwright/test';
import { boxOf } from './helpers/geometry';
import { PlaygroundPage } from './pages/playground';

test.describe('data grid', () => {
  test('windows ten thousand rows and keeps the pinned columns in place while scrolling', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { grid } = playground;
    await grid.root.scrollIntoViewIfNeeded();
    await expect(grid.viewport).toHaveAttribute('aria-rowcount', '10003');
    await expect(grid.header(0)).toHaveText('№');
    await expect(grid.band('Покупатель')).toHaveAttribute('aria-colspan', '2');
    await expect(grid.band('Заказ')).toHaveAttribute('aria-colindex', '6');
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
    expect(await grid.focusedCell()).toEqual({ row: 10_000, col: 10 });
    await page.keyboard.press('ArrowUp');
    expect(await grid.focusedCell()).toEqual({ row: 9999, col: 10 });

    const last = await grid.cellBox(9999, 10);
    const footer = await grid.cellBox(10_000, 10);
    expect(last.y).toBeGreaterThanOrEqual((await grid.headerBottom()) - 1);
    expect(last.y + last.height).toBeLessThanOrEqual(footer.y + 1);
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

  test('sorts from the header by click, Shift+click and the keyboard', async ({
    page,
    isMobile,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { grid } = playground;
    await grid.root.scrollIntoViewIfNeeded();
    await grid.header(0).click();
    await expect(grid.header(0)).toHaveAttribute('aria-sort', 'ascending');
    await expect(grid.cell(0, 0)).toHaveText('1');
    await grid.header(0).click();
    await expect(grid.header(0)).toHaveAttribute('aria-sort', 'descending');
    await expect(grid.cell(0, 0)).toHaveText('10000');
    const descending = await grid.numbersIn(0, 8);
    expect(descending).toEqual(descending.toSorted((a, b) => b - a));
    await grid.header(1).click({ modifiers: ['Shift'] });
    await expect(grid.sortOrder(1)).toHaveText('2');
    await expect(grid.sortOrder(0)).toHaveText('1');
    await expect(grid.header(1)).not.toHaveAttribute('aria-sort');

    if (isMobile) {
      return;
    }
    await grid.cell(0, 2).click();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    await expect(grid.header(2)).toHaveAttribute('aria-sort', 'ascending');
    await expect(grid.header(0)).not.toHaveAttribute('aria-sort');
    await expect(grid.sortOrder(1)).toHaveCount(0);
    expect(await grid.focusedCell()).toEqual({ row: -1, col: 2 });
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
    await grid.openFilter(3);
    await expect(grid.filter).toBeVisible();
    const header = await boxOf(grid.header(3));
    const popover = await boxOf(grid.filter);
    expect(popover.x + popover.width).toBeCloseTo(header.x + header.width, 0);
    expect(popover.y).toBeGreaterThan(header.y + header.height);
    await page.keyboard.press('Escape');
    await playground.setDirection('ltr');
  });

  test('shows the empty state and brings the rows back', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { grid } = playground;
    await grid.root.scrollIntoViewIfNeeded();
    await grid.emptyToggle.click();
    await expect(grid.empty).toContainText('Нет строк для показа');
    await expect(grid.viewport).toHaveAttribute('aria-rowcount', '3');
    await grid.emptyToggle.click();
    await expect(grid.empty).toHaveCount(0);
    await expect(grid.cell(0, 0)).toHaveText('1');
  });

  test('filters a column by chosen values from the header popover and resets it', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { grid } = playground;
    await grid.root.scrollIntoViewIfNeeded();
    await grid.openFilter(10);
    await expect(grid.filter).toBeVisible();
    await expect(grid.filter).toHaveAccessibleName('Фильтр: Статус');
    await expect(grid.filterButton(10)).toHaveAttribute('aria-expanded', 'true');
    await expect(grid.filterValue('Возврат')).toBeVisible();
    await grid.filterValue('Оплачен').check();
    await grid.applyFilter();

    await expect(grid.filter).toBeHidden();
    await expect(grid.viewport).toHaveAttribute('aria-rowcount', '2503');
    await expect(grid.filterButton(10)).toHaveClass(/nui-grid__filter--active/);
    expect(await grid.textsIn(10, 5)).toEqual(Array.from({ length: 5 }, () => 'Оплачен'));

    await expect(grid.output).toHaveText(
      JSON.stringify({
        sort: [],
        filters: [{ kind: 'set', key: 'status', values: ['Оплачен'] }],
        quick: '',
        groupBy: [],
      }),
    );

    await grid.openFilter(10);
    await expect(grid.filterValue('Оплачен')).toBeChecked();
    await grid.resetFilter();
    await expect(grid.viewport).toHaveAttribute('aria-rowcount', '10003');
    await expect(grid.filterButton(10)).not.toHaveClass(/nui-grid__filter--active/);
  });

  test('narrows the rows with the quick filter and a number range and clears both', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'range typing on desktop');
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { grid } = playground;
    await grid.root.scrollIntoViewIfNeeded();
    await grid.quick.fill('Казань');
    await expect(grid.viewport).toHaveAttribute('aria-rowcount', '1431');
    await grid.openFilter(5);
    await grid.filterField('От').fill('1000');
    await grid.filterField('До').fill('20000');
    await grid.applyFilter();

    await expect
      .poll(async () => Number(await grid.viewport.getAttribute('aria-rowcount')))
      .toBeLessThan(1431);

    const amounts = await grid.numbersIn(5, 5);
    expect(amounts.every((amount) => amount >= 1000 && amount <= 20_000)).toBe(true);
    expect(await grid.textsIn(3, 5)).toEqual(Array.from({ length: 5 }, () => 'Казань'));

    await expect(grid.output).toHaveText(
      JSON.stringify({
        sort: [],
        filters: [{ kind: 'number', key: 'amount', min: 1000, max: 20_000 }],
        quick: 'Казань',
        groupBy: [],
      }),
    );

    await grid.clearFilters.click();
    await expect(grid.viewport).toHaveAttribute('aria-rowcount', '10003');
    await expect(grid.quick).toHaveValue('');
  });

  test('opens a filter from the header with Alt+ArrowDown and returns focus to it', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard entry on desktop');
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { grid } = playground;
    await grid.root.scrollIntoViewIfNeeded();
    await grid.cell(0, 1).click();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Alt+ArrowDown');
    await expect(grid.filter).toBeVisible();
    await expect(grid.filter).toHaveAccessibleName('Фильтр: Клиент');
    await expect(grid.filter.locator(':focus')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(grid.filter).toBeHidden();
    expect(await grid.focusedCell()).toEqual({ row: -1, col: 1 });

    await page.keyboard.press('Alt+ArrowDown');
    await grid.filterField('Значение').fill('Анна');
    await page.keyboard.press('Enter');
    await expect(grid.viewport).toHaveAttribute('aria-rowcount', '1253');
    await expect(grid.filter).toBeHidden();
    expect(await grid.focusedCell()).toEqual({ row: -1, col: 1 });
    await expect(grid.root.getByRole('status')).toHaveText('Показано 1 250 строк');

    await grid.openFilter(3);
    await expect(grid.filter).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(grid.filter).toBeHidden();
    await expect.poll(() => grid.focusedCell()).toEqual({ row: -1, col: 3 });
    await page.keyboard.press('ArrowLeft');
    expect(await grid.focusedCell()).toEqual({ row: -1, col: 2 });
  });

  test('groups rows from the toolbar, expands a group and keeps totals in the footer', async ({
    page,
    isMobile,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { grid } = playground;
    await grid.root.scrollIntoViewIfNeeded();
    await expect(grid.footerCell(0)).toHaveText('Итого');
    await grid.scrollTo({ left: 600 });
    await expect(grid.footerCell(5)).not.toHaveText('');
    const total = await grid.footerCell(5).innerText();
    await grid.groupBy('По статусу');

    await expect(grid.viewport).toHaveAttribute('role', 'treegrid');
    await expect(grid.viewport).toHaveAttribute('aria-rowcount', '7');
    await expect(grid.groupLabel(0)).toHaveText(/^Возврат/);
    await expect(grid.row(0)).toHaveAttribute('aria-expanded', 'false');
    await expect(grid.footerCell(5)).toHaveText(total);
    await grid.groupLabel(0).click();

    await expect(grid.row(0)).toHaveAttribute('aria-expanded', 'true');
    await expect(grid.row(1)).toHaveAttribute('aria-level', '2');
    await expect(grid.cell(1, 10)).toHaveText('Возврат');
    await expect(grid.output).toContainText('"groupBy":["status"]');

    if (isMobile) {
      return;
    }
    await grid.cell(0, 0).click();
    await page.keyboard.press('Enter');
    await expect(grid.row(0)).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Control+End');
    expect(await grid.focusedCell()).toEqual({ row: 4, col: 10 });
    await expect(grid.footerCell(10)).toBeFocused();
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

  test('filter popover has no automatically detectable WCAG AA violations', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await playground.grid.root.scrollIntoViewIfNeeded();
    await playground.grid.openFilter(10);
    await expect(playground.grid.filterValue('Оплачен')).toBeVisible();

    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      expect(await playground.wcagViolations()).toEqual([]);
    }
  });
});
