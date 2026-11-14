import { expect, test } from './fixtures';
import { copiedTexts, stubClipboard } from './helpers/clipboard';
import { boxOf, textBoxOf } from './helpers/geometry';

const SHEET_ROWS = 1_048_576;
const SHEET_COLS = 16_384;
const LEDGER_END = 499;
const NOTE_ROW = LEDGER_END + 1;
const PAD = 8;
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
  test('shows a million rows and sixteen thousand columns as a sheet', async ({
    tableCells: cells,
    playground,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await cells.show();

    await expect(cells.grid).toHaveAttribute('aria-rowcount', String(SHEET_ROWS + 1));
    await expect(cells.grid).toHaveAttribute('aria-colcount', String(SHEET_COLS + 1));
    await expect(cells.columnHeader(0)).toHaveText('A');
    await expect(cells.rowHeader(0)).toHaveText('1');
    await expect(cells.cell(0, 0)).toHaveText('Показатель A');

    await cells.cell(1, 1).click();
    await cells.jumpToLastCell();

    await expect.poll(() => cells.spot()).toEqual({ row: String(SHEET_ROWS), col: 'XFD' });

    await cells.jumpToFirstCell();
    await expect.poll(() => cells.spot()).toEqual({ row: '1', col: 'A' });
  });

  test('jumps to the edges of the data with Ctrl and the arrows', async ({
    tableCells: cells,
    playground,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await cells.show();
    await cells.cell(1, 1).click();
    await cells.jumpToDataEdge('down');

    await expect.poll(() => cells.spot()).toEqual({ row: String(LEDGER_END + 1), col: 'B' });

    await cells.jumpToDataEdge('down');
    await expect.poll(() => cells.spot()).toEqual({ row: String(SHEET_ROWS), col: 'B' });

    await cells.jumpToDataEdge('up');
    await expect.poll(() => cells.spot()).toEqual({ row: String(LEDGER_END + 1), col: 'B' });

    await cells.jumpToDataEdge('right');
    await expect.poll(() => cells.spot()).toEqual({ row: String(LEDGER_END + 1), col: 'AD' });

    await cells.jumpToDataEdge('right');
    await expect.poll(() => cells.spot()).toEqual({ row: String(LEDGER_END + 1), col: 'XFD' });

    await cells.extendToDataEdge('left');

    await expect
      .poll(() => cells.ranges())
      .toEqual([
        {
          from: { row: LEDGER_END, col: SHEET_COLS - 1 },
          to: { row: LEDGER_END, col: LEDGER_LAST_COLUMN },
        },
      ]);
  });

  test('edits a cell from the keyboard, cancels with Escape and fills a selection with Ctrl+Enter', async ({
    tableCells: cells,
    playground,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await cells.show();
    await cells.cell(1, 1).click();
    await cells.typeIntoActiveCell('42');

    await expect(cells.editor(1, 1)).toHaveValue('42');

    await cells.commitEdit();

    await expect(cells.cell(1, 1)).toHaveText('42');
    await expect.poll(() => cells.spot()).toEqual({ row: '3', col: 'B' });

    await cells.cell(2, 2).click();
    await cells.typeIntoActiveCell('draft');
    await cells.cancelEdit();

    await expect(cells.cell(2, 2)).toHaveText(C3);
    await expect.poll(() => cells.spot()).toEqual({ row: '3', col: 'C' });

    await cells.cell(3, 1).click();
    await cells.cell(4, 2).click({ modifiers: ['Shift'] });
    await cells.typeIntoActiveCell('7');
    await cells.fillSelection();

    for (const [row, col] of BLOCK) {
      await expect(cells.cell(row, col)).toHaveText('7');
    }
  });

  test('copies and pastes semicolon separated lines through the clipboard hooks', async ({
    tableCells: cells,
    playground,
    page,
  }) => {
    await stubClipboard(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await cells.show();
    await cells.cell(1, 1).click();
    await cells.cell(2, 2).click({ modifiers: ['Shift'] });
    await cells.copySelection();

    await expect.poll(() => copiedTexts(page)).toEqual([`${B2};6,5\n7,9;${C3}`]);

    await cells.cell(6, 1).click();
    await cells.paste('1;2;3');
    await expect(cells.cell(6, 1)).toHaveText('1');
    await expect(cells.cell(6, 2)).toHaveText('2');
    await expect(cells.cell(6, 3)).toHaveText('3');
  });

  test('undoes and redoes sheet edits through the history of the app', async ({
    tableCells: cells,
    playground,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await cells.show();
    await cells.cell(1, 1).click();
    await cells.typeAndCommit('5');

    await expect(cells.cell(1, 1)).toHaveText('5');

    await cells.undo();
    await expect(cells.cell(1, 1)).toHaveText(B2);

    await cells.redo();
    await expect(cells.cell(1, 1)).toHaveText('5');
  });

  test('redraws recalculated cells when the app invalidates their range', async ({
    tableCells: cells,
    playground,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await cells.show();
    await cells.recalc.click();

    await expect(cells.cell(1, 1)).toHaveText('111');
    await expect(cells.cell(3, 3)).toHaveText('133');

    await cells.recalc.click();
    await expect(cells.cell(1, 1)).toHaveText('211');
    await expect(cells.cell(4, 1)).toHaveText('14,1');
  });

  test('mirrors the sheet in RTL: the row headers sit at the end and the arrows follow the reading direction', async ({
    tableCells: cells,
    playground,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard scenario');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await playground.setDirection('rtl');
    await cells.show();

    expect((await boxOf(cells.rowHeader(1))).x).toBeGreaterThan((await boxOf(cells.cell(1, 0))).x);

    await cells.cell(1, 1).click();
    await cells.moveActive('left');

    await expect.poll(() => cells.spot()).toEqual({ row: '2', col: 'C' });
  });

  test('lets the note under the ledger flow over the empty cells and leaves them to the pointer', async ({
    tableCells: cells,
    playground,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await cells.show();
    await cells.cell(1, 0).click();
    await cells.jumpToDataEdge('down');

    await expect.poll(() => cells.spot()).toEqual({ row: String(NOTE_ROW + 1), col: 'A' });
    await expect(cells.cell(NOTE_ROW, 0)).toHaveClass(/nui-table__cell--spill/);

    const [note, cell] = await Promise.all([
      textBoxOf(cells.text(NOTE_ROW, 0)),
      boxOf(cells.cell(NOTE_ROW, 0)),
    ]);

    expect(note.width).toBeGreaterThan(2 * cell.width);
    expect(await cells.lineAfter(NOTE_ROW, 0)).toBe('0px');

    await cells.cell(NOTE_ROW, 2).click();
    await expect(cells.cell(NOTE_ROW, 2)).toBeFocused();
    expect(await cells.ranges()).toEqual([]);
  });

  test('starts the flowing note at its own cell in either direction', async ({
    tableCells: cells,
    playground,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard scenario');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await cells.show();
    await cells.cell(1, 0).click();
    await cells.jumpToDataEdge('down');
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
    tableCells: cells,
    playground,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await cells.show();
    await expect(cells.cell(0, 0)).toHaveText('Показатель A');

    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      expect(await playground.wcagViolations(cells.scope)).toEqual([]);
    }
  });
});
