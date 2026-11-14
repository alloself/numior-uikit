import { expect, test } from './fixtures';
import { rgbDelta, type Rgb } from './helpers/color';
import { boxOf } from './helpers/geometry';
import { PlaygroundPage } from './pages/playground';

const INCOME = 2;
const SALES = 3;
const INCOME_TOTAL = 6;
const COSTS = 8;
const RESULT = 14;
const LAST_ROW = 16;
const JOURNAL = 18;
const JOURNAL_ROWS = 60;
const LAST_COLUMN = 14;
const LAST_QUARTER_COLUMN = 5;
const ROW = 32;
const CENTRE_WIDTH = 13 * 92 + 170;
const LINE_TOLERANCE = 12;
const LINE_THICKNESS = 1.6;
const PIXEL_FRACTIONS = [0.05, 0.3, 0.55, 0.8];
const PIXEL_RATIOS = [1.25, 1.5];
const TITLE = 0;
const HEAD = 1;
const HEAD_HEIGHT = 32;
const TITLE_HEIGHT = 44;
const FROZEN_BOTTOM = HEAD_HEIGHT + TITLE_HEIGHT + ROW;
const BAND_SCROLLS = [97, 333];
const LINE_DELTA = 6;
const BLACK: Rgb = [0, 0, 0];

const expectSolidHeader = async (
  playground: PlaygroundPage,
  sheet: PlaygroundPage['tableSheet'],
): Promise<void> => {
  await playground.emulate({ reducedMotion: 'reduce' });
  await playground.open();
  await sheet.show();
  await sheet.windowSwitch.click();
  await sheet.paintLayers();

  for (const fraction of PIXEL_FRACTIONS) {
    expect(await sheet.headerLeaks(fraction), `at a pixel fraction of ${fraction}`).toEqual([]);
  }
};

test.describe('table cell styles', () => {
  test('draws grid lines between the columns and keeps the pane edge without them', async ({
    tableSheet: sheet,
    playground,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await sheet.show();

    expect(await sheet.lineAfter(SALES, 1)).toBe('1px');
    expect(await sheet.lineAfter(SALES, 0)).toBe('1px');

    await sheet.gridlinesSwitch.click();
    await expect.poll(() => sheet.lineAfter(SALES, 1)).toBe('0px');
    expect(await sheet.lineAfter(SALES, 0)).toBe('1px');
  });

  test('draws the borders a cell names over the grid and leaves the rows their height', async ({
    tableSheet: sheet,
    playground,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await sheet.show();

    expect(await sheet.topEdge(INCOME_TOTAL, 2)).toEqual({ width: '1px', style: 'solid' });
    expect(await sheet.topEdge(RESULT, 2)).toEqual({ width: '1px', style: 'solid' });
    expect(await sheet.topEdge(SALES, 2)).toBeNull();

    const line = await sheet.lineAbove(INCOME_TOTAL, 1);

    expect(line.thickness).toBeLessThan(LINE_THICKNESS);
    expect(line.strong).toBeLessThan(LINE_TOLERANCE);
    expect(await sheet.boxHeights()).toEqual([44, 32]);

    await sheet.windowSwitch.click();
    await expect(sheet.cell(INCOME_TOTAL, 2)).toBeVisible();
    expect(await sheet.boxHeights()).toEqual([44, 32]);
  });

  test('paints fills and text colours and lays the selection tint over a filled cell', async ({
    tableSheet: sheet,
    playground,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await sheet.show();

    await expect(sheet.cell(RESULT, 1)).toHaveCSS('color', await sheet.tokenColor('--color-error'));
    await expect(sheet.cell(SALES, 1)).toHaveClass(/nui-table__cell--align-end/);
    await expect(sheet.cell(1, 1)).toHaveClass(/nui-table__cell--align-center/);
    expect(await sheet.fillLayers(1, 1)).toBe(1);
    expect(await sheet.fillLayers(SALES, 1)).toBe(0);

    await sheet.heatSwitch.click();
    await expect.poll(() => sheet.fillLayers(SALES, 1)).toBe(1);

    await sheet.cell(SALES, 1).click();
    await expect(sheet.cell(SALES, 1)).toBeFocused();
    await expect.poll(() => sheet.fillLayers(SALES, 1)).toBe(2);
  });

  test('closes the last column with a line only while the table has spare room', async ({
    tableSheet: sheet,
    playground,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await sheet.show();

    expect(await sheet.hasSpareRoom()).toBe(false);
    expect(await sheet.lineAfter(SALES, LAST_COLUMN)).toBe('0px');

    await sheet.quarterSwitch.click();
    await expect(sheet.cell(SALES, LAST_QUARTER_COLUMN + 1)).toHaveCount(0);

    const spare = await sheet.hasSpareRoom();

    await expect
      .poll(() => sheet.lineAfter(SALES, LAST_QUARTER_COLUMN))
      .toBe(spare ? '1px' : '0px');
  });

  test('selects rows, columns and the whole sheet from the headers', async ({
    tableSheet: sheet,
    playground,
    isMobile,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await sheet.show();

    await expect(sheet.rowHeader(SALES)).toHaveText('4');
    await expect(sheet.corner).toHaveText('Номера строк');

    await (isMobile ? sheet.rowHeader(SALES).tap() : sheet.rowHeader(SALES).click());

    await expect
      .poll(() => sheet.ranges())
      .toEqual([{ from: { row: SALES, col: 0 }, to: { row: SALES, col: LAST_COLUMN } }]);

    await expect(sheet.rowHeader(SALES)).toHaveClass(/nui-table__cell--marked/);
    await expect(sheet.rowHeader(SALES + 1)).not.toHaveClass(/nui-table__cell--marked/);
    await expect(sheet.cell(SALES, 2)).toHaveClass(/nui-table__cell--ranged/);

    await (isMobile ? sheet.columnHeader(2).tap() : sheet.columnHeader(2).click());

    await expect
      .poll(() => sheet.ranges())
      .toEqual([{ from: { row: 0, col: 2 }, to: { row: LAST_ROW, col: 2 } }]);

    await expect(sheet.columnHeader(2)).toHaveClass(/nui-table__cell--marked/);
    await expect(sheet.columnHeader(3)).not.toHaveClass(/nui-table__cell--marked/);

    await (isMobile ? sheet.corner.tap() : sheet.corner.click());

    await expect
      .poll(() => sheet.ranges())
      .toEqual([{ from: { row: 0, col: 0 }, to: { row: LAST_ROW, col: LAST_COLUMN } }]);
  });

  test('extends rows from their headers with Shift, a drag and the keyboard', async ({
    tableSheet: sheet,
    playground,
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'mouse and keyboard scenario');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await sheet.show();
    await sheet.rowHeader(SALES).click();
    await sheet.rowHeader(SALES + 2).click({ modifiers: ['Shift'] });

    await expect
      .poll(() => sheet.ranges())
      .toEqual([{ from: { row: SALES, col: 0 }, to: { row: SALES + 2, col: LAST_COLUMN } }]);

    await expect(sheet.cell(SALES + 2, 0)).toBeFocused();

    await page.keyboard.press('Shift+ArrowDown');

    await expect
      .poll(() => sheet.ranges())
      .toEqual([{ from: { row: SALES, col: 0 }, to: { row: SALES + 3, col: LAST_COLUMN } }]);

    await sheet.rowHeader(INCOME_TOTAL + 2).hover();
    await page.mouse.down();
    await sheet.rowHeader(INCOME_TOTAL + 4).hover();
    await page.mouse.up();

    await expect
      .poll(() => sheet.ranges())
      .toEqual([
        {
          from: { row: INCOME_TOTAL + 2, col: 0 },
          to: { row: INCOME_TOTAL + 4, col: LAST_COLUMN },
        },
      ]);

    await page.keyboard.press('Home');
    await expect(sheet.rowHeader(INCOME_TOTAL + 2)).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');

    await expect
      .poll(() => sheet.ranges())
      .toEqual([
        {
          from: { row: INCOME_TOTAL + 3, col: 0 },
          to: { row: INCOME_TOTAL + 3, col: LAST_COLUMN },
        },
      ]);
  });

  test('resizes a row by the edge of its header and counts the height in the scroll', async ({
    tableSheet: sheet,
    playground,
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'mouse and keyboard scenario');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await sheet.show();
    await sheet.windowSwitch.click();
    await expect(sheet.rowHeader(SALES)).toBeVisible();
    expect(await sheet.rowHeights()).toEqual({ 0: 44 });
    expect((await boxOf(sheet.row(0))).height).toBeCloseTo(44, 3);

    const before = await sheet.scrollHeight();
    const below = await boxOf(sheet.row(SALES + 1));
    const handle = await boxOf(sheet.rowResizer(SALES));

    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2 + 20);
    await page.mouse.up();

    await expect.poll(() => sheet.rowHeights()).toEqual({ 0: 44, [SALES]: 52 });
    expect((await boxOf(sheet.row(SALES))).height).toBeCloseTo(52, 3);
    expect((await boxOf(sheet.row(SALES + 1))).y).toBeCloseTo(below.y + 20, 3);
    expect(await sheet.scrollHeight()).toBe(before + 20);
    expect(await sheet.ranges()).toEqual([]);

    await sheet.rowHeader(SALES).click();
    await page.keyboard.press('Home');
    await expect(sheet.rowHeader(SALES)).toBeFocused();

    await page.keyboard.press('Alt+ArrowDown');

    await expect.poll(() => sheet.rowHeights()).toEqual({ 0: 44, [SALES]: 60 });

    await sheet.rowResizer(SALES).dblclick();
    await expect.poll(() => sheet.rowHeights()).toEqual({ 0: 44 });
    expect((await boxOf(sheet.row(SALES))).height).toBeCloseTo(32, 3);
    expect(await sheet.scrollHeight()).toBe(before);
  });

  test('keeps scrolled cells from showing over the header at any pixel fraction', async ({
    playground,
    tableSheet,
  }) => {
    await expectSolidHeader(playground, tableSheet);
  });

  test('draws a merged range as one cell with its text wrapped in the middle', async ({
    tableSheet: sheet,
    playground,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await sheet.show();

    await expect(sheet.cell(INCOME, 0)).toHaveText('Доходы');
    await expect(sheet.cell(INCOME, 2)).toHaveCount(0);
    expect((await boxOf(sheet.cell(INCOME, 1))).width).toBeCloseTo(CENTRE_WIDTH, 3);

    await sheet.scrollTo(0, CENTRE_WIDTH);
    await expect(sheet.cell(SALES, LAST_COLUMN)).toHaveAttribute('rowspan', '3');
    await expect(sheet.cell(SALES + 1, LAST_COLUMN)).toHaveCount(0);
    expect((await boxOf(sheet.cell(SALES, LAST_COLUMN))).height).toBeCloseTo(3 * ROW, 3);
    expect(await sheet.middleGap(SALES, LAST_COLUMN)).toBeLessThan(1.5);
    expect(await sheet.middleGap(COSTS, LAST_COLUMN)).toBeLessThan(1.5);
    expect(await sheet.textLines(COSTS, LAST_COLUMN)).toBeGreaterThan(1);
    expect(await sheet.boxHeights()).toEqual([44, ROW]);
  });

  test('moves the cursor through a merged cell and selects it whole', async ({
    tableSheet: sheet,
    playground,
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'mouse and keyboard scenario');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await sheet.show();
    await sheet.scrollTo(0, CENTRE_WIDTH);
    await sheet.cell(SALES, LAST_COLUMN - 1).click();
    await page.keyboard.press('ArrowRight');
    await expect(sheet.cell(SALES, LAST_COLUMN)).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(sheet.cell(INCOME_TOTAL, LAST_COLUMN)).toBeFocused();

    await page.keyboard.press('ArrowUp');
    await expect(sheet.cell(SALES, LAST_COLUMN)).toBeFocused();

    await page.keyboard.press('Shift+ArrowLeft');

    await expect
      .poll(() => sheet.ranges())
      .toEqual([
        { from: { row: SALES, col: LAST_COLUMN }, to: { row: SALES + 2, col: LAST_COLUMN - 1 } },
      ]);

    await expect(sheet.cell(SALES + 2, LAST_COLUMN - 1)).toHaveClass(/nui-table__cell--ranged/);
  });

  test('keeps both pieces of a merge split by the pinned column under one cursor', async ({
    tableSheet: sheet,
    playground,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await sheet.show();

    expect(await sheet.fillLayers(INCOME, 0)).toBe(1);

    await sheet.cell(INCOME, 1).click({ position: { x: 40, y: 10 } });
    await expect(sheet.cell(INCOME, 1)).toBeFocused();
    await expect(sheet.cell(INCOME, 0)).toHaveClass(/nui-table__cell--allied/);
    await expect.poll(() => sheet.fillLayers(INCOME, 0)).toBe(2);
    expect(await sheet.fillLayers(INCOME, 1)).toBe(2);
    expect(await sheet.ranges()).toEqual([]);

    await sheet.cell(SALES, 1).click();
    await expect(sheet.cell(INCOME, 0)).not.toHaveClass(/nui-table__cell--allied/);
    await expect.poll(() => sheet.fillLayers(INCOME, 0)).toBe(1);
  });

  test('draws the line under a merged cell as strong as under its neighbour at any pixel fraction', async ({
    tableSheet: sheet,
    playground,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await sheet.show();
    await sheet.scrollTo(0, CENTRE_WIDTH);
    await expect(sheet.cell(SALES, LAST_COLUMN)).toHaveAttribute('rowspan', '3');

    const cells = [sheet.cell(SALES, LAST_COLUMN), sheet.cell(SALES + 2, LAST_COLUMN - 1)];

    for (const fraction of PIXEL_FRACTIONS) {
      const [merged = BLACK, plain = BLACK] = await sheet.linesBelow(fraction, cells);

      expect(rgbDelta(merged, plain), `at a pixel fraction of ${fraction}`).toBeLessThanOrEqual(
        LINE_DELTA,
      );
    }
  });

  test('continues a tall merge through the row window without moving its content', async ({
    tableSheet: sheet,
    playground,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await sheet.show();
    await sheet.longSwitch.click();
    await sheet.windowSwitch.click();
    await sheet.scrollTo(8 * ROW, CENTRE_WIDTH);
    await expect(sheet.cell(JOURNAL, LAST_COLUMN)).toBeVisible();

    const top = await sheet.canvasTop(sheet.row(JOURNAL));

    expect(await sheet.canvasTop(sheet.content(sheet.journalNote))).toBe(top);

    await sheet.scrollTo(40 * ROW, CENTRE_WIDTH);
    await expect(sheet.cell(JOURNAL, LAST_COLUMN)).toHaveCount(0);
    await expect(sheet.journalNote).toHaveCount(1);
    await expect(sheet.journalNote).toBeVisible();

    const content = await boxOf(sheet.content(sheet.journalNote));

    expect(Math.round(content.height)).toBe(JOURNAL_ROWS * ROW);
    expect(await sheet.canvasTop(sheet.content(sheet.journalNote))).toBe(top);
    expect(await sheet.boxHeights()).toEqual([44, ROW]);

    await sheet.scrollTo(44 * ROW, CENTRE_WIDTH);
    await expect(sheet.text(JOURNAL, LAST_COLUMN)).toHaveCount(0);
    await expect(sheet.journalNote).toContainText('Операции сверены с банком');
    expect(await sheet.canvasTop(sheet.content(sheet.journalNote))).toBe(top);
  });

  test('keeps the first rows of the sheet under the header while the rest scroll', async ({
    tableSheet: sheet,
    playground,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await sheet.show();
    await sheet.longSwitch.click();
    await sheet.windowSwitch.click();
    await sheet.frozenSwitch.click();

    expect(await sheet.bandOf(sheet.rowHeader(TITLE))).toEqual({
      top: HEAD_HEIGHT,
      bottom: HEAD_HEIGHT + TITLE_HEIGHT,
    });

    await sheet.scrollTo(12 * ROW, 300);
    await expect(sheet.cell(JOURNAL, 0)).toBeVisible();

    expect(await sheet.bandOf(sheet.rowHeader(TITLE))).toEqual({
      top: HEAD_HEIGHT,
      bottom: HEAD_HEIGHT + TITLE_HEIGHT,
    });

    expect(await sheet.bandOf(sheet.cell(HEAD, 0))).toEqual({
      top: HEAD_HEIGHT + TITLE_HEIGHT,
      bottom: FROZEN_BOTTOM,
    });

    expect(await sheet.rowAt(FROZEN_BOTTOM - 4)).toBe(HEAD);
    expect(await sheet.rowAt(FROZEN_BOTTOM + 4)).toBeGreaterThan(SALES);
    await expect(sheet.text(HEAD, 0)).toHaveText('Статья');

    expect(await sheet.lineColorBelow(sheet.rowHeader(HEAD))).toBe(
      await sheet.lineColorBelow(sheet.rowHeader(JOURNAL)),
    );

    await sheet.frozenSwitch.click();
    await expect(sheet.row(HEAD)).toHaveCount(0);
  });

  test('reveals the cursor below the frozen rows and leaves them where they are', async ({
    tableSheet: sheet,
    playground,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await sheet.show();
    await sheet.longSwitch.click();
    await sheet.windowSwitch.click();
    await sheet.frozenSwitch.click();
    await sheet.scrollTo(12 * ROW, 0);
    await expect(sheet.cell(JOURNAL, 0)).toBeVisible();

    await sheet.focusNatively(sheet.cell(HEAD, 2));
    await expect(sheet.cell(HEAD, 2)).toBeFocused();

    expect(await sheet.scrollTop()).toBe(12 * ROW);

    await sheet.focusNatively(sheet.columnHeader(2));
    await expect(sheet.columnHeader(2)).toBeFocused();
    expect(await sheet.scrollTop()).toBe(12 * ROW);

    await sheet.focusNatively(sheet.cell(HEAD, 2));
    await page.keyboard.press('ArrowDown');
    await expect(sheet.cell(INCOME, 1)).toBeFocused();
    expect(await sheet.scrollTop()).toBe(0);

    await page.keyboard.press('PageDown');
    await page.keyboard.press('PageDown');
    await expect.poll(() => sheet.scrollTop()).toBeGreaterThan(0);

    const focused = sheet.grid.locator('.nui-table__cell--active');

    expect((await sheet.bandOf(focused)).top).toBeGreaterThanOrEqual(FROZEN_BOTTOM);

    await page.keyboard.press('PageUp');
    expect((await sheet.bandOf(focused)).top).toBeGreaterThanOrEqual(FROZEN_BOTTOM);

    await page.keyboard.press('Control+Home');
    await expect(sheet.cell(TITLE, 0)).toBeFocused();
    expect(await sheet.scrollTop()).toBeGreaterThan(0);
  });

  test('holds the rendered rows under the frozen ones when the scroll runs ahead of the window', async ({
    tableSheet: sheet,
    playground,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await sheet.show();
    await sheet.longSwitch.click();
    await sheet.windowSwitch.click();
    await sheet.frozenSwitch.click();
    await expect(sheet.row(HEAD)).toHaveClass(/nui-table__row--frozen/);

    const down = await sheet.runAhead(40 * ROW);

    expect(down.frozenBottom).toBe(FROZEN_BOTTOM);
    expect(down.lastBottom).toBe(down.end);
    await expect(sheet.cell(JOURNAL + 30, 0)).toBeVisible();

    const up = await sheet.runAhead(0);

    expect(up.firstTop).toBe(up.frozenBottom);
  });

  test('jumps to the edges of the sheet with Ctrl and the arrows', async ({
    tableSheet: sheet,
    playground,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await sheet.show();
    await sheet.cell(SALES, 1).click();
    await page.keyboard.press('Control+ArrowDown');

    await expect(sheet.cell(LAST_ROW, 1)).toBeFocused();

    await page.keyboard.press('Control+Shift+ArrowRight');

    await expect
      .poll(() => sheet.ranges())
      .toEqual([{ from: { row: LAST_ROW, col: 1 }, to: { row: LAST_ROW, col: LAST_COLUMN } }]);

    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+ArrowUp');
    await expect(sheet.cell(TITLE, 1)).toBeFocused();
  });

  test('names the cell under the pointer', async ({ tableSheet: sheet, playground, isMobile }) => {
    test.skip(isMobile, 'a hovering pointer');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await sheet.show();
    await sheet.cell(SALES + 1, 2).hover();

    await expect(sheet.pointer).toHaveText('C5');

    await sheet.quarterSwitch.click();
    await sheet.cell(SALES + 1, LAST_QUARTER_COLUMN - 1).hover();
    await expect(sheet.pointer).toHaveText('N5');
  });

  test('mirrors the row headers and the pointer name in RTL', async ({
    tableSheet: sheet,
    playground,
    isMobile,
  }) => {
    test.skip(isMobile, 'a hovering pointer');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await playground.setDirection('rtl');
    await sheet.show();

    expect((await boxOf(sheet.rowHeader(SALES))).x).toBeGreaterThan(
      (await boxOf(sheet.cell(SALES, 0))).x,
    );

    await sheet.cell(SALES + 1, 2).hover();
    await expect(sheet.pointer).toHaveText('C5');
  });

  test('a painted sheet has no automatically detectable WCAG AA violations', async ({
    tableSheet: sheet,
    playground,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await sheet.show();
    await sheet.heatSwitch.click();
    await expect.poll(() => sheet.fillLayers(SALES, 1)).toBe(1);

    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      expect(await playground.wcagViolations(sheet.scope)).toEqual([]);
    }
  });
});

for (const ratio of PIXEL_RATIOS) {
  test.describe(`table header at a pixel ratio of ${ratio}`, () => {
    test.use({ deviceScaleFactor: ratio });

    test('keeps scrolled cells from showing over the header', async ({
      playground,
      tableSheet,
      isMobile,
    }) => {
      test.skip(isMobile, 'pixel ratios of a desktop display');
      await expectSolidHeader(playground, tableSheet);
    });

    test('keeps scrolled rows from showing between the frozen rows', async ({
      tableSheet: sheet,
      playground,
      isMobile,
    }) => {
      test.skip(isMobile, 'pixel ratios of a desktop display');
      await playground.emulate({ reducedMotion: 'reduce' });
      await playground.open();
      await sheet.show();
      await sheet.longSwitch.click();
      await sheet.windowSwitch.click();
      await sheet.frozenSwitch.click();
      await expect(sheet.row(HEAD)).toHaveClass(/nui-table__row--frozen/);

      await sheet.paintScrolledRows();

      for (const fraction of PIXEL_FRACTIONS) {
        for (const top of BAND_SCROLLS) {
          expect(
            await sheet.bandLeaks(fraction, top),
            `at a pixel fraction of ${fraction} and a scroll of ${top}`,
          ).toEqual([]);
        }
      }
    });
  });
}
