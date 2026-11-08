import { expect, test } from './fixtures';
import { boxOf } from './helpers/geometry';
import type { Theme } from './pages/playground';

const CHART_ROWS = 16;

const near = (actual: number, expected: number): boolean => Math.abs(actual - expected) < 1.5;

test.describe('book drawings', () => {
  test('anchors the budget chart to its cells and draws it from the cell values', async ({
    playground,
    book,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.scrollBody(160);

    await expect(book.charts).toHaveCount(1);
    await expect(book.chartTitle).toHaveText('Выручка и прибыль по месяцам');
    await expect(book.chartLegend).toHaveText(['Выручка', 'Прибыль']);

    const [chart, first, second] = await Promise.all([
      boxOf(book.charts),
      boxOf(book.cell('18', 0)),
      boxOf(book.cell('18', 1)),
    ]);

    expect([
      near(chart.x, first.x),
      near(chart.y, first.y),
      near(chart.width, first.width + second.width * 6),
      near(chart.height, first.height * CHART_ROWS),
    ]).toEqual([true, true, true, true]);
  });

  test('redraws the bars after an edit and after undo', async ({ playground, book, page }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();

    await expect(book.bars(1)).toHaveCount(6);

    const [january = 0, june = 0] = await book.barHeights(1).then((bars) => [bars[0], bars[5]]);

    expect(january).toBeLessThan(june);

    await book.enter('3', 1, '5000');

    await expect
      .poll(async () => {
        const bars = await book.barHeights(1);

        return (bars[0] ?? 0) > (bars[5] ?? 0);
      })
      .toBe(true);

    await page.keyboard.press('Control+z');

    await expect.poll(async () => (await book.barHeights(1))[0]).toBeCloseTo(january, 1);
  });

  test('moves the chart with rows inserted above it and back on undo', async ({
    playground,
    book,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();

    const [before, row] = await Promise.all([boxOf(book.charts), boxOf(book.cell('5', 0))]);

    await book.cellMenu('5', 0, 'Вставить 1 строку выше');

    await expect
      .poll(async () => (await boxOf(book.charts)).y)
      .toBeCloseTo(before.y + row.height, 0);

    await page.keyboard.press('Control+z');

    await expect.poll(async () => (await boxOf(book.charts)).y).toBeCloseTo(before.y, 0);
  });

  test('shows a picture from the book and a placeholder for an unsupported object', async ({
    playground,
    book,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.chooseSheet('Заметки');

    await expect(book.picture('Логотип Numior')).toBeVisible();
    await expect.poll(() => book.pictureLoaded('Логотип Numior')).toBe(true);

    const [picture, cell] = await Promise.all([
      boxOf(book.picture('Логотип Numior')),
      book.cellCorner('3', 1),
    ]);

    expect([
      near(picture.x, cell.x + 8),
      near(picture.y, cell.y + 4),
      near(picture.width, 120),
      near(picture.height, 60),
    ]).toEqual([true, true, true, true]);

    await expect(book.placeholders).toHaveText(
      'Этот объект пока не поддерживается: Схема (smartArt)',
    );
  });

  for (const theme of ['light', 'dark'] satisfies readonly Theme[]) {
    test(`passes axe with the chart and the picture on the sheet in the ${theme} theme`, async ({
      playground,
      book,
    }) => {
      await playground.open();
      await playground.setTheme(theme);
      await book.sheet.scrollIntoViewIfNeeded();
      await book.scrollBody(160);

      await expect(book.charts).toBeVisible();
      expect(await playground.wcagViolations('section[aria-labelledby="book-title"]')).toEqual([]);

      await book.chooseSheet('Заметки');

      await expect(book.picture('Логотип Numior')).toBeVisible();
      expect(await playground.wcagViolations('section[aria-labelledby="book-title"]')).toEqual([]);
    });
  }
});
