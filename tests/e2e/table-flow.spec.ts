import { expect, test } from './fixtures';
import type { TableFlowPiece, TableFlowSection } from './pages/table-flow';

const PAD = 8;
const TITLE = 0;
const BLOCKS = 1;
const STOPPED = 2;
const END = 3;
const CENTRE = 4;
const BLOCKED = 5;
const BESIDE_MERGE = 6;
const IN_MERGE = 7;
const CUT = 8;
const DECORATED = 9;
const WINDOW_SHIFT = 600;
const FROZEN_SHIFT = 60;
const PINNED_SHIFT = 150;

const CUT_TEXT =
  'Очень длинная подпись уходит за окно колонок, а её продолжение остаётся видно в ячейках справа';

const shownCols = async (
  flow: TableFlowSection,
  row: number,
  from: number,
  to: number,
): Promise<number[]> => {
  const shown = await Promise.all(
    Array.from({ length: to - from + 1 }, async (_, index) =>
      (await flow.cell(row, from + index).count()) > 0 ? from + index : -1,
    ),
  );

  return shown.filter((col) => col >= 0);
};

const shownPieces = async (
  flow: TableFlowSection,
  row: number,
  from: number,
  to: number,
): Promise<TableFlowPiece[]> =>
  Promise.all((await shownCols(flow, row, from, to)).map((col) => flow.pieceOf(row, col)));

const expectOneText = async (
  flow: TableFlowSection,
  row: number,
  from: number,
  to: number,
): Promise<TableFlowPiece[]> => {
  await flow.scrollToColumn(Math.max(0, from - 1));
  await expect(flow.cell(row, from)).toHaveCount(1);

  expect(await flow.spills(row)).toEqual(await shownCols(flow, row, from, to));

  const pieces = await shownPieces(flow, row, from, to);
  const first = pieces[0];

  expect(pieces.length).toBeGreaterThan(1);
  expect(first).toBeDefined();

  for (const piece of pieces) {
    expect(piece.text).toBe(first?.text);
    expect(piece.clip).toBe('clip');
    expect(piece.piece.x).toBeCloseTo(first?.piece.x ?? 0, 0);
    expect(piece.piece.width).toBeCloseTo(first?.piece.width ?? 0, 0);
  }

  expect(pieces.slice(0, -1).map((piece) => piece.line)).toEqual(
    pieces.slice(0, -1).map(() => '0px'),
  );

  return pieces;
};

test.describe('table text flow', () => {
  test.beforeEach(async ({ tableFlow: flow, playground }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await flow.show();
  });

  test('draws one text over the empty cells from the start, from the end and from the centre', async ({
    tableFlow: flow,
  }) => {
    await expect(flow.cell(TITLE, 0)).toContainText('Сводный отчёт');

    await expectOneText(flow, TITLE, 0, 4);
    await expectOneText(flow, BLOCKS, 1, await flow.reachOf(BLOCKS, 1));
    await expectOneText(flow, STOPPED, 1, 4);

    const start = await flow.pieceOf(STOPPED, 1);

    expect(start.piece.x - start.cell.x).toBeCloseTo(PAD, 0);
    expect(await flow.pieceOf(STOPPED, 2)).toMatchObject({ hidden: true });

    await expectOneText(flow, END, 5, 7);

    expect(await flow.pieceOf(END, 7)).toMatchObject({ hidden: false, line: '1px' });
    expect(await flow.pieceOf(STOPPED, 7)).toMatchObject({ text: 'Стоп', hidden: false });

    await expectOneText(flow, CENTRE, 4, 6);
  });

  test('stops at a filled cell and at a merge and clips the text inside a merge', async ({
    tableFlow: flow,
  }) => {
    await expectOneText(flow, BLOCKED, 1, 2);
    await expectOneText(flow, BESIDE_MERGE, 1, 2);

    expect(await flow.lineAfter(BLOCKED, 2)).toBe('1px');
    await expect(flow.text(BLOCKED, 3)).toHaveText('x');
    await expect(flow.text(BESIDE_MERGE, 3)).toHaveText('Объединено');
    expect(await flow.spills(IN_MERGE)).toEqual([]);

    const merged = await flow.pieceOf(IN_MERGE, 1);

    expect(merged.clip).toBe('clip');
    expect(merged.overflows).toBe(true);
  });

  test('keeps the flowing text in place when the browser brings a covered cell into view', async ({
    tableFlow: flow,
  }) => {
    await expectOneText(flow, STOPPED, 1, 4);

    const before = await flow.pieceOf(STOPPED, 2);

    await flow.revealPiece(STOPPED, 2);

    const after = await flow.pieceOf(STOPPED, 2);

    expect(after.piece.x - after.cell.x).toBeCloseTo(before.piece.x - before.cell.x, 0);
    await expectOneText(flow, STOPPED, 1, 4);
  });

  test('keeps the active ring and the cell borders above the flowing text in both themes', async ({
    tableFlow: flow,
    playground,
  }) => {
    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      await flow.cell(BLOCKS, 3).click();
      await expect(flow.cell(BLOCKS, 3)).toBeFocused();

      expect(await flow.ringShare(BLOCKS, 3)).toBe(1);
    }

    await expectOneText(flow, DECORATED, 1, 4);
  });

  test('selects only the cells under the pointer and the keyboard', async ({
    tableFlow: flow,
    isMobile,
  }) => {
    test.skip(isMobile, 'pointer drag and keyboard scenario');
    await flow.dragAcross(flow.cell(STOPPED, 2), flow.cell(END, 4));

    expect(await flow.rangedCount()).toBe(6);

    await flow.cell(BLOCKS, 2).click();
    await flow.extendSelection('right');

    expect(await flow.rangedCount()).toBe(2);
    await expectOneText(flow, BLOCKS, 1, await flow.reachOf(BLOCKS, 1));
  });

  test('shrinks the flow when a value lands in a covered cell and restores it when it is cleared', async ({
    tableFlow: flow,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard scenario');
    await flow.cell(STOPPED, 3).click();
    await flow.typeAndCommit('Z');

    await expect(flow.text(STOPPED, 3)).toHaveText('Z');
    await expectOneText(flow, STOPPED, 1, 2);
    expect(await flow.lineAfter(STOPPED, 2)).toBe('1px');

    await flow.cell(STOPPED, 3).click();
    await flow.clearActiveCell();

    await expectOneText(flow, STOPPED, 1, 4);
  });

  test('keeps showing a text whose own cell left the column window', async ({
    tableFlow: flow,
  }) => {
    await flow.scrollTo(WINDOW_SHIFT);

    await expect(flow.cell(CUT, 1)).toHaveCount(0);

    const pieces = await shownPieces(flow, CUT, 2, 7);

    expect(pieces.length).toBeGreaterThan(0);

    for (const piece of pieces) {
      expect(piece.text).toBe(CUT_TEXT);
      expect(piece.piece.x).toBeCloseTo(pieces[0]?.piece.x ?? 0, 0);
    }
  });

  test('keeps a flow inside its pane under frozen rows and a pinned column', async ({
    tableFlow: flow,
  }) => {
    await flow.frozen.click();
    await flow.pinned.click();
    await flow.scrollTo(PINNED_SHIFT, FROZEN_SHIFT);

    expect(await flow.scrollTop()).toBe(FROZEN_SHIFT);
    expect(await flow.spills(TITLE)).toEqual([]);
    expect(await flow.pieceOf(TITLE, 0)).toMatchObject({ clip: 'clip' });

    const before = await flow.pieceOf(BLOCKS, 3);

    await flow.press(BLOCKS, 3);
    await expect(flow.cell(BLOCKS, 3)).toBeFocused();

    const after = await flow.pieceOf(BLOCKS, 3);
    const beside = await flow.pieceOf(BLOCKS, 2);

    expect(await flow.scrollTop()).toBe(FROZEN_SHIFT);
    expect(after.cell.y).toBeCloseTo(before.cell.y, 0);
    expect(after.cell.y).toBeCloseTo(beside.cell.y, 0);
    expect(after.piece.x).toBeCloseTo(beside.piece.x, 0);

    await flow.press(DECORATED, 0);
    await expect(flow.cell(DECORATED, 0)).toBeFocused();

    expect(await flow.scrollLeft()).toBe(PINNED_SHIFT);
    expect(await flow.scrollTop()).toBe(FROZEN_SHIFT);
  });

  test('mirrors the flow in a right to left layout', async ({ tableFlow: flow, playground }) => {
    await playground.setDirection('rtl');

    await expectOneText(flow, STOPPED, 1, 4);

    const start = await flow.pieceOf(STOPPED, 1);

    expect(start.cell.x + start.cell.width - (start.piece.x + start.piece.width)).toBeCloseTo(
      PAD,
      0,
    );

    await expectOneText(flow, END, 5, 7);
    await expectOneText(flow, CENTRE, 4, 6);
  });

  test('a flowing sheet has no automatically detectable WCAG AA violations', async ({
    tableFlow: flow,
    playground,
  }) => {
    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);

      expect(await playground.wcagViolations(flow.scope)).toEqual([]);
    }
  });
});
