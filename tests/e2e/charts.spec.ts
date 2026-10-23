import { expect, test } from '@playwright/test';
import type { ChartTextBox } from './pages/charts';
import { PlaygroundPage } from './pages/playground';

const overlaps = (boxes: readonly ChartTextBox[]): boolean =>
  boxes.some((box, index) => {
    const next = boxes[index + 1];

    return next !== undefined && Math.max(box.left, next.left) < Math.min(box.right, next.right);
  });

test.describe('charts', () => {
  test('draws a column per value, names the series and reveals the data table', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { charts } = playground;
    await expect(charts.columns).toHaveRole('figure');
    await expect(charts.columns).toHaveAccessibleName('Выручка по кварталам, млн ₽');
    await expect(charts.marks(charts.columns)).toHaveCount(11);

    await expect(charts.legend(charts.columns).getByRole('listitem')).toHaveText([
      'Онлайн',
      'Магазины',
      'Партнёры',
    ]);

    expect(new Set(await charts.colours(charts.columns)).size).toBe(3);
    await expect(charts.table(charts.columns)).toHaveAccessibleName('Выручка по кварталам, млн ₽');
    expect(await charts.tableWidth(charts.columns)).toBeLessThanOrEqual(1);
    await charts.showTable();
    await expect(charts.table(charts.columns)).toBeVisible();
    await expect(charts.rows(charts.columns)).toHaveCount(4);
    await expect(charts.rows(charts.columns).nth(2)).toHaveText(/III кв\.\s*58\s*59\s*—/);
  });

  test('breaks lines at missing days and stacks areas under their lines', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { charts } = playground;
    await charts.lines.scrollIntoViewIfNeeded();
    await expect(charts.strokes(charts.lines)).toHaveCount(3);
    await expect(charts.areaFills(charts.lines)).toHaveCount(0);
    await expect(charts.areaFills(charts.areas)).toHaveCount(3);
    await expect(charts.strokes(charts.areas)).toHaveCount(3);
    await charts.showTable();
    await expect(charts.rows(charts.lines)).toHaveCount(14);
    await expect(charts.rows(charts.lines).nth(3)).toHaveText(/51\s*—/);
  });

  test('cuts pies and doughnut rings by category and lists the categories', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { charts } = playground;
    await charts.pie.scrollIntoViewIfNeeded();
    await expect(charts.slices(charts.pie)).toHaveCount(4);

    await expect(charts.legend(charts.pie).getByRole('listitem')).toHaveText([
      'Онлайн',
      'Магазины',
      'Партнёры',
      'Опт',
    ]);

    await expect(charts.slices(charts.doughnut)).toHaveCount(5);
    await expect(charts.legend(charts.doughnut).getByRole('listitem')).toHaveCount(5);
  });

  test('places a marker per pair on a scatter chart and lists the pairs in the table', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { charts } = playground;
    await charts.scatter.scrollIntoViewIfNeeded();
    await expect(charts.points(charts.scatter)).toHaveCount(20);
    await expect(charts.strokes(charts.scatter)).toHaveCount(0);
    await charts.showTable();
    await expect(charts.rows(charts.scatter).first()).toHaveText(/5\s*3\s*2/);
  });

  test('shows the values under the pointer and selects a quarter by click', async ({
    page,
    isMobile,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { charts } = playground;
    await charts.columns.scrollIntoViewIfNeeded();
    if (!isMobile) {
      await charts.pointAt(charts.columns, 'II кв.');
      await expect(charts.tooltip(charts.columns)).toBeVisible();
      await expect(charts.tooltip(charts.columns)).toContainText('II кв.');
      await expect(charts.tooltip(charts.columns)).toContainText('Магазины');
    }
    await expect(charts.selectedNote).toHaveText('Щёлкните по кварталу, чтобы выбрать его');
    await charts.pick(charts.columns, 'III кв.');
    await expect(charts.selectedNote).toHaveText('Выбран квартал: III кв.');
  });

  test('walks quarters from the keyboard and announces their values', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard scenario');
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { charts } = playground;
    await charts.columns.focus();
    await page.keyboard.press('ArrowRight');

    await expect(charts.announcement(charts.columns)).toHaveText(
      'I кв.: Онлайн 42, Магазины 65, Партнёры 18',
    );

    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await expect(charts.selectedNote).toHaveText('Выбран квартал: IV кв.');
    await page.keyboard.press('Enter');
    await expect(charts.selectedNote).toHaveText('Щёлкните по кварталу, чтобы выбрать его');
  });

  test('keeps value labels apart on a narrow screen', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.resize({ width: 360, height: 800 });
    await playground.open();
    const { charts } = playground;
    await charts.bars.scrollIntoViewIfNeeded();
    const ticks = await charts.ticks(charts.bars, 'value-tick');
    expect(ticks.length).toBeGreaterThanOrEqual(2);
    expect(overlaps(ticks)).toBe(false);
    expect(await playground.hasHorizontalOverflow()).toBe(false);
  });

  test('mirrors the category axis in right-to-left layouts', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await playground.setDirection('rtl');
    const { charts } = playground;

    await expect
      .poll(async () => {
        const ticks = await charts.ticks(charts.columns, 'category-tick');

        return (ticks[0]?.left ?? 0) > (ticks.at(-1)?.left ?? 0);
      })
      .toBe(true);
  });

  test('charts have no automatically detectable WCAG AA violations', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { charts } = playground;
    await charts.showTable();
    await charts.columns.focus();
    await page.keyboard.press('ArrowRight');
    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);

      expect(await playground.wcagViolations('section[aria-labelledby="charts-title"]')).toEqual(
        [],
      );
    }
    await playground.setDirection('rtl');
    expect(await playground.wcagViolations('section[aria-labelledby="charts-title"]')).toEqual([]);
  });
});
