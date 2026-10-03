import { expect, test } from '@playwright/test';
import { PlaygroundPage } from './pages/playground';

const SHEET_ROWS = 1_048_576;
const SHEET_COLS = 16_384;
const LEDGER_END = 499;
const LEDGER_LAST_COLUMN = 29;
const B2 = '4,8';
const C3 = '9,6';

const BLOCK: readonly (readonly [row: number, col: number])[] = [
  [3, 1],
  [3, 2],
  [4, 1],
  [4, 2],
];

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

  test('edits the active cell from the formula bar and shows the draft in the cell', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tableCells: cells } = playground;
    await cells.show();
    await cells.cell(1, 1).click();

    await expect(cells.nameBox).toHaveText('B2');
    await expect(cells.formula).toHaveValue(B2);
    await cells.formula.click();
    await cells.formula.fill('42');
    await expect(cells.editor(1, 1)).toHaveValue('42');
    await expect(cells.formula).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(cells.cell(1, 1)).toHaveText('42');
    await expect(cells.nameBox).toHaveText('B3');
    await expect.poll(() => cells.spot()).toEqual({ row: '3', col: 'B' });
  });

  test('cancels a formula bar edit with Escape and fills a selection with Ctrl+Enter', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tableCells: cells } = playground;
    await cells.show();
    await cells.cell(2, 2).click();
    await cells.formula.click();
    await cells.formula.fill('черновик');
    await page.keyboard.press('Escape');

    await expect(cells.cell(2, 2)).toHaveText(C3);
    await expect.poll(() => cells.spot()).toEqual({ row: '3', col: 'C' });
    await cells.cell(3, 1).click();
    await cells.cell(4, 2).click({ modifiers: ['Shift'] });
    await page.keyboard.type('7');
    await page.keyboard.press('Control+Enter');

    for (const [row, col] of BLOCK) {
      await expect(cells.cell(row, col)).toHaveText('7');
    }
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
