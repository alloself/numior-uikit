import { expect, test } from './fixtures';
import { boxOf } from './helpers/geometry';
import { ordersXlsx, rightToLeftXlsx } from './helpers/xlsx';
import type { Theme } from './pages/playground';

const NOT_A_BOOK = {
  name: 'notes.xlsx',
  mimeType: 'text/plain',
  buffer: Buffer.from('plain text'),
};

const THEMES = ['light', 'dark'] satisfies readonly Theme[];

const BOOK = 'section[aria-labelledby="book-title"]';

const ASSIST_LISTS = '.nui-spreadsheet .nui-list--variant-floating';

const near = (actual: number, expected: number): boolean => Math.abs(actual - expected) < 1.5;

test.describe('book on a right-to-left page', () => {
  test('mirrors the file bar and the sheet tabs', async ({ playground, book }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await playground.setDirection('rtl');
    await book.sheet.scrollIntoViewIfNeeded();

    const name = await boxOf(book.fileName);
    const open = await boxOf(book.fileBar.getByRole('button', { name: 'Открыть' }));
    const save = await boxOf(book.fileBar.getByRole('button', { name: 'Сохранить' }));
    const first = await boxOf(book.sheetTab('Бюджет'));
    const second = await boxOf(book.sheetTab('Заметки'));

    expect(name.x).toBeGreaterThan(open.x);
    expect(open.x).toBeGreaterThan(save.x);
    expect(first.x).toBeGreaterThan(second.x);
  });

  test('opens the cell menu and the rules inside the screen', async ({ playground, book }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await playground.setDirection('rtl');
    await book.sheet.scrollIntoViewIfNeeded();
    await book.openCellMenu('4', 1);

    await expect(book.cellMenuList).toBeVisible();
    expect(await book.insideScreen(book.cellMenuList)).toBe(true);

    await book.page.keyboard.press('Escape');
    await book.openRules('4', 1);

    await expect(book.rules).toBeVisible();
    expect(await book.insideScreen(book.rules)).toBe(true);
  });

  test('has no automatically detectable WCAG AA violations', async ({ playground }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await playground.setDirection('rtl');

    expect(await playground.wcagViolations(BOOK)).toEqual([]);
  });
});

test.describe('book with a right-to-left sheet', () => {
  test('runs the columns from the right and the arrows follow them', async ({
    playground,
    book,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.openFile(await rightToLeftXlsx());

    await expect(book.cell('1', 0)).toHaveText('Month');

    const first = await boxOf(book.cell('2', 0));
    const second = await boxOf(book.cell('2', 1));

    expect(first.x).toBeGreaterThan(second.x);

    await book.cell('2', 0).click();
    await page.keyboard.press('ArrowLeft');

    await expect(book.nameBox).toHaveValue('B2');

    await page.keyboard.press('ArrowRight');

    await expect(book.nameBox).toHaveValue('A2');

    await book.enter('2', 1, '99');

    await expect(book.cell('2', 1)).toHaveText('99');
  });

  test('keeps an inserted chart on its cells and drags it with the pointer', async ({
    playground,
    book,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.openFile(await rightToLeftXlsx());

    await expect(book.cell('1', 0)).toHaveText('Month');

    await book.insertChart('2', 1, 'График');

    await expect(book.charts).toHaveCount(1);
    await expect(book.selectionFrame).toBeVisible();

    const placed = await boxOf(book.charts);

    await book.scrollBody(40);

    await expect.poll(async () => near((await boxOf(book.charts)).y, placed.y - 40)).toBe(true);

    await book.scrollBody(0);

    await expect.poll(async () => near((await boxOf(book.charts)).y, placed.y)).toBe(true);

    await book.dragBy(book.charts, -24, 16);

    const moved = await boxOf(book.charts);

    expect(near(moved.x, placed.x - 24)).toBe(true);
    expect(near(moved.y, placed.y + 16)).toBe(true);

    await page.keyboard.press('Control+z');

    await expect.poll(async () => near((await boxOf(book.charts)).x, placed.x)).toBe(true);
  });
});

test.describe('book accessibility', () => {
  for (const theme of THEMES) {
    test(`passes axe with a refused file and the discard dialog in the ${theme} theme`, async ({
      playground,
      book,
    }) => {
      await playground.emulate({ reducedMotion: 'reduce' });
      await playground.open();
      await playground.setTheme(theme);
      await book.sheet.scrollIntoViewIfNeeded();
      await book.openFile(NOT_A_BOOK);

      await expect(book.fileFailure).toBeVisible();
      expect(await playground.wcagViolations(BOOK)).toEqual([]);

      await book.enter('1', 0, 'Правка');
      await book.openFile(await ordersXlsx());

      await expect(book.fileDialog).toBeVisible();
      expect(await playground.wcagViolations(BOOK)).toEqual([]);
    });

    test(`passes axe with the chart settings open in the ${theme} theme`, async ({
      playground,
      book,
    }) => {
      await playground.emulate({ reducedMotion: 'reduce' });
      await playground.open();
      await playground.setTheme(theme);
      await book.sheet.scrollIntoViewIfNeeded();
      await book.openChartSettings();

      await expect(book.chartSettings).toBeVisible();
      expect(await playground.wcagViolations(BOOK)).toEqual([]);
    });

    test(`passes axe with the cell menu and the formula hints in the ${theme} theme`, async ({
      playground,
      book,
      page,
    }) => {
      await playground.emulate({ reducedMotion: 'reduce' });
      await playground.open();
      await playground.setTheme(theme);
      await book.sheet.scrollIntoViewIfNeeded();
      await book.openCellMenu('9', 1);

      await expect(book.cellMenuList).toBeVisible();
      expect(await playground.wcagViolations(BOOK)).toEqual([]);

      await page.keyboard.press('Escape');
      await book.cell('9', 1).click();
      await page.keyboard.type('=СУ');

      await expect(book.functions).toBeVisible();
      expect(await playground.wcagViolations(ASSIST_LISTS)).toEqual([]);

      await page.keyboard.press('Tab');

      await expect(book.hint).toBeVisible();
      expect(await playground.wcagViolations(ASSIST_LISTS)).toEqual([]);
    });
  }
});

test.describe('book on a touch screen', () => {
  test('opens the cell menu with a long press', async ({ playground, book, isMobile }) => {
    test.skip(!isMobile, 'long press on touch screens');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.longPress('3', 1);

    await expect(book.cellMenuList).toBeVisible();
    expect(await book.insideScreen(book.cellMenuList)).toBe(true);
  });

  test('edits a cell after a double tap and commits on a tap elsewhere', async ({
    playground,
    book,
    isMobile,
  }) => {
    test.skip(!isMobile, 'double tap on touch screens');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.tapCell('3', 1, 2);

    await expect(book.editor).toBeFocused();

    await book.editor.fill('77');
    await book.tapCell('6', 1);

    await expect(book.editor).toHaveCount(0);
    await expect(book.cell('3', 1)).toHaveText('77');
  });

  test('gives the grips of a selected drawing a finger-sized target', async ({
    playground,
    book,
    isMobile,
  }) => {
    test.skip(!isMobile, 'targets on touch screens');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.chooseSheet('Заметки');
    await book.pictures.first().tap();

    await expect(book.selectionFrame).toBeVisible();
    expect(await book.smallestHandleTarget()).toBeGreaterThanOrEqual(24);
  });
});
