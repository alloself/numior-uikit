import { expect, test } from '@playwright/test';
import { PlaygroundPage } from './pages/playground';

const SHEET_ROWS = 1_048_576;
const SHEET_COLS = 16_384;
const LEDGER_END = 499;
const LEDGER_LAST_COLUMN = 29;

test.describe('table cell source', () => {
  test('shows a million rows and sixteen thousand columns as a sheet', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tableCells: cells } = playground;
    await cells.show();

    await expect(cells.grid).toHaveAttribute('aria-rowcount', String(SHEET_ROWS + 1));
    await expect(cells.grid).toHaveAttribute('aria-colcount', String(SHEET_COLS + 1));
    await expect(cells.columnHeader(0)).toHaveText('A');
    await expect(cells.rowHeader(0)).toHaveText('1');
    await expect(cells.cell(0, 0)).toHaveText('Показатель A');
    await cells.cell(1, 1).click();
    await page.keyboard.press('Control+End');

    await expect.poll(() => cells.spot()).toEqual({ row: String(SHEET_ROWS), col: 'XFD' });
    await page.keyboard.press('Control+Home');
    await expect.poll(() => cells.spot()).toEqual({ row: '1', col: 'A' });
  });

  test('jumps to the edges of the data with Ctrl and the arrows', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tableCells: cells } = playground;
    await cells.show();
    await cells.cell(1, 1).click();
    await page.keyboard.press('Control+ArrowDown');

    await expect.poll(() => cells.spot()).toEqual({ row: String(LEDGER_END + 1), col: 'B' });
    await page.keyboard.press('Control+ArrowDown');
    await expect.poll(() => cells.spot()).toEqual({ row: String(SHEET_ROWS), col: 'B' });
    await page.keyboard.press('Control+ArrowUp');
    await expect.poll(() => cells.spot()).toEqual({ row: String(LEDGER_END + 1), col: 'B' });
    await page.keyboard.press('Control+ArrowRight');
    await expect.poll(() => cells.spot()).toEqual({ row: String(LEDGER_END + 1), col: 'AD' });
    await page.keyboard.press('Control+ArrowRight');
    await expect.poll(() => cells.spot()).toEqual({ row: String(LEDGER_END + 1), col: 'XFD' });
    await page.keyboard.press('Control+Shift+ArrowLeft');

    await expect
      .poll(() => cells.ranges())
      .toEqual([
        {
          from: { row: LEDGER_END, col: SHEET_COLS - 1 },
          to: { row: LEDGER_END, col: LEDGER_LAST_COLUMN },
        },
      ]);
  });

  test('a sheet from a cell source has no automatically detectable WCAG AA violations', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tableCells: cells } = playground;
    await cells.show();
    await expect(cells.cell(0, 0)).toHaveText('Показатель A');

    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      expect(await playground.wcagViolations(cells.scope)).toEqual([]);
    }
  });
});
