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

  test('keeps the chart on its cells frame by frame while the sheet scrolls', async ({
    playground,
    book,
  }) => {
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();

    await expect(book.charts).toHaveCount(1);

    const gaps = await book.chartRowGaps('20', 24, 5);

    expect(gaps.length).toBeGreaterThan(12);
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(1);
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

  test('drags the picture, keeps the sheet where it was and returns it on undo', async ({
    playground,
    book,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.chooseSheet('Заметки');

    const picture = book.picture('Логотип Numior');

    await expect(picture).toBeVisible();

    const before = await boxOf(picture);

    await book.dragBy(picture, 40, 24);

    await expect(book.selectionFrame).toBeVisible();

    const moved = await boxOf(picture);

    expect([near(moved.x, before.x + 40), near(moved.y, before.y + 24)]).toEqual([true, true]);

    await page.keyboard.press('Control+z');

    await expect.poll(async () => (await boxOf(picture)).x).toBeCloseTo(before.x, 0);
  });

  test('resizes the picture by a corner and keeps its ratio with Shift', async ({
    playground,
    book,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.chooseSheet('Заметки');

    const picture = book.picture('Логотип Numior');

    await expect(picture).toBeVisible();

    await picture.click();

    await expect(book.handle('bottom-end')).toBeVisible();

    const before = await boxOf(picture);

    await book.dragBy(book.handle('bottom-end'), -30, -20);

    await expect.poll(async () => (await boxOf(picture)).width).toBeCloseTo(before.width - 30, 0);

    const resized = await boxOf(picture);

    expect(near(resized.height, before.height - 20)).toBe(true);

    await page.keyboard.down('Shift');
    await book.dragBy(book.handle('bottom-end'), 20, 0);
    await page.keyboard.up('Shift');

    await expect
      .poll(async () => {
        const box = await boxOf(picture);

        return box.width / box.height;
      })
      .toBeCloseTo(resized.width / resized.height, 1);
  });

  test('nudges, deletes and restores a drawing from the keyboard', async ({
    playground,
    book,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.chooseSheet('Заметки');

    const picture = book.picture('Логотип Numior');

    await expect(picture).toBeVisible();

    const before = await boxOf(picture);

    await book.cell('1', 0).click();
    await page.keyboard.press('Alt+F10');

    await expect(book.selectionFrame).toBeVisible();

    await page.keyboard.press('ArrowRight');

    await expect.poll(async () => (await boxOf(picture)).x).toBeCloseTo(before.x + 1, 0);

    await page.keyboard.press('Delete');

    await expect(picture).toHaveCount(0);

    await page.keyboard.press('Control+z');

    await expect(picture).toBeVisible();
  });

  test('inserts a chart from the region of a cell, selected, and takes it back on undo', async ({
    playground,
    book,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();

    await expect(book.charts).toHaveCount(1);

    await book.insertChart('3', 1, 'График');

    await expect(book.charts).toHaveCount(2);
    await expect(book.selectionFrame).toBeVisible();

    expect(await book.frameClearsRowHeaders()).toBe(true);

    await page.keyboard.press('Control+z');

    await expect(book.charts).toHaveCount(1);
  });

  test('leaves the keys of the chart menu to the menu and the focus in the sheet', async ({
    playground,
    book,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.insertChart('3', 1, 'График');
    await expect(book.selectedDrawing).toHaveCount(1);

    const placed = await boxOf(book.selectedDrawing);

    await page.keyboard.press('Shift+F10');
    await page.keyboard.press('ArrowDown');
    await expect(book.drawingMenu.getByRole('menuitem', { name: 'Удалить' })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(book.drawingMenu).toBeHidden();
    await expect(book.selectedDrawing).toHaveCount(1);
    await expect(book.focusedCell).toHaveCount(1);

    expect(await boxOf(book.selectedDrawing)).toEqual(placed);

    await page.keyboard.press('F2');
    await page.keyboard.press('Backspace');
    await expect(book.charts).toHaveCount(2);
    await expect(book.selectedDrawing).toHaveCount(0);
  });

  test('inserts a picture from a file and from the clipboard, undo takes them back', async ({
    playground,
    book,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();

    const before = await book.pictures.count();
    const png = await book.pngOf(120, 80);

    await book.insertPicture('3', 1, png);

    await expect(book.pictures).toHaveCount(before + 1);
    await expect(book.selectionFrame).toBeVisible();

    await expect.poll(async () => near((await boxOf(book.selectionFrame)).width, 120)).toBe(true);

    await book.cell('12', 0).click();
    await book.pasteImage(png);

    await expect(book.pictures).toHaveCount(before + 2);

    await page.keyboard.press('Control+z');
    await page.keyboard.press('Control+z');

    await expect(book.pictures).toHaveCount(before);
  });

  test('changes a chart through its settings and undo brings it back', async ({
    playground,
    book,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();

    await book.openChartSettings();

    await expect(book.chartSettings).toBeVisible();

    await book.setChartTitle('Итоги квартала');

    await expect(book.chartTitle).toHaveText('Итоги квартала');

    await book.turnChartLegendOff();

    await expect(book.chartLegend).toHaveCount(0);

    await book.chooseChartKind('Круговая');

    await expect(book.charts.first().locator('.nui-chart__bar')).toHaveCount(0);
    await expect(book.chartKind).toBeFocused();

    await page.keyboard.press('Escape');

    await expect(book.chartSettings).toBeHidden();

    await page.keyboard.press('Control+z');
    await page.keyboard.press('Control+z');
    await page.keyboard.press('Control+z');

    await expect(book.chartLegend.first()).toBeVisible();
    await expect(book.chartTitle).not.toHaveText('Итоги квартала');
  });

  test('removes a chart from its own menu at the pointer and undo brings it back', async ({
    playground,
    book,
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'a right click');

    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.scrollBody(160);

    const pressed = await book.openDrawingMenuAt(book.charts);
    const menu = await boxOf(book.drawingMenu);

    await expect(book.selectionFrame).toBeVisible();

    await expect(book.drawingMenu.getByRole('menuitem')).toHaveText([
      'Настройки диаграммы',
      'Удалить',
    ]);

    expect([near(menu.x, pressed.x), Math.abs(menu.y - pressed.y) <= 8]).toEqual([true, true]);

    await book.chooseDrawingMenuItem('Удалить');

    await expect(book.charts).toHaveCount(0);
    await expect(book.focusedCell).toBeFocused();

    await page.keyboard.press('Control+z');

    await expect(book.charts).toHaveCount(1);
  });

  test('opens the menu of a selected chart from the keyboard and its settings from the menu', async ({
    playground,
    book,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.scrollBody(160);
    await book.charts.click();
    await page.keyboard.press('Shift+F10');

    await expect(book.drawingMenu.getByRole('menuitem').first()).toBeFocused();
    await expect(book.shownMenus).toHaveCount(1);

    await page.keyboard.press('Enter');

    await expect(book.chartSettings).toBeVisible();
  });

  test('opens the menu of a picture held by a finger and removes it', async ({
    playground,
    book,
    isMobile,
  }) => {
    test.skip(!isMobile, 'touch only');

    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.chooseSheet('Заметки');

    const picture = book.picture('Логотип Numior');

    await expect(picture).toBeVisible();

    await book.holdDrawing(book.pictures);

    await expect(book.drawingMenu.getByRole('menuitem')).toHaveText(['Удалить']);

    await book.drawingMenu.getByRole('menuitem', { name: 'Удалить', exact: true }).tap();

    await expect(picture).toHaveCount(0);
  });

  test('drops the selection when a cell is clicked', async ({ playground, book }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.chooseSheet('Заметки');

    const picture = book.picture('Логотип Numior');

    await expect(picture).toBeVisible();

    await picture.click();

    await expect(book.selectionFrame).toBeVisible();

    await book.cell('1', 0).click();

    await expect(book.selectionFrame).toHaveCount(0);
  });

  test('selects a picture with a tap and leaves the scroll to the finger', async ({
    playground,
    book,
    isMobile,
  }) => {
    test.skip(!isMobile, 'touch only');

    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.chooseSheet('Заметки');

    const picture = book.picture('Логотип Numior');

    await expect(picture).toBeVisible();

    await picture.tap();

    await expect(book.selectionFrame).toBeVisible();
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

      await book.openDrawingMenuAt(book.pictures);

      expect(await playground.wcagViolations('section[aria-labelledby="book-title"]')).toEqual([]);
    });
  }
});
