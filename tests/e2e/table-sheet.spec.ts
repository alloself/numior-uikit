import { expect, test } from '@playwright/test';
import { paintedRgbAt } from './helpers/color';
import { boxOf } from './helpers/geometry';
import { PlaygroundPage } from './pages/playground';

const SALES = 3;
const INCOME_TOTAL = 6;
const RESULT = 14;
const LAST_COLUMN = 13;
const LAST_QUARTER_COLUMN = 4;
const CORNER_ROWS = [0.4, 0.8, 1.2, 1.6, 2, 2.4, 2.8, 3.2];
const TINT = 8;

test.describe('table cell styles', () => {
  test('draws grid lines between the columns and keeps the pane edge without them', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tableSheet: sheet } = playground;
    await sheet.show();

    expect(await sheet.lineAfter(SALES, 1)).toBe('1px');
    expect(await sheet.lineAfter(SALES, 0)).toBe('1px');
    await sheet.borderedSwitch.click();
    await expect.poll(() => sheet.lineAfter(SALES, 1)).toBe('0px');
    expect(await sheet.lineAfter(SALES, 0)).toBe('1px');
  });

  test('draws the borders a cell names over the grid and leaves the rows their height', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tableSheet: sheet } = playground;
    await sheet.show();

    expect(await sheet.topEdge(INCOME_TOTAL, 2)).toEqual({ width: '1px', style: 'solid' });
    expect(await sheet.topEdge(RESULT, 2)).toEqual({ width: '3px', style: 'double' });
    expect(await sheet.topEdge(SALES, 2)).toBeNull();
    expect(await sheet.boxHeights()).toEqual([44, 32]);
    await sheet.windowSwitch.click();
    await expect(sheet.cell(INCOME_TOTAL, 2)).toBeVisible();
    expect(await sheet.boxHeights()).toEqual([44, 32]);
  });

  test('paints fills and text colours and lays the selection tint over a filled cell', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tableSheet: sheet } = playground;
    await sheet.show();

    await expect(sheet.cell(RESULT, 1)).toHaveCSS('color', await sheet.tokenColor('--nui-error'));
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
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tableSheet: sheet } = playground;
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

  test('selects rows, columns and the whole sheet from the headers', async ({ page, isMobile }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tableSheet: sheet } = playground;
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
      .toEqual([{ from: { row: 0, col: 2 }, to: { row: RESULT, col: 2 } }]);

    await expect(sheet.columnHeader(2)).toHaveClass(/nui-table__cell--marked/);
    await expect(sheet.columnHeader(3)).not.toHaveClass(/nui-table__cell--marked/);
    await (isMobile ? sheet.corner.tap() : sheet.corner.click());

    await expect
      .poll(() => sheet.ranges())
      .toEqual([{ from: { row: 0, col: 0 }, to: { row: RESULT, col: LAST_COLUMN } }]);
  });

  test('extends rows from their headers with Shift, a drag and the keyboard', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'mouse and keyboard scenario');
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tableSheet: sheet } = playground;
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
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'mouse and keyboard scenario');
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tableSheet: sheet } = playground;
    await sheet.show();
    await sheet.windowSwitch.click();
    await expect(sheet.rowHeader(SALES)).toBeVisible();
    expect(await sheet.rowHeights()).toEqual({ 0: 44 });
    expect((await boxOf(sheet.row(0))).height).toBe(44);
    const before = await sheet.scrollHeight();
    const below = await boxOf(sheet.row(SALES + 1));
    const handle = await boxOf(sheet.rowResizer(SALES));

    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2 + 20);
    await page.mouse.up();

    await expect.poll(() => sheet.rowHeights()).toEqual({ 0: 44, [SALES]: 52 });
    expect((await boxOf(sheet.row(SALES))).height).toBe(52);
    expect((await boxOf(sheet.row(SALES + 1))).y).toBe(below.y + 20);
    expect(await sheet.scrollHeight()).toBe(before + 20);
    expect(await sheet.ranges()).toEqual([]);
    await sheet.rowHeader(SALES).click();
    await page.keyboard.press('Home');
    await expect(sheet.rowHeader(SALES)).toBeFocused();
    await page.keyboard.press('Alt+ArrowDown');

    await expect.poll(() => sheet.rowHeights()).toEqual({ 0: 44, [SALES]: 60 });
    await sheet.rowResizer(SALES).dblclick();
    await expect.poll(() => sheet.rowHeights()).toEqual({ 0: 44 });
    expect((await boxOf(sheet.row(SALES))).height).toBe(32);
    expect(await sheet.scrollHeight()).toBe(before);
  });

  test('keeps the first pixel row of the corner solid over a marked header on a half pixel', async ({
    page,
    isMobile,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tableSheet: sheet } = playground;
    await sheet.show();
    await sheet.windowSwitch.click();
    await (isMobile ? sheet.columnHeader(2).tap() : sheet.columnHeader(2).click());
    await expect(sheet.columnHeader(2)).toHaveClass(/nui-table__cell--marked/);
    await sheet.restOnHalfPixel();
    await sheet.scrollTo(96, 300);
    await expect(sheet.rowHeader(SALES + 1)).toBeVisible();

    const column = await paintedRgbAt(
      sheet.root,
      CORNER_ROWS.map((y) => [30, y]),
    );

    expect(column.filter(([red, , blue]) => blue - red > TINT)).toEqual([]);
  });

  test('a painted sheet has no automatically detectable WCAG AA violations', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tableSheet: sheet } = playground;
    await sheet.show();
    await sheet.heatSwitch.click();
    await expect.poll(() => sheet.fillLayers(SALES, 1)).toBe(1);

    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      expect(await playground.wcagViolations(sheet.scope)).toEqual([]);
    }
  });
});
