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

    expect(new Set(await charts.fills(charts.columns)).size).toBe(3);
    await expect(charts.table(charts.columns)).toHaveAccessibleName('Выручка по кварталам, млн ₽');
    expect(await charts.tableWidth(charts.columns)).toBeLessThanOrEqual(1);
    await charts.showTable();
    await expect(charts.table(charts.columns)).toBeVisible();
    await expect(charts.rows(charts.columns)).toHaveCount(4);
    await expect(charts.rows(charts.columns).nth(2)).toHaveText(/III кв\.\s*58\s*59\s*—/);
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
    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);

      expect(await playground.wcagViolations('section[aria-labelledby="charts-title"]')).toEqual(
        [],
      );
    }
  });
});
