import { readFileSync } from 'node:fs';
import { expect, test } from './fixtures';
import { PlaygroundPage } from './pages/playground';
import { boxOf } from './helpers/geometry';

const office = (path: string): string =>
  readFileSync(new URL(`fixtures/paste/${path}`, import.meta.url), 'utf8');

const openEditor = async (playground: PlaygroundPage): Promise<void> => {
  await playground.emulate({ reducedMotion: 'reduce' });
  await playground.open();
  await playground.editor.root.scrollIntoViewIfNeeded();
};

test.describe('editor', () => {
  test('types, splits and joins blocks and keeps the published view in step', async ({
    playground,
    editor,
    page,
  }) => {
    await openEditor(playground);

    await editor.clear();
    await expect.poll(() => editor.blockTexts()).toEqual(['']);

    await page.keyboard.type('Hello world');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Second');
    await expect.poll(() => editor.blockTexts()).toEqual(['Hello world', 'Second']);
    await expect.poll(() => editor.previewTexts()).toEqual(['Hello world', 'Second']);

    await page.keyboard.press('Home');
    await page.keyboard.press('Backspace');
    await expect.poll(() => editor.blockTexts()).toEqual(['Hello worldSecond']);

    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(() => editor.blockTexts()).toEqual(['Hello world', 'Second']);
    expect((await editor.readOutput()).changes).toBeGreaterThan(3);
  });

  test('turns markdown shortcuts into blocks and nests list items with Tab', async ({
    playground,
    editor,
    page,
  }) => {
    await openEditor(playground);

    await editor.clear();
    await page.keyboard.type('# Title');
    await page.keyboard.press('Enter');
    await page.keyboard.type('- one');
    await page.keyboard.press('Enter');
    await page.keyboard.type('two');
    await expect.poll(() => editor.blockTags()).toEqual(['h1', 'ul']);

    await page.keyboard.press('Tab');
    await expect(editor.content.locator('ul ul')).toHaveCount(1);
    await expect(editor.content).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(editor.content.locator('ul ul')).toHaveCount(0);

    await page.keyboard.press('ControlOrMeta+z');
    await expect(editor.content.locator('ul ul')).toHaveCount(1);
  });

  test('writes highlighted code after a fence, indents with Tab and leaves with Mod+Enter', async ({
    playground,
    editor,
    page,
  }) => {
    await openEditor(playground);

    await editor.clear();
    await page.keyboard.type('```ts ');
    await expect(editor.codeLanguage()).toHaveText('TypeScript');

    await page.keyboard.type('const answer = 42;');
    await expect(editor.codeToken('keyword')).toHaveText('const');

    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await page.keyboard.type('done();');
    await expect.poll(() => editor.codeText()).toBe('const answer = 42;\n  done();');

    await page.keyboard.press('ControlOrMeta+Enter');
    await page.keyboard.type('after');
    await expect.poll(() => editor.blockTags()).toEqual(['pre', 'p']);

    await expect(editor.preview.locator('.nui-code__token--scope-keyword').first()).toHaveText(
      'const',
    );

    await editor.codeLanguage().click();
    await page.keyboard.type('py');
    await page.keyboard.press('Enter');
    await expect(editor.codeLanguage()).toHaveText('Python');
    await expect(editor.preview.locator('.nui-code__title').first()).toHaveText('Python');

    await editor.codeLanguage().click();
    await expect(editor.codeLanguageOption('Python')).toHaveAttribute('aria-selected', 'true');
    await expect(editor.codeLanguageOption('Python')).toBeInViewport();
  });

  test('formats a selection with the keyboard and selects the mention as one piece', async ({
    playground,
    editor,
    page,
  }) => {
    await openEditor(playground);

    await editor.placeInText('Черновик', 0);

    for (let step = 0; step < 'Черновик'.length; step += 1) {
      await page.keyboard.press('Shift+ArrowRight');
    }

    await page.keyboard.press('ControlOrMeta+b');
    await expect(editor.content.locator('strong', { hasText: 'Черновик' })).toHaveCount(1);
    await expect(editor.preview.locator('strong', { hasText: 'Черновик' })).toHaveCount(1);

    await editor.mention().click();
    await expect(editor.selectedAtoms()).toHaveCount(1);

    await page.keyboard.press('ArrowRight');
    await expect(editor.selectedAtoms()).toHaveCount(0);

    await page.keyboard.type('!');
    await expect(editor.content.locator('p').nth(0)).toContainText('@Анна!');
  });

  test('pastes plain text as paragraphs and stays still in read mode', async ({
    playground,
    editor,
    page,
  }) => {
    await openEditor(playground);

    await editor.placeAtEnd();
    await editor.paste('one\ntwo');

    await expect.poll(async () => (await editor.blockTexts()).at(-2)).toBe('two');
    expect((await editor.blockTexts()).at(-3)).toMatch(/перед созвоном\.one$/u);

    const before = (await editor.readOutput()).changes;

    await editor.readonlySwitch.click();
    await expect(editor.content).toHaveAttribute('contenteditable', 'false');
    await expect(editor.content).toHaveAttribute('aria-readonly', 'true');

    await editor.content.click();
    await page.keyboard.type('x');
    expect((await editor.readOutput()).changes).toBe(before);
  });

  test('pastes markup from other pages as blocks and copies the selection as markup', async ({
    playground,
    editor,
    page,
  }) => {
    await openEditor(playground);

    await editor.clear();

    await editor.paste(
      'Title\none',
      '<meta charset="utf-8"><h2>Title</h2><ul><li><b>one</b></li></ul>',
    );

    await expect.poll(() => editor.blockTags()).toEqual(['h2', 'ul']);
    await expect(editor.content.locator('ul strong')).toHaveText('one');
    await expect(editor.preview.locator('ul strong')).toHaveText('one');

    await page.keyboard.press('ControlOrMeta+a');

    const copied = await editor.copy();

    expect(copied.text).toBe('Title\none');

    expect(copied.html).toContain(
      '<h2 class="nui-content__heading nui-content__heading--level-2">Title</h2>',
    );
  });

  test('cleans up pastes from Word and Google Sheets and reports their source', async ({
    playground,
    editor,
  }) => {
    await openEditor(playground);

    await editor.clear();
    await editor.paste('report', office('word/report.html'));
    await expect.poll(() => editor.blockTags()).toEqual(['h1', 'h2', 'p', 'ul', 'ol', 'div']);
    await expect(editor.content.locator('ul ul li')).toHaveText('Москва');
    await expect(editor.content.locator('ol')).toHaveAttribute('start', '3');
    expect((await editor.readOutput()).paste).toBe('word');

    await editor.clear();
    await editor.paste('budget', office('sheets/budget.html'));
    await expect.poll(() => editor.tableHeads()).toEqual(['Статья', 'Сумма']);
    await expect.poll(() => editor.tableColumn(editor.table(), 1)).toEqual(['50 000', '1 200']);
    expect((await editor.readOutput()).paste).toBe('sheets');
  });

  test('inserts a callout from the toolbar menu with the slash menu items', async ({
    playground,
    editor,
    page,
  }) => {
    await openEditor(playground);

    await editor.clear();
    await editor.tool('Вставить').click();
    await expect(page.getByRole('menuitem', { name: 'Картинка' })).toBeVisible();

    await page.getByRole('menuitem', { name: 'Выноска' }).click();
    await expect(editor.content.locator('.nui-content__callout')).toHaveCount(1);
  });

  test('formats from the toolbar without losing the selection and changes blocks from its menu', async ({
    playground,
    editor,
    page,
  }) => {
    await openEditor(playground);

    await editor.clear();
    await page.keyboard.type('Hello world');

    for (let step = 0; step < 'world'.length; step += 1) {
      await page.keyboard.press('Shift+ArrowLeft');
    }

    await editor.tool('Жирный').click();
    await expect(editor.content.locator('strong')).toHaveText('world');
    await expect(editor.tool('Жирный')).toHaveAttribute('aria-pressed', 'true');
    await expect(editor.content).toBeFocused();

    await editor.blockMenu().click();
    await page.getByRole('menuitemradio', { name: 'Заголовок 1' }).click();
    await expect.poll(() => editor.blockTags()).toEqual(['h1']);
    await expect(editor.content).toBeFocused();

    await page.keyboard.press('Alt+F10');
    await expect(editor.tool('Вставить')).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(editor.tool('Тип блока: Заголовок 1')).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(editor.tool('Жирный')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(editor.content).toBeFocused();
  });

  test('links with Ctrl+K and colours a selection from the bubble over it', async ({
    playground,
    editor,
    page,
  }) => {
    await openEditor(playground);

    const fine = await page.evaluate(
      () => matchMedia('(hover: hover) and (pointer: fine)').matches,
    );

    const colours = fine
      ? editor.bubble()
      : editor.root.getByRole('toolbar', { name: 'Форматирование' });

    await editor.clear();
    await page.keyboard.type('Hello world');

    for (let step = 0; step < 'world'.length; step += 1) {
      await page.keyboard.press('Shift+ArrowLeft');
    }

    await expect(editor.bubble()).toBeVisible({ visible: fine });

    await page.keyboard.press('ControlOrMeta+k');
    await expect(editor.linkField()).toBeFocused();

    await page.keyboard.type('https://numior.test');
    await page.keyboard.press('Enter');
    await expect(editor.content.locator('a')).toHaveText('world');
    await expect(editor.content).toBeFocused();

    await colours.getByRole('button', { name: 'Цвет' }).click();

    await page
      .getByRole('menuitemradio', { name: /Красный/ })
      .first()
      .click();

    await expect(editor.content.locator('.nui-content__colour--red')).toHaveText('world');
    await expect(editor.preview.locator('.nui-content__colour--red')).toHaveText('world');
  });

  test('turns blocks from the slash menu by keyboard and pointer', async ({
    playground,
    editor,
    page,
  }) => {
    await openEditor(playground);

    await editor.clear();
    await page.keyboard.type('/');
    await expect(editor.slashMenu()).toBeVisible();

    await page.keyboard.type('h2');
    await expect(editor.slashMenu().getByRole('option')).toHaveText(['Заголовок 2']);

    await page.keyboard.press('Enter');
    await expect.poll(() => editor.blockTags()).toEqual(['h2']);
    await expect(editor.slashMenu()).toBeHidden();

    await page.keyboard.type('Plan');
    await page.keyboard.press('Enter');
    await page.keyboard.type('/цит');
    await expect(editor.slashMenu().getByRole('option')).toHaveText(['Цитата']);

    await editor.slashMenu().getByRole('option', { name: 'Цитата' }).click();
    await expect.poll(() => editor.blockTags()).toEqual(['h2', 'blockquote']);
    await expect.poll(() => editor.blockTexts()).toEqual(['Plan', '']);
  });

  test('moves blocks by keyboard and handle and duplicates one from its menu', async ({
    playground,
    editor,
    page,
  }) => {
    await openEditor(playground);

    const fine = await page.evaluate(
      () => matchMedia('(hover: hover) and (pointer: fine)').matches,
    );

    await editor.clear();
    await page.keyboard.type('One');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Two');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Three');
    await page.keyboard.press('ControlOrMeta+Shift+ArrowUp');
    await expect.poll(() => editor.blockTexts()).toEqual(['One', 'Three', 'Two']);

    if (fine) {
      await editor.dragBlock(0, 2);
      await expect.poll(() => editor.blockTexts()).toEqual(['Three', 'Two', 'One']);

      await editor.hoverStart(editor.block(1));
    }

    await editor.grip().click();
    await page.getByRole('menuitem', { name: 'Дублировать' }).click();
    await expect.poll(async () => (await editor.blockTexts()).length).toBe(4);
  });

  test('reorders list items by their handle', async ({ playground, editor, page }) => {
    await openEditor(playground);

    const fine = await page.evaluate(
      () => matchMedia('(hover: hover) and (pointer: fine)').matches,
    );

    test.skip(!fine, 'dragging by the handle needs a mouse');
    await editor.clear();
    await page.keyboard.type('- one');
    await page.keyboard.press('Enter');
    await page.keyboard.type('two');
    await page.keyboard.press('Enter');
    await page.keyboard.type('three');
    await editor.drag(editor.item('one'), editor.item('three'));
    await expect(editor.content.locator('li')).toHaveText(['two', 'three', 'one']);

    await editor.hoverStart(editor.item('three'));
    await editor.grip().click();
    await page.getByRole('menuitem', { name: 'Весь список' }).click();
    await editor.grip().click();
    await page.getByRole('menuitem', { name: 'Дублировать' }).click();

    await expect(editor.content.locator('li')).toHaveText([
      'two',
      'three',
      'one',
      'two',
      'three',
      'one',
    ]);
  });

  test('checks to-dos, folds toggles for the reader and sets callout tones', async ({
    playground,
    editor,
    page,
  }) => {
    await openEditor(playground);

    await editor.todoCheck('Подготовить письмо').click();
    await expect(editor.preview.locator('li.nui-content__todo--checked')).toHaveCount(2);

    await editor.content.locator('p').first().click();
    await page.keyboard.press('ControlOrMeta+z');
    await expect(editor.preview.locator('li.nui-content__todo--checked')).toHaveCount(1);

    const { changes } = await editor.readOutput();

    await expect(editor.toggleButton()).toHaveAttribute('aria-expanded', 'false');

    await editor.toggleButton().click();
    await expect(editor.toggle()).toHaveClass(/nui-content__toggle--open/);
    await expect(editor.toggle()).toContainText('Ветка release/2.4');
    expect((await editor.readOutput()).changes).toBe(changes);

    const published = editor.preview.locator('.nui-content__toggle');

    await expect(published.getByText('Ветка release/2.4')).toBeHidden();

    await published.getByRole('button', { name: 'Детали релиза' }).click();
    await expect(published.getByText('Ветка release/2.4')).toBeVisible();

    await editor.calloutTone().click();
    await page.getByRole('menuitemradio', { name: 'Предупреждение' }).click();
    await expect(editor.callout()).toHaveClass(/nui-content__callout--tone-warning/);

    await expect(editor.preview.locator('.nui-content__callout')).toHaveClass(
      /nui-content__callout--tone-warning/,
    );
  });

  test('edits a custom block through its own control and undoes the change', async ({
    playground,
    editor,
    page,
  }) => {
    await openEditor(playground);

    await expect(editor.taskStatus()).toBeVisible();

    await editor.content.getByText('Статус задачи').click();
    await expect(editor.selectedAtoms()).toHaveCount(1);

    await expect(editor.publishedStatus()).toHaveText('Статус задачи: В работе');

    await editor.taskStatus().click();
    await page.getByRole('option', { name: 'Готово' }).click();
    await expect(editor.publishedStatus()).toHaveText('Статус задачи: Готово');

    await editor.content.locator('p').first().click();
    await page.keyboard.press('ControlOrMeta+z');
    await expect(editor.publishedStatus()).toHaveText('Статус задачи: В работе');
    await expect(editor.taskStatus()).toContainText('В работе');
  });

  test('drags blocks into a callout and lifts list items out of their list', async ({
    playground,
    editor,
    page,
  }) => {
    await openEditor(playground);

    const fine = await page.evaluate(
      () => matchMedia('(hover: hover) and (pointer: fine)').matches,
    );

    test.skip(!fine, 'dragging by the handle needs a mouse');

    await editor.drag(
      editor.content.locator('p', { hasText: 'Наберите' }),
      editor.callout().locator('p').first(),
    );

    await expect(editor.callout().locator('p')).toHaveText([
      'Релиз во вторник в 10:00.',
      'Наберите # и пробел для заголовка или - для списка.',
    ]);

    await editor.drag(editor.item('Обновить тарифы'), editor.toggle());
    await expect(editor.content.locator('ul.nui-content__list--bullet')).toHaveCount(2);

    await expect(editor.content.locator('ul.nui-content__list--bullet').last()).toHaveText(
      'Обновить тарифы',
    );
  });

  test('keeps a dragged code block whole and highlighted where a list cannot hold it', async ({
    playground,
    editor,
    page,
  }) => {
    await openEditor(playground);

    const fine = await page.evaluate(
      () => matchMedia('(hover: hover) and (pointer: fine)').matches,
    );

    test.skip(!fine, 'dragging by the handle needs a mouse');

    const code = editor.content.locator('pre', { hasText: 'const release' });

    await expect(editor.codeToken('keyword')).toBeVisible();

    await editor.drag(code, editor.item('Собрать отзывы'));
    await expect(code).toHaveCount(1);
    await expect(editor.item('Собрать отзывы').locator('pre')).toHaveCount(0);

    await editor.drag(code, editor.content.locator('p', { hasText: 'Наберите' }));
    await expect(code.locator('.nui-content__token--scope-keyword').first()).toHaveText('const');
  });

  test('lays blocks out in columns from the slash menu, the keyboard and a side drop', async ({
    playground,
    editor,
    page,
  }) => {
    await openEditor(playground);

    const fine = await page.evaluate(
      () => matchMedia('(hover: hover) and (pointer: fine)').matches,
    );

    await editor.clear();
    await page.keyboard.type('/columns');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Left');
    await expect(editor.columns()).toHaveCount(2);
    await expect(editor.columns().first()).toHaveText('Left');

    const [first, second] = await Promise.all([
      boxOf(editor.columns().first()),
      boxOf(editor.columns().last()),
    ]);

    if (!fine) {
      expect(second.y).toBeGreaterThan(first.y);
      return;
    }

    expect(second.y).toBe(first.y);

    const separator = editor.content.getByRole('separator', { name: 'Ширина колонки 1' });

    await separator.focus();
    await page.keyboard.press('ArrowRight');
    await expect(separator).toHaveAttribute('aria-valuenow', '55');

    await editor.content.locator('p').last().click();
    await page.keyboard.type('Beside me');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Moved');

    await editor.dragBeside(
      editor.content.locator('p', { hasText: 'Moved' }),
      editor.content.locator('p', { hasText: 'Beside me' }),
    );

    await expect(editor.content.locator('.nui-content__columns')).toHaveCount(2);

    await expect(editor.content.locator('.nui-content__columns').last()).toHaveText(
      'Beside meMoved',
    );
  });

  test('edits a data table in place, undoes from inside it and publishes its sort', async ({
    playground,
    editor,
    page,
  }) => {
    await openEditor(playground);
    const published = editor.publishedTable();

    await editor.showTable();
    await editor.tableCell(0, 0).click();
    await page.keyboard.type('Site');
    await page.keyboard.press('Enter');

    await expect
      .poll(() => editor.tableColumn(published, 0))
      .toEqual(['Site', 'Рассылка', 'Вебинар']);

    await page.keyboard.press('ControlOrMeta+z');

    await expect
      .poll(() => editor.tableColumn(published, 0))
      .toEqual(['Лендинг', 'Рассылка', 'Вебинар']);

    await editor.tableAction('Строка').click();
    await expect(published.locator('tbody tr')).toHaveCount(4);

    await editor.openColumnMenu(2);
    await page.getByRole('menuitem', { name: 'Переименовать' }).click();
    await expect(editor.renameField()).toBeFocused();

    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('Budget');
    await page.keyboard.press('Enter');
    await expect.poll(() => editor.tableHeads(published)).toContain('Budget');

    await editor.tableCell(1, 0).click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Удалить строку' }).click();
    await expect.poll(() => editor.tableColumn(published, 0)).toEqual(['Лендинг', 'Вебинар', '']);

    await editor.table().locator('thead th').first().click();

    await expect
      .poll(() => editor.tableColumn(editor.table(), 0))
      .toEqual(['Вебинар', 'Лендинг', '']);

    await expect.poll(() => editor.tableColumn(published, 0)).toEqual(['Вебинар', 'Лендинг', '']);
    await expect(published.locator('thead button')).toHaveCount(0);

    await published.locator('thead th').first().click();
    await expect.poll(() => editor.tableColumn(published, 0)).toEqual(['Вебинар', 'Лендинг', '']);
  });

  test('selects cell ranges inside the editor and keeps the clicked cell marked under the menu', async ({
    playground,
    editor,
    page,
  }) => {
    await openEditor(playground);

    const fine = await page.evaluate(
      () => matchMedia('(hover: hover) and (pointer: fine)').matches,
    );

    test.skip(!fine, 'ranges are drawn with a mouse');

    await editor.showTable();

    const from = await boxOf(editor.tableCell(0, 1));
    const to = await boxOf(editor.tableCell(1, 2));

    await page.mouse.move(from.x + 20, from.y + 10);
    await page.mouse.down();
    await page.mouse.move(to.x + 20, to.y + 10, { steps: 8 });
    await page.mouse.up();
    await expect(editor.table().locator('td.nui-table__cell--ranged')).toHaveCount(4);

    await page.mouse.click(to.x + 20, to.y + 10, { button: 'right' });
    await expect(page.getByRole('menuitem', { name: 'Копировать', exact: true })).toBeVisible();
    await expect(editor.table().locator('td.nui-table__cell--ranged')).toHaveCount(4);
    await expect(editor.table()).toHaveClass(/nui-table--cell-menu/u);
  });

  test('gives the table block a handle without turning it into text', async ({
    playground,
    editor,
    page,
  }) => {
    await openEditor(playground);

    const fine = await page.evaluate(
      () => matchMedia('(hover: hover) and (pointer: fine)').matches,
    );

    test.skip(!fine, 'the handle follows a mouse');

    await editor.showTable();
    await editor.hoverStart(editor.content.locator('.nui-editor__chunk > .nui-content__table'));
    await editor.grip().click();
    await expect(page.getByRole('menuitem', { name: 'Дублировать' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Превратить в' })).toHaveCount(0);
  });

  test('keeps the handle inside the editor beside a table that slides aside with motion on', async ({
    playground,
    editor,
    page,
  }) => {
    await playground.open();
    await editor.root.scrollIntoViewIfNeeded();

    const fine = await page.evaluate(
      () => matchMedia('(hover: hover) and (pointer: fine)').matches,
    );

    test.skip(!fine, 'the handle follows a mouse');

    const table = editor.content.locator('.nui-editor__chunk > .nui-content__table');

    await editor.showTable();
    await editor.hoverStart(table);
    await page.waitForTimeout(400);

    expect(await editor.gripBeside(table)).toBe(true);
  });

  test('writes after the last blocks and leaves a toggle from its empty last line', async ({
    playground,
    editor,
    page,
  }) => {
    await openEditor(playground);
    const bookmark = editor.bookmark('numior.test');

    await bookmark.scrollIntoViewIfNeeded();
    await bookmark.click();
    await page.keyboard.press('Enter');
    await page.keyboard.type('после закладки');
    await expect(bookmark.locator('xpath=following-sibling::*[1]')).toHaveText('после закладки');

    await editor.clickBeside(bookmark);
    await page.keyboard.press('Enter');
    await page.keyboard.type('рядом с закладкой');
    await expect(bookmark.locator('xpath=following-sibling::*[1]')).toHaveText('рядом с закладкой');

    await expect(editor.content.locator(':scope > .nui-editor__chunk > *').first()).toHaveText(
      'План запуска',
    );

    await editor.clickBelowContent();
    await page.keyboard.type('at the end');
    await expect.poll(async () => (await editor.blockTexts()).at(-1)).toBe('at the end');

    await editor.toggleButton().first().click();

    const body = editor.toggle().first().locator('p').nth(1);

    await editor.caretAtEndOf(body);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('после блока');

    await expect(editor.toggle().first().locator('xpath=following-sibling::*[1]')).toHaveText(
      'после блока',
    );
  });

  test('puts the caret beside blocks without text and writes beside pictures and files in the line', async ({
    playground,
    editor,
    page,
  }) => {
    await openEditor(playground);
    const file = editor.file('Заметки к релизу');
    const bookmark = editor.bookmark('numior.test');
    const image = editor.image('="/media/sunrise.svg"');

    await editor.clickBeside(bookmark);
    await expect(bookmark).toHaveClass(/nui-editor__gap/u);

    await page.keyboard.press('Enter');
    await page.keyboard.press('Backspace');
    await expect(bookmark).toHaveClass(/nui-editor__gap/u);
    await expect(bookmark.locator('xpath=following-sibling::*[1]')).toContainText('Заметки лежат');

    await page.keyboard.press('Backspace');
    await expect(bookmark).toHaveClass(/nui-editor__selected/u);

    await page.keyboard.press('Backspace');
    await expect(bookmark).toHaveCount(0);

    await file.click();
    await expect(file).toHaveClass(/nui-editor__selected/u);

    await page.keyboard.press('ArrowRight');
    await page.keyboard.type(' ok');
    await expect(file.locator('xpath=..')).toContainText(' ok — прочитайте');

    await editor.clickBeside(image, 'start');
    await page.keyboard.type('before ');
    await expect(image.locator('xpath=..')).toHaveText(/^before /u);

    await editor.placeInText('Наберите', 0);
    await page.keyboard.press('Backspace');
    await expect(editor.selectedAtoms()).toHaveClass(/nui-content__divider/u);
    await expect(editor.content.locator('p', { hasText: 'Наберите' })).toHaveCount(1);

    await editor.showTable();
    await editor.tableCell(1, 0).click();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect(editor.tableBlock()).toHaveClass(/nui-editor__selected/u);

    await page.keyboard.press('Enter');
    await page.keyboard.type('под таблицей');
    await expect.poll(async () => (await editor.blockTexts()).at(-1)).toBe('под таблицей');
  });

  test('marks a commented range that follows the text typed inside it', async ({
    playground,
    editor,
    page,
  }) => {
    await openEditor(playground);

    await editor.placeInText('Наберите', 0);

    for (let step = 0; step < 8; step += 1) {
      await page.keyboard.press('Shift+ArrowRight');
    }

    await editor.markSelection();
    await expect(editor.anchors()).toHaveText(['Наберите']);

    expect(
      await editor.anchors().evaluateAll((marks) =>
        marks.map((mark) => ({
          tag: mark.tagName,
          position: getComputedStyle(mark).position,
          inherits:
            getComputedStyle(mark).color === getComputedStyle(mark.parentElement ?? mark).color,
        })),
      ),
    ).toEqual([{ tag: 'MARK', position: 'static', inherits: true }]);

    await editor.placeInText('Наберите', 3);
    await page.keyboard.type('xy');
    await expect(editor.anchors()).toHaveText(['Набxyерите']);
    await expect(editor.output).toContainText('"anchors":1');
  });

  test('takes back empty lines after a to-do list and reaches the task status with arrows', async ({
    playground,
    editor,
    page,
  }) => {
    await openEditor(playground);
    const list = editor.content.locator('.nui-content__list--todo');
    const item = list.locator('li').last().locator('p');

    await item.scrollIntoViewIfNeeded();
    await editor.caretAtEndOf(item);

    for (const key of ['Enter', 'Enter', 'Enter', 'Backspace', 'Backspace', 'Backspace']) {
      await page.keyboard.press(key);
    }

    await expect(list.locator('xpath=following-sibling::*[1]')).toHaveClass(/task-status/u);
    await expect(item).toHaveText('Подготовить письм');

    await page.keyboard.press('ArrowDown');
    await expect(list.locator('xpath=following-sibling::*[1]')).toHaveClass(/nui-editor__gap/u);

    await page.keyboard.press('Shift+ArrowLeft');
    await expect(editor.selectedAtoms()).toHaveCount(1);
    await expect(editor.selectedAtoms()).toHaveClass(/task-status/u);
  });

  test('docks the toolbar at the bottom of a touch screen while text is edited', async ({
    playground,
    editor,
    page,
  }) => {
    await openEditor(playground);
    const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);

    test.skip(!coarse, 'the docked toolbar belongs to touch screens');
    await expect(editor.frame.locator('.nui-editor-toolbar')).toHaveCount(0);

    const item = editor.content.locator('.nui-content__list--todo li').last().locator('p');

    await editor.caretAtEndOf(item);

    const dock = editor.dock();

    await expect(dock).toBeVisible();

    await expect
      .poll(async () => {
        const box = await boxOf(dock);

        return Math.round(box.y + box.height);
      })
      .toBe(page.viewportSize()?.height);

    await dock.getByRole('button', { name: 'Сдвинуть вправо' }).click();

    await expect(
      editor.content.locator('.nui-content__list--todo .nui-content__list--todo'),
    ).toHaveCount(1);

    expect(await editor.isFocused()).toBe(true);
  });

  test('passes axe in light and dark, fits phones and types in RTL', async ({
    playground,
    editor,
    page,
  }) => {
    await openEditor(playground);

    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);

      expect(await playground.wcagViolations('section[aria-labelledby="editor-title"]')).toEqual(
        [],
      );
    }

    expect(await playground.hasHorizontalOverflow()).toBe(false);

    await playground.setDirection('rtl');
    await editor.placeAtEnd();
    await page.keyboard.type(' abc');
    await expect.poll(async () => (await editor.blockTexts()).at(-2)).toMatch(/ abc$/);
    expect(await editor.content.evaluate((root) => getComputedStyle(root).direction)).toBe('rtl');
  });
});
