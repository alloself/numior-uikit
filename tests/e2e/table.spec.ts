import { expect, test } from '@playwright/test';
import { boxOf } from './helpers/geometry';
import { PlaygroundPage } from './pages/playground';

const TREE_HEAD_ROWS = 1;

test.describe('table', () => {
  test('windowed table keeps its rows on screen before the scroll event catches up', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'scrollbar scenario');
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { table } = playground;
    await table.root.scrollIntoViewIfNeeded();
    await expect(table.cell(0, 1)).toBeVisible();
    expect(await table.rowsInViewAfterJump(200_000)).toBeGreaterThan(5);
    await expect(table.cell(5000, 1)).toBeVisible();
    expect(await table.rowsInViewAfterJump(0)).toBeGreaterThan(5);
    await expect(table.cell(0, 1)).toBeVisible();
  });

  test('windows ten thousand rows and keeps the pinned columns in place while scrolling', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { table } = playground;
    await table.root.scrollIntoViewIfNeeded();
    await expect(table.grid).toHaveAttribute('aria-rowcount', '10003');
    await expect(table.header(0)).toHaveText('№');
    await expect(table.band('Покупатель')).toHaveAttribute('aria-colspan', '2');
    await expect(table.cell(0, 10)).toContainText('Новый');
    expect(await table.renderedRowCount()).toBeLessThan(60);

    const pinnedBefore = await table.cellBox(0, 0);
    const endBefore = await table.cellBox(0, 10);
    const centreBefore = await table.cellBox(0, 1);
    await table.scrollTo({ left: 400 });
    await expect.poll(async () => (await table.cellBox(0, 1)).x).toBeLessThan(centreBefore.x - 300);
    await expect(table.band('Заказ')).toHaveAttribute('aria-colindex', '6');
    expect((await table.cellBox(0, 0)).x).toBeCloseTo(pinnedBefore.x, 0);
    expect((await table.cellBox(0, 10)).x).toBeCloseTo(endBefore.x, 0);

    expect((await table.cellBox(0, 10)).x + endBefore.width).toBeCloseTo(
      await table.clientRight(),
      0,
    );

    await table.scrollToBottom();
    await expect(table.cell(9999, 0)).toHaveText('10000');
    await expect(table.cell(9999, 0)).toBeInViewport();
    expect(await table.renderedRowCount()).toBeLessThan(60);
  });

  test('resizes a column from its handle and the keyboard and resets it from the menu', async ({
    page,
    isMobile,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { table } = playground;
    await table.root.scrollIntoViewIfNeeded();
    const before = await table.cellBox(0, 0);
    const width = Math.round(before.width);
    await table.dragResizer(0, 60);
    await expect(table.output).toContainText(`"widths":{"id":${width + 60}}`);
    await expect(table.output).toContainText('"sort":[]');
    expect((await table.cellBox(0, 0)).width).toBeCloseTo(before.width + 60, 0);
    expect((await table.cellBox(0, 1)).x).toBeCloseTo(before.x + before.width + 60, 0);

    await table.cell(0, 0).click();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Alt+ArrowRight');
    await expect(table.output).toContainText(`"widths":{"id":${width + 70}}`);
    await page.keyboard.press('Alt+ArrowLeft');
    await expect(table.output).toContainText(`"widths":{"id":${width + 60}}`);
    expect(await table.focusedCell()).toEqual({ row: -1, col: 0 });

    await table.openMenu(0);
    await table.menuItem('Сбросить ширину').click();
    await expect(table.output).toContainText('"widths":{}');
    expect((await table.cellBox(0, 0)).width).toBeCloseTo(before.width, 0);

    if (isMobile) {
      return;
    }
    const band = await boxOf(table.bandCell('Покупатель'));
    await table.dragBandResizer('Покупатель', 40);
    await expect(table.output).toContainText('"widths":{"email":280}');
    expect((await boxOf(table.bandCell('Покупатель'))).width).toBeCloseTo(band.width + 40, 0);
    await playground.page.getByTestId('table-reset-columns').click();
    await expect(table.output).toContainText('"widths":{}');
  });

  test('moves a column by its grip and from the keyboard and resets the order', async ({
    page,
    isMobile,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { table } = playground;
    await table.root.scrollIntoViewIfNeeded();
    await expect(table.header(1)).toHaveText('Клиент');

    if (!isMobile) {
      await table.dragHeader(1, 2);
      await expect(table.header(1)).toHaveText('Почта');
      await expect(table.header(2)).toHaveText('Клиент');
      await expect(table.output).toContainText('"columnOrder":["id","email","customer"');
      await expect(table.output).toContainText('"sort":[]');
      await table.cell(0, 2).click();
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('Alt+Shift+ArrowLeft');
      await expect(table.output).toContainText('"columnOrder":["id","customer","email"');
      expect(await table.focusedCell()).toEqual({ row: -1, col: 1 });
    } else {
      await table.cell(0, 1).click();
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('Alt+Shift+ArrowRight');
      await expect(table.output).toContainText('"columnOrder":["id","email","customer"');
      expect(await table.focusedCell()).toEqual({ row: -1, col: 2 });
    }

    await table.resetColumns.click();
    await expect(table.output).toContainText('"columnOrder":[]');
    await expect(table.header(1)).toHaveText('Клиент');
  });

  test('drags a tree row among its siblings and moves it from the keyboard', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { table } = playground;
    await table.tree.scrollIntoViewIfNeeded();
    await expect(table.treeRow(0)).toContainText('Продажи');
    await expect(table.treeRow(1)).toContainText('Разработка');

    await table.dragTreeRow(1, 0, 'before');
    await expect(table.output).toContainText('"lastReorder":"rnd:1>0:root>root"');
    await expect(table.treeRow(0)).toContainText('Разработка');
    await expect(table.treeRow(1)).toContainText('Продажи');

    await table.treeCell(0, 0).click();
    await page.keyboard.press('Alt+Shift+ArrowDown');
    await expect(table.output).toContainText('"lastReorder":"rnd:0>1:root>root"');
    await expect(table.treeRow(1)).toContainText('Разработка');
    expect(await table.focusedCell(TREE_HEAD_ROWS)).toEqual({ row: 1, col: 0 });

    await table.dragTreeRow(1, 0, 'inside');
    await expect(table.output).toContainText('"lastReorder":"rnd:1>2:root>sales"');
    await expect(table.treeRow(3)).toContainText('Разработка');
    await expect(table.treeRow(3)).toHaveAttribute('aria-level', '2');

    await page.keyboard.press('Alt+Shift+ArrowLeft');
    await expect(table.output).toContainText('"lastReorder":"rnd:2>1:sales>root"');
    await expect(table.treeRow(3)).toContainText('Разработка');
    await expect(table.treeRow(3)).toHaveAttribute('aria-level', '1');
  });

  test('selects cell ranges with the mouse and the keyboard, copies them and opens the cell menu', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'pointer ranges on desktop');
    const playground = new PlaygroundPage(page);
    const { table } = playground;
    await table.stubClipboard();
    await playground.open();
    await table.root.scrollIntoViewIfNeeded();

    await table.cell(4, 1).click();

    await expect(table.cell(4, 1)).not.toHaveCSS(
      'background-color',
      await table.cellBackground(4, 2),
    );

    await table.cell(3, 1).click({ modifiers: ['Shift'] });
    await table.cell(2, 1).click({ modifiers: ['Shift'] });
    await table.cell(4, 1).click({ modifiers: ['Shift'] });
    await table.cell(5, 1).click({ modifiers: ['Shift'] });

    await expect(table.output).toContainText(
      '"ranges":[{"from":{"row":2,"col":1},"to":{"row":5,"col":1}}]',
    );

    await table.cell(3, 1).click({ modifiers: ['Shift'] });
    await expect(table.cell(3, 1)).not.toHaveAttribute('aria-selected');
    await expect(table.cell(4, 1)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Escape');
    await table.dragRange({ row: 1, col: 1 }, { row: 3, col: 2 });

    await expect(table.output).toContainText(
      '"ranges":[{"from":{"row":1,"col":1},"to":{"row":3,"col":2}}]',
    );

    await expect(table.cell(2, 2)).toHaveAttribute('aria-selected', 'true');
    await table.cell(4, 3).click({ modifiers: ['Shift'] });

    await expect(table.output).toContainText(
      '"ranges":[{"from":{"row":1,"col":1},"to":{"row":4,"col":3}}]',
    );

    await expect(table.cell(4, 3)).toBeFocused();
    expect(await table.textSelection()).toBe('');
    await page.keyboard.press('ControlOrMeta+A');

    await expect(table.output).toContainText(
      '"ranges":[{"from":{"row":0,"col":0},"to":{"row":9999,"col":10}}]',
    );

    await expect(table.cell(4, 3)).toHaveCSS('background-color', await table.cellBackground(4, 2));
    await expect(table.cell(4, 3)).toHaveCSS('outline-style', 'none');
    await table.cell(2, 3).click({ modifiers: ['ControlOrMeta'] });
    await expect(table.cell(2, 3)).not.toHaveAttribute('aria-selected');
    await expect(table.cell(2, 2)).toHaveAttribute('aria-selected', 'true');
    await expect(table.cell(2, 3)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(table.output).toContainText('"ranges":[]');
    await table.output.click();
    await table.cell(5, 2).click({ modifiers: ['Shift'] });

    await expect(table.output).toContainText(
      '"ranges":[{"from":{"row":5,"col":2},"to":{"row":5,"col":2}}]',
    );

    await expect(table.cell(5, 2)).toBeFocused();
    expect(await table.textSelection()).toBe('');
    await table.header(2).focus();
    await page.keyboard.press('ControlOrMeta+A');

    await expect(table.output).toContainText(
      '"ranges":[{"from":{"row":0,"col":0},"to":{"row":9999,"col":10}}]',
    );

    await page.keyboard.press('Escape');

    await table.dragRange({ row: 1, col: 1 }, { row: 2, col: 2 });
    await page.keyboard.press('ControlOrMeta+C');

    const block = await table.cellTexts([
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
    ]);

    await expect
      .poll(() => table.copiedTexts())
      .toEqual([`${block[0]}\t${block[1]}\n${block[2]}\t${block[3]}`]);

    await table.dragRange({ row: 4, col: 2 }, { row: 1, col: 2 }, 'ControlOrMeta');

    await expect(table.output).toContainText(
      '"ranges":[{"from":{"row":1,"col":1},"to":{"row":2,"col":1}},{"from":{"row":4,"col":2},"to":{"row":1,"col":2}}]',
    );

    await page.keyboard.press('Escape');

    await table.cell(2, 1).click({ button: 'right' });
    await expect(table.cellMenu).toBeVisible();
    await expect(table.cellMenuItem('Копировать с заголовками')).toBeVisible();
    await table.cellMenuItem('Открыть заказ 3').click();
    await expect(table.output).toContainText('"lastOpened":3');
    await expect(table.cellMenu).toBeHidden();
    await expect(table.cell(2, 1)).toBeFocused();
    await page.keyboard.press('Shift+F10');
    await expect(table.cellMenuItem('Вырезать')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(table.cellMenu).toBeHidden();
    await expect(table.cell(2, 1)).toBeFocused();
  });

  test('clears cells with Delete, cuts them and brings them back with undo and redo', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard edits on desktop');
    const playground = new PlaygroundPage(page);
    const { table } = playground;
    await table.stubClipboard();
    await playground.open();
    await table.root.scrollIntoViewIfNeeded();

    const block = [
      { row: 1, col: 3 },
      { row: 1, col: 4 },
      { row: 2, col: 3 },
      { row: 2, col: 4 },
    ];

    const before = await table.cellTexts(block);

    await table.dragRange({ row: 1, col: 3 }, { row: 2, col: 4 });
    await page.keyboard.press('Delete');
    await expect(table.output).toContainText('"lastEdit":"clear:4"');
    expect(await table.cellTexts(block)).toEqual(['', '', '', '']);
    await page.keyboard.press('ControlOrMeta+Z');
    await expect(table.output).toContainText('"lastEdit":"undo:4"');
    expect(await table.cellTexts(block)).toEqual(before);
    await page.keyboard.press('ControlOrMeta+Shift+Z');
    await expect(table.output).toContainText('"lastEdit":"redo:4"');
    expect(await table.cellTexts(block)).toEqual(['', '', '', '']);
    await table.cell(3, 3).click();

    const cut = await table.cellTexts([{ row: 3, col: 3 }]);

    await page.keyboard.press('ControlOrMeta+X');
    await expect.poll(() => table.copiedTexts()).toEqual(cut);
    await expect(table.output).toContainText('"lastEdit":"cut:1"');
    await table.cell(3, 0).click({ button: 'right' });
    await expect(table.cellMenuItem('Очистить')).toBeDisabled();
    await page.keyboard.press('Escape');
  });

  test('pastes a block copied elsewhere into the cells and undoes it', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard paste on desktop');
    const playground = new PlaygroundPage(page);
    const { table } = playground;
    await playground.open();
    await table.root.scrollIntoViewIfNeeded();

    const block = [
      { row: 1, col: 3 },
      { row: 1, col: 4 },
      { row: 2, col: 3 },
      { row: 2, col: 4 },
    ];

    const before = await table.cellTexts(block);

    await table.putInClipboard('Самара\tЛатвия\r\nТула\tЛитва');
    await table.cell(1, 3).click();
    await page.keyboard.press('ControlOrMeta+V');
    await expect(table.output).toContainText('"lastEdit":"paste:4"');
    await expect.poll(() => table.cellTexts(block)).toEqual(['Самара', 'Латвия', 'Тула', 'Литва']);

    await expect(table.output).toContainText(
      '"ranges":[{"from":{"row":1,"col":3},"to":{"row":2,"col":4}}]',
    );

    await page.keyboard.press('ControlOrMeta+Z');
    await expect.poll(() => table.cellTexts(block)).toEqual(before);
  });

  test('edits cells in place, checks the column rules and undoes an edit', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard editing on desktop');
    const playground = new PlaygroundPage(page);
    const { table } = playground;
    await playground.open();
    await table.root.scrollIntoViewIfNeeded();

    await table.cell(1, 3).click();
    await page.keyboard.press('Enter');
    await expect(table.editorField()).toBeFocused();
    await table.editorField().fill('Самара');
    await page.keyboard.press('Enter');
    await expect(table.output).toContainText('"lastEdit":"edit:1"');
    await expect(table.cell(1, 3)).toHaveText('Самара');
    expect(await table.focusedCell()).toEqual({ row: 2, col: 3 });
    await page.keyboard.type('Tula');
    await expect(table.editorField()).toHaveValue('Tula');
    await page.keyboard.press('Tab');
    await expect(table.cell(2, 3)).toHaveText('Tula');
    expect(await table.focusedCell()).toEqual({ row: 2, col: 4 });
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('F2');
    await table.editorField().fill('-5');
    await page.keyboard.press('Enter');
    await expect(table.editorError()).toHaveText('Введите число не меньше 0');
    await expect(table.editorField()).toHaveAttribute('aria-invalid', 'true');
    await table.editorField().fill('250');
    await page.keyboard.press('Enter');
    await expect(table.editorError()).toHaveCount(0);
    await expect(table.cell(2, 5)).toHaveText('250');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('F2');
    await table.editorField().fill('15.03.2026');
    await page.keyboard.press('Enter');
    await expect(table.cell(3, 6)).toHaveText('15 мар. 2026 г.');
    await page.keyboard.press('ArrowRight');

    const [vip = ''] = await table.cellTexts([{ row: 4, col: 7 }]);

    await page.keyboard.press('Enter');
    await expect(table.cell(4, 7)).not.toHaveText(vip);
    await page.keyboard.press('ControlOrMeta+Z');
    await expect(table.cell(4, 7)).toHaveText(vip);
    await table.cell(6, 1).dblclick();
    await table.editorField().fill('');
    await page.keyboard.press('Escape');
    await expect(table.editorField()).toHaveCount(0);
    expect(await table.focusedCell()).toEqual({ row: 6, col: 1 });
  });

  test('edits cells in list editors from a typed helper and the control registry', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard editing on desktop');
    const playground = new PlaygroundPage(page);
    const { table } = playground;
    await playground.open();
    await table.root.scrollIntoViewIfNeeded();

    await table.cell(1, 4).click();
    await page.keyboard.press('Enter');
    await expect(table.editorOption('Грузия')).toBeVisible();
    await table.editorOption('Грузия').click();
    await expect(table.editor()).toHaveCount(0);
    await expect(table.cell(1, 4)).toHaveText('Грузия');
    await expect(table.output).toContainText('"lastEdit":"edit:1"');
    expect(await table.focusedCell()).toEqual({ row: 1, col: 4 });
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('F2');
    await expect(table.editorOption('Россия')).toBeVisible();
    await page.keyboard.press('Home');
    await page.keyboard.press('Enter');
    await expect(table.cell(2, 4)).toHaveText('Россия');
    expect(await table.focusedCell()).toEqual({ row: 2, col: 4 });
    await page.keyboard.press('ArrowDown');

    for (const step of ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight']) {
      await page.keyboard.press(step);
    }
    await page.keyboard.press('F2');
    await table.editorOption('Нина Белова').click();
    await expect(table.cell(3, 8)).toHaveText('Нина Белова');
    await page.keyboard.press('ControlOrMeta+Z');
    await expect(table.cell(3, 8)).not.toHaveText('Нина Белова');
  });

  test('opens a cell editor with a double tap on a phone and commits it on a tap elsewhere', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'double tap on touch screens');
    const playground = new PlaygroundPage(page);
    const { table } = playground;
    await playground.open();
    await table.root.scrollIntoViewIfNeeded();

    await table.tapCell(1, 1, 2);
    await expect(table.editorField()).toBeFocused();
    await table.editorField().fill('Иван Петров');
    await table.tapCell(4, 1);
    await expect(table.editorField()).toHaveCount(0);
    await expect(table.cell(1, 1)).toHaveText('Иван Петров');
    await expect(table.output).toContainText('"lastEdit":"edit:1"');
  });

  test('exports the filtered rows as CSV with the shown texts', async ({ page, isMobile }) => {
    test.skip(isMobile, 'downloads on desktop');
    const playground = new PlaygroundPage(page);
    const { table } = playground;
    await playground.open();
    await table.root.scrollIntoViewIfNeeded();
    await table.quick.fill('Казань');
    await expect(table.output).toContainText('"quick":"Казань"');

    const lines = (await table.exportCsv()).split('\r\n');

    expect(lines[0]).toBe(
      '\uFEFF№;Клиент;Почта;Город;Страна;Сумма;Создан;VIP;Менеджер;Комментарий;Статус',
    );

    expect(lines.length).toBeGreaterThan(100);
    expect(lines.slice(1).every((line) => line.includes('Казань'))).toBe(true);
  });

  test('opens the cell menu with a long press on a phone and copies the cell', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'long press on touch screens');
    const playground = new PlaygroundPage(page);
    const { table } = playground;
    await table.stubClipboard();
    await playground.open();
    await table.root.scrollIntoViewIfNeeded();

    await table.longPress(1, 1);
    await table.cellMenuItem('Копировать').click();

    await expect
      .poll(() => table.copiedTexts())
      .toEqual(await table.cellTexts([{ row: 1, col: 1 }]));
  });

  test('walks the cells with the keyboard and keeps the active one in view', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard walk on desktop');
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { table } = playground;
    await table.root.scrollIntoViewIfNeeded();
    await table.cell(0, 1).click();
    expect(await table.focusedCell()).toEqual({ row: 0, col: 1 });

    for (let step = 0; step < 3; step += 1) {
      await page.keyboard.press('ArrowDown');
    }
    expect(await table.focusedCell()).toEqual({ row: 3, col: 1 });
    await page.keyboard.press('End');
    expect(await table.focusedCell()).toEqual({ row: 3, col: 10 });
    await page.keyboard.press('Control+End');
    expect(await table.focusedCell()).toEqual({ row: 10_000, col: 10 });
    await page.keyboard.press('ArrowUp');
    expect(await table.focusedCell()).toEqual({ row: 9999, col: 10 });

    const last = await table.cellBox(9999, 10);
    const footer = await table.cellBox(10_000, 10);
    expect(last.y).toBeGreaterThanOrEqual((await table.headerBottom()) - 1);
    expect(last.y + last.height).toBeLessThanOrEqual(footer.y + 1);
    await page.keyboard.press('Control+Home');
    expect(await table.focusedCell()).toEqual({ row: 0, col: 0 });
    expect(await table.scrollTop()).toBe(0);
    await page.keyboard.press('ArrowUp');
    expect(await table.focusedCell()).toEqual({ row: -1, col: 0 });

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');

    for (let step = 0; step < 8; step += 1) {
      await page.keyboard.press('ArrowRight');
    }
    expect(await table.focusedCell()).toEqual({ row: 0, col: 9 });
    const revealed = await table.cellBox(0, 9);
    expect(revealed.x + revealed.width).toBeLessThanOrEqual((await table.cellBox(0, 10)).x + 1);
  });

  test('sorts from the header by click, Shift+click and the keyboard', async ({
    page,
    isMobile,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { table } = playground;
    await table.root.scrollIntoViewIfNeeded();
    await table.sortBy(0);
    await expect(table.header(0)).toHaveAttribute('aria-sort', 'ascending');
    await expect(table.cell(0, 0)).toHaveText('1');
    await table.sortBy(0);
    await expect(table.header(0)).toHaveAttribute('aria-sort', 'descending');
    await expect(table.cell(0, 0)).toHaveText('10000');
    const descending = await table.numbersIn(0, 8);
    expect(descending).toEqual(descending.toSorted((a, b) => b - a));
    await table.sortBy(1, ['Shift']);
    await expect(table.sortOrder(1)).toHaveText('2');
    await expect(table.sortOrder(0)).toHaveText('1');
    await expect(table.header(1)).not.toHaveAttribute('aria-sort');

    if (isMobile) {
      return;
    }
    await table.cell(0, 2).click();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    await expect(table.header(2)).toHaveAttribute('aria-sort', 'ascending');
    await expect(table.header(0)).not.toHaveAttribute('aria-sort');
    await expect(table.sortOrder(1)).toHaveCount(0);
    expect(await table.focusedCell()).toEqual({ row: -1, col: 2 });
  });

  test('mirrors the pinned panes and the arrow keys in RTL', async ({ page, isMobile }) => {
    test.skip(isMobile, 'direction switch on desktop');
    const playground = new PlaygroundPage(page);
    await playground.open();
    await playground.setDirection('rtl');
    const { table } = playground;
    await table.root.scrollIntoViewIfNeeded();
    const start = await table.cellBox(0, 0);
    const end = await table.cellBox(0, 10);
    expect(start.x + start.width).toBeCloseTo(await table.clientRight(), 0);
    expect(end.x).toBeCloseTo(await table.clientLeft(), 0);
    await table.cell(0, 1).click();
    await page.keyboard.press('ArrowLeft');
    expect(await table.focusedCell()).toEqual({ row: 0, col: 2 });
    await table.openFilter(3);
    await expect(table.filter).toBeVisible();
    const header = await boxOf(table.header(3));
    const popover = await boxOf(table.filter);
    expect(popover.x + popover.width).toBeCloseTo(header.x + header.width, 0);
    expect(popover.y).toBeGreaterThan(header.y + header.height);
    await page.keyboard.press('Escape');
    await table.openMenu(3);
    await expect(table.menu).toBeVisible();
    const menu = await boxOf(table.menu);
    expect(Math.abs(menu.x + menu.width - header.x - header.width)).toBeLessThanOrEqual(1);
    await page.keyboard.press('Escape');
    await expect(table.menu).toBeHidden();
    await playground.setDirection('ltr');
  });

  test('shows the empty state and brings the rows back', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { table } = playground;
    await table.root.scrollIntoViewIfNeeded();
    await table.emptyToggle.click();
    await expect(table.empty).toContainText('Нет строк для показа');
    await expect(table.grid).toHaveAttribute('aria-rowcount', '3');
    await table.emptyToggle.click();
    await expect(table.empty).toHaveCount(0);
    await expect(table.cell(0, 0)).toHaveText('1');
  });

  test('filters a column by chosen values from the header popover and resets it', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { table } = playground;
    await table.root.scrollIntoViewIfNeeded();
    await table.openFilter(10);
    await expect(table.filter).toBeVisible();
    await expect(table.filter).toHaveAccessibleName('Фильтр: Статус');
    await expect(table.filterButton(10)).toHaveAttribute('aria-expanded', 'true');
    await expect(table.filterValue('Возврат')).toBeVisible();
    await table.filterValue('Оплачен').check();
    await table.applyFilter();

    await expect(table.filter).toBeHidden();
    await expect(table.grid).toHaveAttribute('aria-rowcount', '2503');
    await expect(table.filterButton(10)).toHaveClass(/nui-table__filter--active/);
    expect(await table.textsIn(10, 5)).toEqual(Array.from({ length: 5 }, () => 'Оплачен'));

    await expect(table.output).toHaveText(
      JSON.stringify({
        sort: [],
        filters: [{ kind: 'set', key: 'status', values: ['Оплачен'] }],
        quick: '',
        groupBy: [],
        pins: {},
        hidden: [],
        widths: {},
        columnOrder: [],
        selected: [],
        lastClick: null,
        lastReorder: null,
        ranges: [],
        lastOpened: null,
        lastEdit: null,
        page: 1,
        pageSize: 25,
      }),
    );

    await table.openFilter(10);
    await expect(table.filterValue('Оплачен')).toBeChecked();
    await table.resetFilter();
    await expect(table.grid).toHaveAttribute('aria-rowcount', '10003');
    await expect(table.filterButton(10)).toHaveCount(0);
  });

  test('narrows the rows with the quick filter and a number range and clears both', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'range typing on desktop');
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { table } = playground;
    await table.root.scrollIntoViewIfNeeded();
    await table.quick.fill('Казань');
    await expect(table.grid).toHaveAttribute('aria-rowcount', '1431');
    await table.openFilter(5);
    await table.filterField('От').fill('1000');
    await table.filterField('До').fill('20000');
    await table.applyFilter();

    await expect
      .poll(async () => Number(await table.grid.getAttribute('aria-rowcount')))
      .toBeLessThan(1431);

    const amounts = await table.numbersIn(5, 5);
    expect(amounts.every((amount) => amount >= 1000 && amount <= 20_000)).toBe(true);
    expect(await table.textsIn(3, 5)).toEqual(Array.from({ length: 5 }, () => 'Казань'));

    await expect(table.output).toHaveText(
      JSON.stringify({
        sort: [],
        filters: [{ kind: 'number', key: 'amount', min: 1000, max: 20_000 }],
        quick: 'Казань',
        groupBy: [],
        pins: {},
        hidden: [],
        widths: {},
        columnOrder: [],
        selected: [],
        lastClick: null,
        lastReorder: null,
        ranges: [],
        lastOpened: null,
        lastEdit: null,
        page: 1,
        pageSize: 25,
      }),
    );

    await table.clearFilters.click();
    await expect(table.grid).toHaveAttribute('aria-rowcount', '10003');
    await expect(table.quick).toHaveValue('');
  });

  test('opens the column menu and a filter from the header with the keyboard', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard entry on desktop');
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { table } = playground;
    await table.root.scrollIntoViewIfNeeded();
    await table.cell(0, 1).click();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Alt+ArrowDown');
    await expect(table.menu).toBeVisible();
    await expect(table.menu).toHaveAccessibleName('Меню колонки «Клиент»');
    await expect(table.menuItem('Сортировать по возрастанию')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(table.menu).toBeHidden();
    expect(await table.focusedCell()).toEqual({ row: -1, col: 1 });

    await page.keyboard.press('Alt+ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(table.menuItem('Фильтр…')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(table.menu).toBeHidden();
    await expect(table.filter).toBeVisible();
    await expect(table.filter).toHaveAccessibleName('Фильтр: Клиент');
    await expect(table.filter.locator(':focus')).toHaveCount(1);
    await table.filterField('Значение').fill('Анна');
    await page.keyboard.press('Enter');
    await expect(table.grid).toHaveAttribute('aria-rowcount', '1253');
    await expect(table.filter).toBeHidden();
    expect(await table.focusedCell()).toEqual({ row: -1, col: 1 });
    await expect(table.root.getByRole('status')).toHaveText('Показано 1 250 строк');

    await table.openFilter(3);
    await expect(table.filter).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(table.filter).toBeHidden();
    await expect.poll(() => table.focusedCell()).toEqual({ row: -1, col: 3 });
    await page.keyboard.press('ArrowLeft');
    expect(await table.focusedCell()).toEqual({ row: -1, col: 2 });
  });

  test('pins, hides and brings back columns from the header menu', async ({ page, isMobile }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { table } = playground;
    await table.root.scrollIntoViewIfNeeded();
    await table.openMenu(3);

    await expect(table.menu).toBeVisible();
    await expect(table.menuButton(3)).toHaveAttribute('aria-expanded', 'true');
    await table.menuItem('В начале').click();

    await expect(table.menu).toBeHidden();
    await expect(table.header(1)).toContainText('Город');
    await expect(table.header(2)).toContainText('Клиент');
    await expect(table.output).toContainText('"pins":{"city":"start"}');
    await expect(table.root.getByRole('status')).toHaveText('Колонка «Город» закреплена в начале');
    expect(await table.headerPane(1)).toBe(isMobile ? 'centre' : 'start');

    if (!isMobile) {
      const pinned = await table.cellBox(0, 1);
      await table.scrollTo({ left: 400 });
      await expect.poll(async () => (await table.cellBox(0, 1)).x).toBeCloseTo(pinned.x, 0);
      await table.scrollTo({ left: 0 });
    }

    await table.openMenu(3);
    await table.menuItem('Скрыть колонку').click();
    await expect(table.output).toContainText('"hidden":["email"]');
    await expect(table.header(3)).toContainText('Страна');
    await table.openMenu(2);
    await table.menuItem('Колонки').click();
    await expect(table.menuItem('Почта')).toHaveAttribute('aria-checked', 'false');
    await expect(table.menuItem('№')).toHaveAttribute('aria-disabled', 'true');
    await table.menuItem('Почта').click();

    await expect(table.header(3)).toContainText('Почта');
    await expect(table.menuItem('Почта')).toHaveAttribute('aria-checked', 'true');
    await table.resetColumns.click();
    await expect(table.menu).toBeHidden();
    await expect(table.output).toContainText('"pins":{},"hidden":[]');
    await expect(table.header(1)).toContainText('Клиент');
  });

  test('groups rows from the toolbar, expands a group and keeps totals in the footer', async ({
    page,
    isMobile,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { table } = playground;
    await table.root.scrollIntoViewIfNeeded();
    await expect(table.footerCell(0)).toContainText('Итого');
    await expect(table.footerCell(0)).toContainText(/10\D000 строк/);
    await table.scrollTo({ left: 600 });
    await expect(table.footerCell(5)).not.toHaveText('');
    const total = await table.footerCell(5).innerText();
    await table.groupBy('По статусу');

    await expect(table.grid).toHaveAttribute('role', 'treegrid');
    await expect(table.grid).toHaveAttribute('aria-rowcount', '7');
    await expect(table.groupLabel(0)).toHaveText(/^Возврат/);
    await expect(table.row(0)).toHaveAttribute('aria-expanded', 'false');
    await expect(table.footerCell(5)).toHaveText(total);
    await table.groupLabel(0).click();

    await expect(table.row(0)).toHaveAttribute('aria-expanded', 'true');
    await expect(table.row(1)).toHaveAttribute('aria-level', '2');
    await expect(table.cell(1, 10)).toHaveText('Возврат');
    await expect(table.output).toContainText('"groupBy":["status"]');

    if (isMobile) {
      return;
    }
    await table.cell(0, 0).click();
    await page.keyboard.press('Enter');
    await expect(table.row(0)).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Control+End');
    expect(await table.focusedCell()).toEqual({ row: 4, col: 10 });
    await expect(table.footerCell(10)).toBeFocused();
  });

  test('expands tree rows and loads a lazy branch when it opens', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { table } = playground;
    await table.tree.scrollIntoViewIfNeeded();
    const viewport = table.tree.locator('.nui-table__grid');
    await expect(table.tree).toHaveClass(/nui-table--auto/);
    await expect(viewport).toHaveAttribute('role', 'treegrid');
    await expect(viewport).toHaveAttribute('aria-rowcount', '4');
    expect((await boxOf(table.treeRow(0))).height).toBeGreaterThan(48);
    await table.toggleTreeRow(0);

    await expect(table.treeRow(0)).toHaveAttribute('aria-expanded', 'true');
    await expect(table.treeRow(1)).toHaveAttribute('aria-level', '2');
    await expect(table.treeRow(1)).toContainText('Россия');
    await expect(table.treeRow(4)).toContainText('Операции');
    await table.toggleTreeRow(4);

    await expect(table.treeRow(4)).toHaveAttribute('aria-busy', 'true');
    await expect(table.treeRow(5)).toContainText('Поддержка');
    await expect(table.treeRow(4)).not.toHaveAttribute('aria-busy');
    await expect(viewport).toHaveAttribute('aria-rowcount', '8');
  });

  test('pins rows under the header outside sorting and scrolling', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { table } = playground;
    await table.root.scrollIntoViewIfNeeded();
    await table.pinnedToggle.click();

    await expect(table.grid).toHaveAttribute('aria-rowcount', '10005');
    await expect(table.row(0)).toHaveClass(/nui-table__row--pinned/);
    await expect(table.row(2)).not.toHaveClass(/nui-table__row--pinned/);
    await expect(table.cell(0, 0)).toHaveText('1');
    await expect(table.cell(1, 0)).toHaveText('2');
    await expect(table.cell(2, 0)).toHaveText('1');
    await table.sortBy(0);
    await table.sortBy(0);

    await expect(table.cell(2, 0)).toHaveText('10000');
    await expect(table.cell(0, 0)).toHaveText('1');
    const pinnedBox = await table.cellBox(0, 0);
    await table.scrollTo({ top: 800 });
    await expect(table.row(2)).toHaveCount(0);
    await expect(table.cell(22, 0)).toHaveText('9980');
    expect((await table.cellBox(0, 0)).y).toBeCloseTo(pinnedBox.y, 0);
    await table.sortBy(0);
    await table.pinnedToggle.click();
    await expect(table.grid).toHaveAttribute('aria-rowcount', '10003');
  });

  test('pages the rows from the footer and keeps filters and the page size in step', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { table } = playground;
    await table.root.scrollIntoViewIfNeeded();
    await expect(table.pagination).toBeHidden();
    await table.pagesToggle.click();

    await expect(table.pagination).toBeVisible();
    await expect(table.grid).toHaveAttribute('aria-rowcount', '28');
    await expect(table.cell(0, 0)).toHaveText('1');
    await table.nextPageButton.click();

    await expect(table.cell(0, 0)).toHaveText('26');
    await expect(table.output).toContainText('"page":2');
    await table.quick.fill('client10000');

    await expect(table.grid).toHaveAttribute('aria-rowcount', '4');
    await expect(table.output).toContainText('"page":1');
    await table.clearFilters.click();
    await expect(table.grid).toHaveAttribute('aria-rowcount', '28');
    await table.pageSizeTrigger.click();
    await page.locator('.nui-select__listbox').getByRole('option', { name: '50' }).click();

    await expect(table.grid).toHaveAttribute('aria-rowcount', '53');
    await expect(table.output).toContainText('"pageSize":50');
    await table.pagesToggle.click();
    await expect(table.pagination).toBeHidden();
    await expect(table.grid).toHaveAttribute('aria-rowcount', '10003');
  });

  test('selects tree rows with checkboxes, Space and the header, reports clicks and shows skeletons', async ({
    page,
    isMobile,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { table } = playground;
    await table.tree.scrollIntoViewIfNeeded();
    const viewport = table.tree.locator('.nui-table__grid');
    await expect(viewport).toHaveAttribute('aria-multiselectable', 'true');
    await expect(table.treeCaption).toHaveText('Структура компании');
    await expect(viewport).toHaveAccessibleName('Структура компании');
    await expect(table.treeRow(1)).toHaveClass(/nui-table__row--odd/);
    await table.treeCheckbox(0).check();

    await expect(table.treeRow(0)).toHaveAttribute('aria-selected', 'true');
    await expect(table.treeRow(1)).toHaveAttribute('aria-selected', 'false');
    await expect(table.output).toContainText('"selected":["sales"]');
    await expect(table.treeSelectAll).toHaveJSProperty('indeterminate', true);
    await table.treeSelectAll.click();

    await expect(table.output).toContainText('"selected":["sales","rnd","ops"]');
    await expect(table.treeSelectAll).toBeChecked();
    await table.toggleTreeRow(0);
    await expect(table.treeRow(1)).toContainText('Россия');
    await expect(table.treeSelectAll).toHaveJSProperty('indeterminate', true);
    await table.treeCell(1, 2).click();
    await expect(table.output).toContainText('"lastClick":"sales-ru"');
    await expect(table.output).toContainText('"selected":["sales","rnd","ops"]');

    if (!isMobile) {
      await page.keyboard.press(' ');
      await expect(table.output).toContainText('"selected":["sales","rnd","ops","sales-ru"]');
      await expect(table.treeRow(1)).toHaveAttribute('aria-selected', 'true');
    }
    await table.loadingToggle.click();

    await expect(viewport).toHaveAttribute('aria-busy', 'true');
    await expect(table.treeSkeletons).toHaveCount(5);
    await expect(table.treeSelectAll).toBeDisabled();
    await table.loadingToggle.click();
    await expect(table.treeSkeletons).toHaveCount(0);
    await expect(table.treeRow(0)).toHaveAttribute('aria-selected', 'true');
  });

  test('data table has no automatically detectable WCAG AA violations', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await playground.table.root.scrollIntoViewIfNeeded();

    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      expect(await playground.wcagViolations()).toEqual([]);
    }
  });

  test('column menu has no automatically detectable WCAG AA violations', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await playground.table.root.scrollIntoViewIfNeeded();

    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      await playground.table.openMenu(10);
      await playground.table.menuItem('Колонки').click();
      await expect(playground.table.menuItem('Почта')).toBeVisible();
      expect(await playground.wcagViolations()).toEqual([]);
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
      await expect(playground.table.menu).toBeHidden();
    }
  });

  test('cell menu has no automatically detectable WCAG AA violations', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'the cell menu opens by the pointer on desktop');
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { table } = playground;
    await table.root.scrollIntoViewIfNeeded();
    await table.dragRange({ row: 1, col: 1 }, { row: 2, col: 2 });
    await table.cell(1, 1).click({ button: 'right' });
    await expect(table.cellMenu).toBeVisible();
    expect(await playground.wcagViolations()).toEqual([]);
  });

  test('filter popover has no automatically detectable WCAG AA violations', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await playground.table.root.scrollIntoViewIfNeeded();
    await playground.table.openFilter(10);
    await expect(playground.table.filterValue('Оплачен')).toBeVisible();

    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      expect(await playground.wcagViolations()).toEqual([]);
    }
  });
});
