import { expect, test } from './fixtures';
import { copiedTexts, stubClipboard } from './helpers/clipboard';
import { boxGaps, boxOf } from './helpers/geometry';

const SHEET_ROWS = 1_048_576;
const SHEET_COLS = 16_384;
const LEDGER_END = 499;
const NOTE_ROW = LEDGER_END + 1;
const PAD = 8;
const LEDGER_LAST_COLUMN = 29;
const B2 = '4,8';
const C3 = '9,6';
const C6 = '18,9';

const BLOCK: readonly (readonly [row: number, col: number])[] = [
  [3, 1],
  [3, 2],
  [4, 1],
  [4, 2],
];

test.describe('table cell source', () => {
  test('shows a million rows and sixteen thousand columns as a sheet', async ({
    playground,
    page,
  }) => {
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

  test('jumps to the edges of the data with Ctrl and the arrows', async ({ playground, page }) => {
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
    playground,
    page,
  }) => {
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
    playground,
    page,
  }) => {
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

  test('picks references into a formula with the pointer and draws them over the cells', async ({
    playground,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tableCells: cells } = playground;
    await cells.show();
    await cells.cell(1, 1).click();
    await cells.formula.click();
    await cells.formula.fill('=SUM(');
    await cells.cell(2, 3).click();

    await expect(cells.formula).toHaveValue('=SUM(D3');
    await expect(cells.formula).toBeFocused();

    await cells.dragAcross(cells.cell(2, 3), cells.cell(4, 4));
    await expect(cells.formula).toHaveValue('=SUM(D3:E5');
    await expect(cells.references).toHaveCount(1);

    expect(
      boxGaps(await boxOf(cells.references.first()), await cells.spanOf([2, 3], [4, 4])),
    ).toEqual([0, 0, 0, 0]);

    await cells.formula.press('End');
    await page.keyboard.type(')');
    await page.keyboard.press('Enter');
    await expect(cells.cell(1, 1)).toHaveText('=SUM(D3:E5)');
  });

  test('picks references with the arrows in the cell editor and starts again after an operator', async ({
    playground,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tableCells: cells } = playground;
    await cells.show();
    await cells.cell(5, 2).click();
    await page.keyboard.type('=');
    await page.keyboard.press('ArrowUp');

    await expect(cells.editor(5, 2)).toHaveValue('=C5');

    await page.keyboard.press('ArrowRight');
    await expect(cells.editor(5, 2)).toHaveValue('=D5');

    await page.keyboard.press('Shift+ArrowDown');
    await expect(cells.editor(5, 2)).toHaveValue('=D5:D6');

    await page.keyboard.type('+');
    await page.keyboard.press('ArrowLeft');
    await expect(cells.editor(5, 2)).toHaveValue('=D5:D6+B6');
    await expect(cells.references).toHaveCount(2);

    await page.keyboard.press('Escape');
    await expect(cells.cell(5, 2)).toHaveText(C6);
  });

  test('picks a reference with a tap on a phone', async ({ playground, page, isMobile }) => {
    test.skip(!isMobile, 'touch only');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tableCells: cells } = playground;
    await cells.show();
    await cells.cell(1, 1).tap();
    await cells.formula.tap();
    await cells.formula.fill('=');
    await cells.cell(3, 2).tap();

    await expect(cells.formula).toHaveValue('=C4');
    await expect(cells.formula).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(cells.cell(1, 1)).toHaveText(B2);
  });

  test('copies and pastes semicolon separated lines through the clipboard hooks', async ({
    playground,
    page,
  }) => {
    await stubClipboard(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tableCells: cells } = playground;
    await cells.show();
    await cells.cell(1, 1).click();
    await cells.cell(2, 2).click({ modifiers: ['Shift'] });
    await page.keyboard.press('Control+c');

    await expect.poll(() => copiedTexts(page)).toEqual([`${B2};6,5\n7,9;${C3}`]);

    await cells.cell(6, 1).click();
    await cells.paste('1;2;3');
    await expect(cells.cell(6, 1)).toHaveText('1');
    await expect(cells.cell(6, 2)).toHaveText('2');
    await expect(cells.cell(6, 3)).toHaveText('3');
  });

  test('undoes and redoes sheet edits through the history of the app', async ({
    playground,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tableCells: cells } = playground;
    await cells.show();
    await cells.cell(1, 1).click();
    await page.keyboard.type('5');
    await page.keyboard.press('Enter');

    await expect(cells.cell(1, 1)).toHaveText('5');

    await page.keyboard.press('Control+z');
    await expect(cells.cell(1, 1)).toHaveText(B2);

    await page.keyboard.press('Control+y');
    await expect(cells.cell(1, 1)).toHaveText('5');
  });

  test('redraws recalculated cells when the app invalidates their range', async ({
    playground,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tableCells: cells } = playground;
    await cells.show();
    await cells.recalc.click();

    await expect(cells.cell(1, 1)).toHaveText('111');
    await expect(cells.cell(3, 3)).toHaveText('133');

    await cells.recalc.click();
    await expect(cells.cell(1, 1)).toHaveText('211');
    await expect(cells.cell(4, 1)).toHaveText('14,1');
  });

  test('mirrors the sheet in RTL: arrows follow the reading direction and boxes cover their cells', async ({
    playground,
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard scenario');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await playground.setDirection('rtl');
    const { tableCells: cells } = playground;
    await cells.show();

    expect((await boxOf(cells.rowHeader(1))).x).toBeGreaterThan((await boxOf(cells.cell(1, 0))).x);

    await cells.cell(1, 1).click();
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => cells.spot()).toEqual({ row: '2', col: 'C' });

    await page.keyboard.type('=');
    await page.keyboard.press('ArrowLeft');
    await expect(cells.editor(1, 2)).toHaveValue('=D2');

    await page.keyboard.press('Shift+ArrowDown');
    await expect(cells.editor(1, 2)).toHaveValue('=D2:D3');
    await expect(cells.references).toHaveCount(1);

    expect(
      boxGaps(await boxOf(cells.references.first()), await cells.spanOf([1, 3], [2, 3])),
    ).toEqual([0, 0, 0, 0]);

    await page.keyboard.press('Escape');
    await expect(cells.editor(1, 2)).toHaveCount(0);
  });

  test('lets the note under the ledger flow over the empty cells and leaves them to the pointer', async ({
    playground,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tableCells: cells } = playground;
    await cells.show();
    await cells.cell(1, 0).click();
    await page.keyboard.press('Control+ArrowDown');

    await expect.poll(() => cells.spot()).toEqual({ row: String(NOTE_ROW + 1), col: 'A' });
    await expect(cells.cell(NOTE_ROW, 0)).toHaveClass(/nui-table__cell--overflow/);

    const [note, cell] = await Promise.all([
      boxOf(cells.text(NOTE_ROW, 0)),
      boxOf(cells.cell(NOTE_ROW, 0)),
    ]);

    expect(note.width).toBeGreaterThan(2 * cell.width);
    expect(await cells.lineAfter(NOTE_ROW, 0)).toBe('0px');

    await cells.cell(NOTE_ROW, 2).click();
    await expect(cells.cell(NOTE_ROW, 2)).toBeFocused();
    expect(await cells.ranges()).toEqual([]);
  });

  test('starts the flowing note at its own cell in either direction', async ({
    playground,
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard scenario');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tableCells: cells } = playground;
    await cells.show();
    await cells.cell(1, 0).click();
    await page.keyboard.press('Control+ArrowDown');
    const cell = await boxOf(cells.cell(NOTE_ROW, 0));

    expect((await cells.inkOf(NOTE_ROW, 0)).left - cell.x).toBeCloseTo(PAD, 0);

    await playground.setDirection('rtl');
    const mirrored = await boxOf(cells.cell(NOTE_ROW, 0));

    expect(mirrored.x + mirrored.width - (await cells.inkOf(NOTE_ROW, 0)).right).toBeCloseTo(
      PAD,
      0,
    );
  });

  test('a sheet from a cell source has no automatically detectable WCAG AA violations', async ({
    playground,
  }) => {
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
