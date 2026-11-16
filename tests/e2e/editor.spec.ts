import { readFileSync } from 'node:fs';
import { expect, test } from './fixtures';
import { PlaygroundPage } from './pages/playground';
import { boxOf } from './helpers/geometry';

const office = (path: string): string =>
  readFileSync(new URL(`fixtures/paste/${path}`, import.meta.url), 'utf8');

const LINKED_PARAGRAPH = 3;

const SCROLL_STEP = 150;

const SELECTION_TOLERANCE = 2;

const CENTRE_TOLERANCE = 2;

const WRAPPED_LINE =
  'The armchair ships flat in one box and takes ten minutes to put together with the key that comes inside. '.repeat(
    2,
  );

const SHORT_WINDOW = 480;

const openEditor = async (playground: PlaygroundPage): Promise<void> => {
  await playground.emulate({ reducedMotion: 'reduce' });
  await playground.open();
  await playground.editor.root.scrollIntoViewIfNeeded();
};

test.describe('editor', () => {
  test('types, splits and joins blocks and keeps the published view in step', async ({
    playground,
    editor,
  }) => {
    await openEditor(playground);

    await editor.clear();
    await expect.poll(() => editor.blockTexts()).toEqual(['']);

    await editor.typeText('Hello world');
    await editor.pressEnter();
    await editor.typeText('Second');
    await expect.poll(() => editor.blockTexts()).toEqual(['Hello world', 'Second']);
    await expect.poll(() => editor.previewTexts()).toEqual(['Hello world', 'Second']);

    await editor.caretToLineStart();
    await editor.deleteBackward();
    await expect.poll(() => editor.blockTexts()).toEqual(['Hello worldSecond']);
    await expect.poll(() => editor.previewTexts()).toEqual(['Hello worldSecond']);

    await editor.undo();
    await expect.poll(() => editor.blockTexts()).toEqual(['Hello world', 'Second']);
    await expect.poll(() => editor.previewTexts()).toEqual(['Hello world', 'Second']);
    await expect.poll(async () => (await editor.readOutput()).changes).toBeGreaterThanOrEqual(3);
  });

  test('drags selected text to another line, copies it with Ctrl and undoes each in one step', async ({
    playground,
    editor,
  }) => {
    await openEditor(playground);

    const fine = await editor.hasFinePointer();

    test.skip(!fine, 'selected text is dragged with a mouse');

    await editor.clear();
    await editor.typeText('alpha beta');
    await editor.pressEnter();
    await editor.typeText('gamma');

    await editor.dragText('beta', 'mma');
    await expect.poll(() => editor.blockTexts()).toEqual(['alpha ', 'gabetamma']);

    await editor.undo();
    await expect.poll(() => editor.blockTexts()).toEqual(['alpha beta', 'gamma']);

    await editor.dragText('alpha', 'mma', 'Control');
    await expect.poll(() => editor.blockTexts()).toEqual(['alpha beta', 'gaalphamma']);
  });

  test('turns markdown shortcuts into blocks and nests list items with Tab', async ({
    playground,
    editor,
  }) => {
    await openEditor(playground);

    await editor.clear();
    await editor.typeText('# Title');
    await editor.pressEnter();
    await editor.typeText('- one');
    await editor.pressEnter();
    await editor.typeText('two');
    await expect.poll(() => editor.blockTags()).toEqual(['h1', 'ul']);

    await editor.indent();
    await expect(editor.content.locator('ul ul')).toHaveCount(1);
    await expect(editor.content).toBeFocused();

    await editor.outdent();
    await expect(editor.content.locator('ul ul')).toHaveCount(0);

    await editor.undo();
    await expect(editor.content.locator('ul ul')).toHaveCount(1);
  });

  test('writes highlighted code after a fence, indents with Tab and leaves with Mod+Enter', async ({
    playground,
    editor,
  }) => {
    await openEditor(playground);

    await editor.clear();
    await editor.typeText('```ts ');
    await expect(editor.codeLanguage()).toHaveText('TypeScript');

    await editor.typeText('const answer = 42;');
    await expect(editor.codeToken('keyword')).toHaveText('const');

    await editor.pressEnter();
    await editor.indent();
    await editor.typeText('done();');
    await expect.poll(() => editor.codeText()).toBe('const answer = 42;\n  done();');

    await editor.leaveCodeBlock();
    await editor.typeText('after');
    await expect.poll(() => editor.blockTags()).toEqual(['pre', 'p']);

    await expect(editor.preview.locator('.nui-code__token--scope-keyword').first()).toHaveText(
      'const',
    );

    await editor.codeLanguage().click();
    await editor.typeText('py');
    await editor.pressEnter();
    await expect(editor.codeLanguage()).toHaveText('Python');
    await expect(editor.preview.locator('.nui-code__title').first()).toHaveText('Python');

    await editor.codeLanguage().click();
    await expect(editor.codeLanguageOption('Python')).toHaveAttribute('aria-selected', 'true');
    await expect(editor.codeLanguageOption('Python')).toBeInViewport();
  });

  test('formats a selection with the keyboard and selects the mention as one piece', async ({
    playground,
    editor,
  }) => {
    await openEditor(playground);

    await editor.placeInText('Черновик', 0);

    for (let step = 0; step < 'Черновик'.length; step += 1) {
      await editor.extendSelection('right');
    }

    await editor.toggleBold();
    await expect(editor.content.locator('strong', { hasText: 'Черновик' })).toHaveCount(1);
    await expect(editor.preview.locator('strong', { hasText: 'Черновик' })).toHaveCount(1);

    await editor.mention().click();
    await expect(editor.selectedAtoms()).toHaveCount(1);

    await editor.moveCaret('right');
    await expect(editor.selectedAtoms()).toHaveCount(0);

    await editor.typeText('!');
    await expect(editor.content.locator('p').nth(0)).toContainText('@Анна!');
  });

  test('pastes plain text as paragraphs and stays still in read mode', async ({
    playground,
    editor,
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
    await editor.typeText('x');
    expect((await editor.readOutput()).changes).toBe(before);
  });

  test('pastes markup from other pages as blocks and copies the selection as markup', async ({
    playground,
    editor,
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

    await editor.selectAll();

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
  }) => {
    await openEditor(playground);

    await editor.clear();
    await editor.tool('Вставить').click();
    await expect(editor.insertOption('Картинка')).toBeVisible();

    await editor.insertOption('Выноска').click();
    await expect(editor.content.locator('.nui-content__callout')).toHaveCount(1);
  });

  test('finds a block in the plus menu and puts it below the list the caret is in', async ({
    playground,
    editor,
  }) => {
    await openEditor(playground);

    await editor.clear();
    await editor.typeText('- one');
    await expect.poll(() => editor.blockTags()).toEqual(['ul']);

    await editor.tool('Вставить').click();
    await expect(editor.insertSearch()).toBeFocused();
    await expect(editor.disabledInsertOptions()).toHaveCount(0);

    await editor.typeText('загол');
    await expect(editor.insertOptions()).toHaveCount(6);

    await editor.moveCaret('down');
    await editor.pressEnter();
    await expect.poll(() => editor.blockTags()).toEqual(['ul', 'h2']);
    await expect(editor.content).toBeFocused();

    await editor.typeText('Next');
    await expect(editor.content.locator('h2')).toHaveText('Next');
    await expect(editor.content.locator('li')).toHaveText('one');

    await editor.tool('Вставить').click();
    await expect(editor.insertSearch()).toHaveValue('');
    await expect(editor.insertOptions().first()).toBeVisible();
  });

  test('formats from the toolbar without losing the selection and changes blocks from its menu', async ({
    playground,
    editor,
  }) => {
    await openEditor(playground);

    await editor.clear();
    await editor.typeText('Hello world');

    for (let step = 0; step < 'world'.length; step += 1) {
      await editor.extendSelection('left');
    }

    await editor.tool('Жирный').click();
    await expect(editor.content.locator('strong')).toHaveText('world');
    await expect(editor.tool('Жирный')).toHaveAttribute('aria-pressed', 'true');
    await expect(editor.content).toBeFocused();

    const fine = await editor.hasFinePointer();

    await expect(editor.headerBlockMenu()).toHaveCount(fine ? 0 : 1);

    await editor.blockMenu().click();
    await expect(editor.menuItemRadio('Заголовок 6')).toBeVisible();

    await editor.menuItemRadio('Заголовок 1').click();
    await expect.poll(() => editor.blockTags()).toEqual(['h1']);
    await expect(editor.content).toBeFocused();

    await editor.focusToolbar();
    await expect(editor.tool('Вставить')).toBeFocused();

    await editor.moveCaret('right');
    await expect(editor.tool('Отменить')).toBeFocused();

    await editor.pressEscape();
    await expect(editor.content).toBeFocused();
  });

  test('keeps the toolbar reachable from the keyboard when the control under focus turns off', async ({
    playground,
    editor,
  }) => {
    await openEditor(playground);
    const coarse = await editor.hasCoarsePointer();

    test.skip(coarse, 'the docked toolbar of a touch screen leaves with the focus of the text');

    await editor.clear();
    await editor.typeText('Hello');
    await editor.undoAllWith('Space');

    await expect(editor.tool('Повторить')).toBeFocused();

    await editor.pressEscape();
    await editor.focusToolbar();
    await expect(editor.tool('Повторить')).toBeFocused();

    await editor.moveCaret('right');
    await expect(editor.tool('Жирный')).toBeFocused();
  });

  test('centres the bubble over a wrapped paragraph picked with a triple click', async ({
    playground,
    editor,
  }) => {
    await openEditor(playground);

    const fine = await editor.hasFinePointer();

    test.skip(!fine, 'the bubble follows a mouse');

    const line = editor.content.locator('p').first();

    await editor.clear();
    await editor.typeText(WRAPPED_LINE);
    await editor.pressEnter();
    await editor.typeText('Next');
    await line.click({ clickCount: 3 });
    await expect(editor.bubble()).toBeVisible();

    const [text, bubble] = await Promise.all([boxOf(line), boxOf(editor.bubble())]);

    expect(Math.abs(bubble.x + bubble.width / 2 - (text.x + text.width / 2))).toBeLessThanOrEqual(
      CENTRE_TOLERANCE,
    );
  });

  test('links with Ctrl+K and colours a selection from the bubble over it', async ({
    playground,
    editor,
  }) => {
    await openEditor(playground);

    const fine = await editor.hasFinePointer();

    const colours = fine
      ? editor.bubble()
      : editor.root.getByRole('toolbar', { name: 'Форматирование' });

    await editor.clear();
    await editor.typeText('Hello world');

    for (let step = 0; step < 'world'.length; step += 1) {
      await editor.extendSelection('left');
    }

    await expect(editor.bubble()).toBeVisible({ visible: fine });

    await editor.openLinkField();
    await expect(editor.linkField()).toBeFocused();

    await editor.typeText('https://numior.test');
    await editor.pressEnter();
    await expect(editor.content.locator('a')).toHaveText('world');
    await expect(editor.content).toBeFocused();

    await colours.getByRole('button', { name: 'Цвет' }).click();

    await editor
      .menuItemRadio(/Красный/)
      .first()
      .click();

    await expect(editor.content.locator('.nui-content__colour--red')).toHaveText('world');
    await expect(editor.preview.locator('.nui-content__colour--red')).toHaveText('world');
  });

  test('turns blocks from the slash menu by keyboard and pointer', async ({
    playground,
    editor,
  }) => {
    await openEditor(playground);

    await editor.clear();
    await editor.typeText('/');
    await expect(editor.slashMenu()).toBeVisible();

    await editor.typeText('h2');
    await expect(editor.slashMenu().getByRole('option')).toHaveText(['Заголовок 2']);

    await editor.pressEnter();
    await expect.poll(() => editor.blockTags()).toEqual(['h2']);
    await expect(editor.slashMenu()).toBeHidden();

    await editor.typeText('Plan');
    await editor.pressEnter();
    await editor.typeText('/цит');
    await expect(editor.slashMenu().getByRole('option')).toHaveText(['Цитата']);

    await editor.slashMenu().getByRole('option', { name: 'Цитата' }).click();
    await expect.poll(() => editor.blockTags()).toEqual(['h2', 'blockquote']);
    await expect.poll(() => editor.blockTexts()).toEqual(['Plan', '']);
  });

  test('keeps the slash menu inside a short window and reaches its last blocks', async ({
    playground,
    editor,
  }) => {
    await playground.resize({ width: 1280, height: SHORT_WINDOW });
    await openEditor(playground);

    await editor.clear();
    await editor.typeText('/');
    await expect(editor.slashMenu()).toBeVisible();

    await expect
      .poll(async () => {
        const menu = await boxOf(editor.slashMenu());

        return menu.y + menu.height;
      })
      .toBeLessThanOrEqual(SHORT_WINDOW);

    await editor.slashMenu().getByRole('option', { name: 'Разделитель' }).click();
    await expect.poll(() => editor.blockTags()).toContain('hr');
  });

  test('moves blocks by keyboard and handle and duplicates one from its menu', async ({
    playground,
    editor,
  }) => {
    await openEditor(playground);

    const fine = await editor.hasFinePointer();

    await editor.clear();
    await editor.typeText('One');
    await editor.pressEnter();
    await editor.typeText('Two');
    await editor.pressEnter();
    await editor.typeText('Three');
    await editor.moveBlockUp();
    await expect.poll(() => editor.blockTexts()).toEqual(['One', 'Three', 'Two']);

    if (fine) {
      await editor.dragBlock(0, 2);
      await expect.poll(() => editor.blockTexts()).toEqual(['Three', 'Two', 'One']);

      await editor.hoverStart(editor.block(1));
    }

    await editor.grip().click();
    await editor.menuItem('Дублировать').click();
    await expect.poll(async () => (await editor.blockTexts()).length).toBe(4);
  });

  test('reorders list items by their handle', async ({ playground, editor }) => {
    await openEditor(playground);

    const fine = await editor.hasFinePointer();

    test.skip(!fine, 'dragging by the handle needs a mouse');
    await editor.clear();
    await editor.typeText('- one');
    await editor.pressEnter();
    await editor.typeText('two');
    await editor.pressEnter();
    await editor.typeText('three');
    await editor.drag(editor.item('one'), editor.item('three'));
    await expect(editor.content.locator('li')).toHaveText(['two', 'three', 'one']);

    await editor.hoverStart(editor.item('three'));
    await editor.grip().click();
    await editor.menuItem('Весь список').click();
    await editor.grip().click();
    await editor.menuItem('Дублировать').click();

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
  }) => {
    await openEditor(playground);

    await editor.todoCheck('Подготовить письмо').click();
    await expect(editor.preview.locator('li.nui-content__todo--checked')).toHaveCount(2);

    await editor.content.locator('p').first().click();
    await editor.undo();
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
    await editor.menuItemRadio('Предупреждение').click();
    await expect(editor.callout()).toHaveClass(/nui-content__callout--tone-warning/);

    await expect(editor.preview.locator('.nui-content__callout')).toHaveClass(
      /nui-content__callout--tone-warning/,
    );
  });

  test('edits a custom block through its own control and undoes the change', async ({
    playground,
    editor,
  }) => {
    await openEditor(playground);

    await expect(editor.taskStatus()).toBeVisible();

    await editor.content.getByText('Статус задачи').click();
    await expect(editor.selectedAtoms()).toHaveCount(1);

    await expect(editor.publishedStatus()).toHaveText('Статус задачи: В работе');

    await editor.taskStatus().click();
    await editor.option('Готово').click();
    await expect(editor.publishedStatus()).toHaveText('Статус задачи: Готово');

    await editor.content.locator('p').first().click();
    await editor.undo();
    await expect(editor.publishedStatus()).toHaveText('Статус задачи: В работе');
    await expect(editor.taskStatus()).toContainText('В работе');
  });

  test('drags blocks into a callout and lifts list items out of their list', async ({
    playground,
    editor,
  }) => {
    await openEditor(playground);

    const fine = await editor.hasFinePointer();

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
  }) => {
    await openEditor(playground);

    const fine = await editor.hasFinePointer();

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
  }) => {
    await openEditor(playground);

    const fine = await editor.hasFinePointer();

    await editor.clear();
    await editor.typeText('/columns');
    await editor.pressEnter();
    await editor.typeText('Left');
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
    await editor.moveCaret('right');
    await expect(separator).toHaveAttribute('aria-valuenow', '55');

    await editor.content.locator('p').last().click();
    await editor.typeText('Beside me');
    await editor.pressEnter();
    await editor.typeText('Moved');

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
  }) => {
    await openEditor(playground);
    const published = editor.publishedTable();

    await editor.showTable();
    await editor.tableCell(0, 0).click();
    await editor.typeText('Site');
    await editor.pressEnter();

    await expect
      .poll(() => editor.tableColumn(published, 0))
      .toEqual(['Site', 'Рассылка', 'Вебинар']);

    await editor.undo();

    await expect
      .poll(() => editor.tableColumn(published, 0))
      .toEqual(['Лендинг', 'Рассылка', 'Вебинар']);

    await editor.tableAction('Строка').click();
    await expect(published.locator('tbody tr')).toHaveCount(4);

    await editor.openColumnMenu(2);
    await editor.menuItem('Переименовать').click();
    await expect(editor.renameField()).toBeFocused();

    await editor.selectAll();
    await editor.typeText('Budget');
    await editor.pressEnter();
    await expect.poll(() => editor.tableHeads(published)).toContain('Budget');

    await editor.tableCell(1, 0).click({ button: 'right' });
    await editor.menuItem('Удалить строку').click();
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
  }) => {
    await openEditor(playground);

    const fine = await editor.hasFinePointer();

    test.skip(!fine, 'ranges are drawn with a mouse');

    await editor.showTable();

    await editor.drawCellRange(editor.tableCell(0, 1), editor.tableCell(1, 2));
    await expect(editor.table().locator('td.nui-table__cell--ranged')).toHaveCount(4);

    await editor.rightClickCell(editor.tableCell(1, 2));
    await expect(editor.menuItem('Копировать', { exact: true })).toBeVisible();
    await expect(editor.table().locator('td.nui-table__cell--ranged')).toHaveCount(4);
    await expect(editor.table()).toHaveClass(/nui-table--cell-menu/u);
  });

  test('gives the table block a handle without turning it into text', async ({
    playground,
    editor,
  }) => {
    await openEditor(playground);

    const fine = await editor.hasFinePointer();

    test.skip(!fine, 'the handle follows a mouse');

    await editor.showTable();
    await editor.hoverStart(editor.content.locator('.nui-editor__chunk > .nui-content__table'));
    await editor.grip().click();
    await expect(editor.menuItem('Дублировать')).toBeVisible();
    await expect(editor.menuItem('Превратить в')).toHaveCount(0);
  });

  test('keeps the handle inside the editor beside a table that slides aside with motion on', async ({
    playground,
    editor,
  }) => {
    await playground.open();
    await editor.root.scrollIntoViewIfNeeded();

    const fine = await editor.hasFinePointer();

    test.skip(!fine, 'the handle follows a mouse');

    const table = editor.content.locator('.nui-editor__chunk > .nui-content__table');

    await editor.showTable();
    await editor.hoverStart(table);
    await expect(editor.grip()).toBeVisible();
    await expect.poll(() => editor.gripBeside(table)).toBe(true);
  });

  test('slides a line inside an open toggle aside for its grip like a top-level line', async ({
    playground,
    editor,
  }) => {
    await playground.open();
    await editor.root.scrollIntoViewIfNeeded();
    test.skip(!(await editor.followsMouse()), 'the handle follows a mouse');
    await editor.openToggle();

    expect(await editor.slidesAsideOnHover(editor.block(0))).toBe(true);
    expect(await editor.slidesAsideOnHover(editor.toggleLine('Ветка release/2.4'))).toBe(true);
  });

  test('keeps a line and the menu over its selection still under the pointer and shows the handle once the selection is gone', async ({
    playground,
    editor,
  }) => {
    await playground.open();
    await editor.root.scrollIntoViewIfNeeded();

    const fine = await editor.hasFinePointer();

    test.skip(!fine, 'the handle follows a mouse');

    const line = editor.content.locator('p').first();

    await editor.clear();
    await editor.typeText('Hello world');
    await editor.selectToLineStart();
    await expect(editor.bubble()).toBeVisible();

    await editor.settled(editor.bubble());

    const before = await boxOf(editor.bubble());

    await editor.hoverStart(line);
    await editor.settled(line);

    await expect(editor.pushed()).toHaveCount(0);
    expect(await boxOf(editor.bubble())).toEqual(before);
    expect(await editor.selectionGap()).toBeLessThanOrEqual(SELECTION_TOLERANCE);

    await editor.moveCaret('right');
    await expect(editor.bubble()).toBeHidden();
    await expect(editor.pushed()).toHaveCount(1);
  });

  test('leaves a selection of the whole document with Home, End and a click at its start without losing the text', async ({
    playground,
    editor,
  }) => {
    await playground.open();
    await editor.root.scrollIntoViewIfNeeded();
    await editor.clear();
    await editor.typeText('One');
    await editor.pressEnter();
    await editor.typeText('Two');

    await editor.selectAll();
    await editor.caretToLineStart();
    await editor.typeText('a');
    await expect.poll(() => editor.blockTexts()).toEqual(['aOne', 'Two']);

    await editor.selectAll();
    await editor.caretToLineEnd();
    await editor.typeText('b');
    await expect.poll(() => editor.blockTexts()).toEqual(['aOne', 'Twob']);

    await editor.selectAll();
    await editor.clickLineStart(editor.block(0));
    await editor.typeText('c');
    await expect.poll(() => editor.blockTexts()).toEqual(['caOne', 'Twob']);
  });

  test('moves the end of a selection of the whole document with Shift and arrows as a text field does', async ({
    playground,
    editor,
  }) => {
    await playground.open();
    await editor.root.scrollIntoViewIfNeeded();
    await editor.clear();
    await editor.typeText('One');
    await editor.pressEnter();
    await editor.typeText('Two');

    await editor.selectAll();
    await editor.extendSelection('left');
    await editor.typeText('a');
    await expect.poll(() => editor.blockTexts()).toEqual(['ao']);

    await editor.pressEnter();
    await editor.typeText('Two');
    await editor.selectAll();
    await editor.extendSelection('right');
    await editor.typeText('b');
    await expect.poll(() => editor.blockTexts()).toEqual(['b']);
  });

  test('joins lines across lists, a callout and a closed toggle with Delete and Backspace', async ({
    playground,
    editor,
  }) => {
    await openEditor(playground);

    await editor.placeInText('Обновить тарифы', 15);
    await editor.deleteForward();
    await expect(editor.item('Обновить тарифы')).toHaveText('Обновить тарифыСогласовать дату');
    await expect(editor.content.locator('.nui-content__todo')).toHaveCount(1);

    await editor.placeInText('pnpm', 0);
    await editor.deleteBackward();

    await expect(editor.toggle().locator('p').first()).toHaveText(
      'Детали релизаpnpm release:check',
    );

    await expect(editor.toggle().getByText('Ветка release/2.4')).toBeHidden();

    await editor.typeText('!');

    await expect(editor.toggle().locator('p').first()).toHaveText(
      'Детали релиза!pnpm release:check',
    );

    await editor.placeInText('Релиз во вторник', 25);
    await editor.deleteForward();

    await expect(editor.content.locator('.nui-content__callout p')).toHaveText(
      'Релиз во вторник в 10:00.Детали релиза!pnpm release:check',
    );

    await expect(editor.toggle().locator('p')).toHaveText(['Ветка release/2.4, миграций: 3.']);
  });

  test('writes after the last blocks and leaves a toggle from its empty last line', async ({
    playground,
    editor,
  }) => {
    await openEditor(playground);
    const bookmark = editor.bookmark('numior.test');

    await bookmark.scrollIntoViewIfNeeded();
    await bookmark.click();
    await editor.pressEnter();
    await editor.typeText('после закладки');
    await expect(bookmark.locator('xpath=following-sibling::*[1]')).toHaveText('после закладки');

    await editor.clickBeside(bookmark);
    await editor.pressEnter();
    await editor.typeText('рядом с закладкой');
    await expect(bookmark.locator('xpath=following-sibling::*[1]')).toHaveText('рядом с закладкой');

    await expect(editor.content.locator(':scope > .nui-editor__chunk > *').first()).toHaveText(
      'План запуска',
    );

    await editor.clickBelowContent();
    await editor.typeText('at the end');
    await expect.poll(async () => (await editor.blockTexts()).at(-1)).toBe('at the end');

    await editor.toggleButton().first().click();

    const body = editor.toggle().first().locator('p').nth(1);

    await editor.caretAtEndOf(body);
    await editor.pressEnter();
    await editor.pressEnter();
    await editor.typeText('после блока');

    await expect(editor.toggle().first().locator('xpath=following-sibling::*[1]')).toHaveText(
      'после блока',
    );
  });

  test('puts the caret beside blocks without text and writes beside pictures and files in the line', async ({
    playground,
    editor,
  }) => {
    await openEditor(playground);
    const file = editor.file('Заметки к релизу');
    const bookmark = editor.bookmark('numior.test');
    const image = editor.image('="/media/sunrise.svg"');

    await editor.clickBeside(bookmark);
    await expect(bookmark).toHaveClass(/nui-editor__gap/u);

    await editor.pressEnter();
    await editor.deleteBackward();
    await expect(bookmark).toHaveClass(/nui-editor__gap/u);
    await expect(bookmark.locator('xpath=following-sibling::*[1]')).toContainText('Заметки лежат');

    await editor.deleteBackward();
    await expect(bookmark).toHaveClass(/nui-editor__selected/u);

    await editor.deleteBackward();
    await expect(bookmark).toHaveCount(0);

    await file.click();
    await expect(file).toHaveClass(/nui-editor__selected/u);

    await editor.moveCaret('right');
    await editor.typeText(' ok');
    await expect(file.locator('xpath=..')).toContainText(' ok — прочитайте');

    await editor.clickBeside(image, 'start');
    await editor.typeText('before ');
    await expect(image.locator('xpath=..')).toHaveText(/^before /u);

    await editor.placeInText('Наберите', 0);
    await editor.deleteBackward();
    await expect(editor.selectedAtoms()).toHaveClass(/nui-content__divider/u);
    await expect(editor.content.locator('p', { hasText: 'Наберите' })).toHaveCount(1);

    await editor.showTable();
    await editor.tableCell(1, 0).click();
    await editor.pressEscape();
    await editor.pressEscape();
    await expect(editor.tableBlock()).toHaveClass(/nui-editor__selected/u);

    await editor.pressEnter();
    await editor.typeText('под таблицей');
    await expect.poll(async () => (await editor.blockTexts()).at(-1)).toBe('под таблицей');
  });

  test('marks a commented range that follows the text typed inside it', async ({
    playground,
    editor,
  }) => {
    await openEditor(playground);

    await editor.placeInText('Наберите', 0);

    for (let step = 0; step < 8; step += 1) {
      await editor.extendSelection('right');
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
    await editor.typeText('xy');
    await expect(editor.anchors()).toHaveText(['Набxyерите']);
    await expect(editor.output).toContainText('"anchors":1');
  });

  test('takes back empty lines after a to-do list and reaches the task status with arrows', async ({
    playground,
    editor,
  }) => {
    await openEditor(playground);
    const list = editor.content.locator('.nui-content__list--todo');
    const item = list.locator('li').last().locator('p');

    await item.scrollIntoViewIfNeeded();
    await editor.caretAtEndOf(item);

    await editor.pressEnter();
    await editor.pressEnter();
    await editor.pressEnter();
    await editor.deleteBackward();
    await editor.deleteBackward();
    await editor.deleteBackward();

    await expect(list.locator('xpath=following-sibling::*[1]')).toHaveClass(/task-status/u);
    await expect(item).toHaveText('Подготовить письм');

    await editor.moveCaret('down');
    await expect(list.locator('xpath=following-sibling::*[1]')).toHaveClass(/nui-editor__gap/u);

    await editor.extendSelection('left');
    await expect(editor.selectedAtoms()).toHaveCount(1);
    await expect(editor.selectedAtoms()).toHaveClass(/task-status/u);
  });

  test('docks the toolbar at the bottom of a touch screen while text is edited', async ({
    playground,
    editor,
    page,
  }) => {
    await openEditor(playground);
    const coarse = await editor.hasCoarsePointer();

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

  test('keeps the link panel at its text while a text area with its own scroll is scrolled', async ({
    benchEditor,
  }) => {
    await benchEditor.open();
    await benchEditor.linkParagraph(LINKED_PARAGRAPH);
    const below = await benchEditor.panelBelow(LINKED_PARAGRAPH);

    await benchEditor.scrollText(SCROLL_STEP);

    await expect.poll(() => benchEditor.panelBelow(LINKED_PARAGRAPH)).toBe(below);
  });

  test('keeps the link panel on screen when the selection is taller than the text area', async ({
    benchEditor,
  }) => {
    await benchEditor.open();
    await benchEditor.scrollTextToMiddle();

    await benchEditor.linkEverything();

    await expect(benchEditor.linkPanel).toBeInViewport({ ratio: 1 });
  });

  test('passes axe in light and dark, fits phones and types in RTL', async ({
    playground,
    editor,
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
    await editor.typeText(' abc');
    await expect.poll(async () => (await editor.blockTexts()).at(-2)).toMatch(/ abc$/);
    expect(await editor.content.evaluate((root) => getComputedStyle(root).direction)).toBe('rtl');
  });
});
