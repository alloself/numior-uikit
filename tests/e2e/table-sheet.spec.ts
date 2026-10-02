import { expect, test } from '@playwright/test';
import { PlaygroundPage } from './pages/playground';

const SALES = 3;
const INCOME_TOTAL = 6;
const RESULT = 14;
const LAST_COLUMN = 13;
const LAST_QUARTER_COLUMN = 4;

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
    expect(await sheet.rowHeights()).toHaveLength(1);
    await sheet.windowSwitch.click();
    await expect(sheet.cell(INCOME_TOTAL, 2)).toBeVisible();
    expect(await sheet.rowHeights()).toEqual([32]);
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
      expect(await playground.wcagViolations()).toEqual([]);
    }
  });
});
