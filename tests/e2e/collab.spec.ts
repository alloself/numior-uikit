import { expect, test } from './fixtures';
import { boxOf } from './helpers/geometry';
import { wcagViolationsOf } from './helpers/axe';

const ANNA = 'Анна';

const BORIS = 'Борис';

const CARET_TOLERANCE = 4;

const THEMES = ['light', 'dark'] as const;

const TURNS = Array.from({ length: 60 }, (_, turn) => turn % 2);

const HALF = '+'.repeat(TURNS.length / 2);

const STREAM = 'x'.repeat(800);

const TALL_TEXT = 60;

test.describe('collaboration', () => {
  test('merges what was typed without a connection when it comes back', async ({ collab }) => {
    const anna = await collab.joinOffline(ANNA);
    const boris = await collab.join(BORIS);

    await anna.write('Общая строка');
    await expect(boris.editor).toContainText('Общая строка');

    await anna.disconnect();
    await anna.appendTo(0, ' от Анны');
    await boris.paragraph(0).click();
    await boris.page.keyboard.press('Home');
    await boris.page.keyboard.type('Борис: ');
    await anna.reconnect();

    await expect(boris.editor).toContainText('Борис: Общая строка от Анны');
    await expect(anna.editor).toContainText('Борис: Общая строка от Анны');
  });

  test('settles one cell by server order and keeps the losing value', async ({ collab }) => {
    const anna = await collab.joinOffline(ANNA);
    const boris = await collab.join(BORIS);

    await anna.insertTable();
    await boris.tableCell(0, 0).waitFor();

    await anna.disconnect();
    await anna.setCell(0, 0, 'Anna');
    await boris.setCell(0, 0, 'Boris');
    await expect(boris.tableCell(0, 0)).toHaveText('Boris');

    await anna.reconnect();

    await expect(boris.tableCell(0, 0)).toHaveText('Anna');
    await expect(anna.tableCell(0, 0)).toHaveText('Anna');

    await anna.reload();

    await expect(anna.overwritten).toHaveCount(1);
    await expect(anna.overwritten).toContainText('Boris');
    expect(await wcagViolationsOf(anna.page)).toEqual([]);

    await anna.putBack(0);

    await expect(anna.overwritten).toHaveCount(0);
    await expect(boris.tableCell(0, 0)).toHaveText('Boris');
    await expect(anna.tableCell(0, 0)).toHaveText('Boris');
  });

  test('opens a copy of another version read-only and keeps its queue', async ({ collab }) => {
    const anna = await collab.joinOffline(ANNA);
    const boris = await collab.join(BORIS);

    await anna.write('Начало');
    await expect(boris.editor).toContainText('Начало');

    await anna.disconnect();
    await anna.appendTo(0, ' офлайн');
    await expect.poll(() => anna.unsentSteps(collab.name)).toBeGreaterThan(0);

    await anna.openWithPlugin(2);

    await expect(anna.report).toContainText('demo: у сохранённой копии версия 1');
    await expect(anna.report).toContainText('Неотправленные правки сохранены');
    await expect(anna.readOnlyDocument).toContainText('Начало');
    expect(await wcagViolationsOf(anna.page)).toEqual([]);

    await anna.openWithPlugin(1);
    await anna.editor.waitFor();

    await expect(anna.editor).toContainText('Начало офлайн');

    await anna.reconnect();
    await expect(boris.editor).toContainText('Начало офлайн');
  });

  test('keeps unsent text through a reload and sends it on return', async ({ collab }) => {
    const anna = await collab.joinOffline(ANNA);
    const boris = await collab.join(BORIS);

    await anna.write('Начало');
    await expect(boris.editor).toContainText('Начало');

    await anna.disconnect();
    await anna.appendTo(0, ' офлайн');
    await expect.poll(() => anna.unsentSteps(collab.name)).toBeGreaterThan(0);

    await anna.reload();

    await expect(anna.editor).toContainText('Начало офлайн');
    await expect(anna.status).toHaveText('offline');
    await expect(boris.editor).not.toContainText('офлайн');

    await anna.appendTo(0, ' и после');
    await anna.reconnect();

    await expect(boris.editor).toContainText('Начало офлайн и после');
    await expect.poll(() => anna.unsentSteps(collab.name)).toBe(0);
  });

  test('takes a comment on a copy opened read-only and leaves its text alone', async ({
    collab,
  }) => {
    const anna = await collab.joinOffline(ANNA);
    const boris = await collab.join(BORIS);

    await anna.write('Начало');
    await expect(boris.editor).toContainText('Начало');

    await anna.disconnect();
    await anna.appendTo(0, ' офлайн');
    await expect.poll(() => anna.unsentSteps(collab.name)).toBeGreaterThan(0);

    await anna.openWithPlugin(2);
    await expect(anna.readOnlyDocument).toContainText('Начало');

    await anna.selectWordInCopy(0);
    await anna.page.keyboard.type('лишнее');
    await anna.addComment('Заметка');

    await expect(anna.threads).toContainText('Заметка');
    await expect(anna.readOnlyDocument.locator('.nui-editor__comment')).toHaveText('Начало');
    await expect(anna.readOnlyDocument).not.toContainText('лишнее');
    expect(await wcagViolationsOf(anna.page)).toEqual([]);
  });

  test('closes a document that lost sync, says why and opens it again from the server', async ({
    collab,
  }) => {
    const anna = await collab.join(ANNA);
    const boris = await collab.join(BORIS);

    await anna.write('Общая строка');
    await expect(boris.editor).toContainText('Общая строка');

    await anna.loseSync();

    await expect(anna.failure).toContainText('Правки больше не отправляются');
    await expect(anna.failure).toContainText('Сервер прислал ответ');
    await expect(anna.readOnlyDocument).toContainText('Общая строка');
    expect(await wcagViolationsOf(anna.page)).toEqual([]);

    await boris.appendTo(0, ' и ещё');
    await anna.openAgain();

    await expect(anna.failure).toHaveCount(0);
    await expect(anna.editor).toContainText('Общая строка и ещё');

    await anna.appendTo(0, '!');
    await expect(boris.editor).toContainText('Общая строка и ещё!');
  });

  test('shows what each person types to the other', async ({ collab }) => {
    const anna = await collab.join(ANNA);
    const boris = await collab.join(BORIS);

    await anna.write('Первая строка');

    await expect(boris.editor).toContainText('Первая строка');

    await boris.appendTo(0, ' и правка');

    await expect(anna.editor).toContainText('Первая строка и правка');
  });

  test('converges when both people type at the same time', async ({ collab }) => {
    const anna = await collab.join(ANNA);
    const boris = await collab.join(BORIS);

    await anna.write('Один');
    await anna.newLine('Два');
    await expect(boris.editor).toContainText('Два');

    await boris.appendTo(0, ' ');

    await Promise.all([anna.page.keyboard.type('слева'), boris.page.keyboard.type('справа')]);

    await expect(anna.editor).toContainText('Дваслева');
    await expect(anna.editor).toContainText('Один справа');
    await expect.poll(() => boris.text()).toBe(await anna.text());
  });

  test('types where a person has just clicked while the other keeps typing', async ({ collab }) => {
    const anna = await collab.join(ANNA);
    const boris = await collab.join(BORIS);

    await anna.write('Один');
    await anna.newLine('Два');
    await anna.newLine('Три');
    await expect(boris.editor).toContainText('Три');

    const typing = anna.keepTyping(STREAM);

    await boris.appendToEach(TURNS, '+');
    await typing;

    await expect(boris.paragraph(0)).toHaveText(`Один${HALF}`);
    await expect(boris.paragraph(1)).toHaveText(`Два${HALF}`);
    await expect(anna.paragraph(0)).toHaveText(`Один${HALF}`);
    await expect(anna.paragraph(1)).toHaveText(`Два${HALF}`);
  });

  test('loads the current document for someone who joins later', async ({ collab }) => {
    const anna = await collab.join(ANNA);

    await anna.write('Уже написано');
    await expect(anna.status).toHaveText('online');

    await anna.page.waitForTimeout(300);

    const boris = await collab.join(BORIS);

    await expect(boris.editor).toContainText('Уже написано');
  });

  test('shows the other person with an avatar and a named caret', async ({ collab }) => {
    const anna = await collab.join(ANNA);
    const boris = await collab.join(BORIS);

    await anna.write('Текст');

    await expect(boris.avatars).toHaveCount(1);
    await expect(boris.caretOf(ANNA)).toHaveCSS('opacity', '1');
  });

  test('highlights the range the other person selects', async ({ collab }) => {
    const anna = await collab.join(ANNA);
    const boris = await collab.join(BORIS);

    await anna.write('Выделяемая строка');
    await expect(boris.editor).toContainText('Выделяемая строка');

    await boris.selectLine(0);

    await expect(anna.selections).toHaveText('Выделяемая строка');
  });

  test('removes a person who leaves', async ({ collab }) => {
    const anna = await collab.join(ANNA);
    const boris = await collab.join(BORIS);

    await boris.write('Был');
    await expect(anna.caretOf(BORIS)).toHaveCount(1);

    await boris.leave();

    await expect(anna.avatars).toHaveCount(0);
    await expect(anna.carets).toHaveCount(0);
  });

  test('puts the caret at the end of the text', async ({ collab }) => {
    const anna = await collab.join(ANNA);
    const boris = await collab.join(BORIS);

    await anna.write('Конец строки');
    await expect(boris.editor).toContainText('Конец строки');

    await expect
      .poll(async () => {
        const caret = await boxOf(boris.caretOf(ANNA));
        const edges = await boris.textEdges(0);

        return Math.abs(caret.x - edges.right);
      })
      .toBeLessThan(CARET_TOLERANCE);
  });

  test('puts the caret at the end of the text on a right-to-left page', async ({ collab }) => {
    const anna = await collab.join(ANNA);
    const boris = await collab.join(BORIS);

    await anna.setDirection('rtl');
    await boris.setDirection('rtl');
    await anna.write('مرحبا بالعالم');
    await expect(boris.editor).toContainText('مرحبا بالعالم');

    await expect
      .poll(async () => {
        const caret = await boxOf(boris.caretOf(ANNA));
        const edges = await boris.textEdges(0);

        return Math.abs(caret.x - edges.left);
      })
      .toBeLessThan(CARET_TOLERANCE);
  });

  test('paints a selection of someone else over every line it crosses', async ({ collab }) => {
    const anna = await collab.join(ANNA);
    const boris = await collab.join(BORIS);

    await anna.write('Первая');
    await anna.newLine('Вторая');
    await expect(boris.editor).toContainText('Вторая');

    await anna.page.keyboard.press('Control+a');

    await expect(boris.selections).toHaveCount(2);
  });

  test('keeps the caret of someone else on its text while a line is added above it', async ({
    collab,
  }) => {
    const anna = await collab.join(ANNA);
    const boris = await collab.join(BORIS);

    await anna.write('Первая');
    await anna.newLine('Вторая');
    await boris.appendTo(1, '!');
    await expect(anna.paragraph(1)).toHaveText('Вторая!');
    await expect(anna.caretOf(BORIS)).toHaveCSS('opacity', '1');

    await anna.endOf(0);

    const lag = await anna.caretLag(BORIS, 'Вторая!', () => anna.page.keyboard.press('Enter'));

    expect(lag).toBeLessThanOrEqual(1);
    await expect(anna.paragraph(2)).toHaveText('Вторая!');
  });

  test('keeps the caret of someone else on a list item they indent', async ({ collab }) => {
    const anna = await collab.join(ANNA);
    const boris = await collab.join(BORIS);

    await anna.write('- Первый');
    await anna.newLine('Второй');
    await anna.page.keyboard.press('Tab');

    const nested = boris.editor.locator('li li p');

    await expect(nested).toHaveText('Второй');

    await expect
      .poll(async () => {
        const caret = await boxOf(boris.caretOf(ANNA));
        const line = await boxOf(nested);

        return caret.y >= line.y - 2 && caret.y <= line.y + line.height;
      })
      .toBe(true);
  });

  test('keeps a comment on a list item that gets indented', async ({ collab }) => {
    const anna = await collab.join(ANNA);
    const boris = await collab.join(BORIS);

    await anna.write('- Первый');
    await anna.newLine('Второй');
    await expect(boris.editor).toContainText('Второй');

    await anna.page.keyboard.press('Home');
    await anna.page.keyboard.press('Shift+End');
    await anna.addComment('Вопрос');

    await boris.editor.locator('li p').nth(1).click();
    await boris.page.keyboard.press('Tab');

    await expect(anna.editor.locator('li li p')).toHaveText('Второй');
    await expect(anna.marks).toHaveText('Второй');
  });

  test('adds a comment to the selected line and marks it', async ({ collab }) => {
    const anna = await collab.join(ANNA);

    await anna.write('Спорная строка');
    await anna.selectLine(0);

    await anna.addComment('Проверить');

    await expect(anna.threads).toContainText('Проверить');
    await expect(anna.marks).toHaveText('Спорная строка');
  });

  test('keeps the mark on its text when the other person types before it', async ({ collab }) => {
    const anna = await collab.join(ANNA);
    const boris = await collab.join(BORIS);

    await anna.write('Спорная строка');
    await expect(boris.editor).toContainText('Спорная строка');

    await anna.selectLine(0);
    await anna.addComment('Проверить');

    await boris.paragraph(0).click();
    await boris.page.keyboard.press('Home');
    await boris.page.keyboard.type('Вначале ');

    await expect(anna.editor).toContainText('Вначале Спорная строка');
    await expect(anna.marks).toHaveText('Спорная строка');
  });

  test('replies to a comment, resolves it and deletes it', async ({ collab }) => {
    const anna = await collab.join(ANNA);

    await anna.write('Строка');
    await anna.selectLine(0);
    await anna.addComment('Вопрос');

    await anna.replyTo(0, 'Ответ');

    await expect(anna.threads).toContainText('Ответ');

    await anna.pressInThread(0, 'Решить');

    await expect(anna.comments).toBeHidden();
    await expect(anna.marks).toHaveCount(0);

    await anna.openDiscussions();

    await expect(anna.discussions).toContainText('Решён');

    await anna.pressInDiscussion(0, 'Удалить');

    await expect(anna.discussions.locator('.nui-collab-comments__thread')).toHaveCount(0);
  });

  test('opens a discussion at the commented text and closes it with a click away', async ({
    collab,
  }) => {
    const anna = await collab.join(ANNA);

    await anna.write('Спорная строка');
    await anna.newLine('Вторая');
    await anna.selectLine(0);
    await anna.addComment('Вопрос');

    await anna.clickAway();

    await expect(anna.comments).toBeHidden();

    await anna.openMark(0);

    const mark = await boxOf(anna.marks.first());
    const popover = await boxOf(anna.comments);

    expect(popover.y).toBeGreaterThanOrEqual(mark.y + mark.height);
    expect(Math.abs(popover.x - mark.x)).toBeLessThan(40);
    await expect(anna.threads).toContainText('Вопрос');

    await anna.clickAway();

    await expect(anna.comments).toBeHidden();
  });

  test('gives the text back the focus when a discussion is closed from the keyboard', async ({
    collab,
  }) => {
    const anna = await collab.join(ANNA);

    await anna.write('Спорная строка');
    await anna.selectLine(0);
    await anna.addComment('Вопрос');
    await anna.clickAway();
    await anna.openMark(0);

    await anna.enterDiscussion();

    await expect(anna.threads.getByRole('button', { name: 'Ответить' })).toBeFocused();

    await anna.leaveWithKeyboard();

    await expect(anna.comments).toBeHidden();
    await expect(anna.editor).toBeFocused();
  });

  test('keeps the actions and the comment on screen for a selection taller than the window', async ({
    collab,
  }) => {
    const anna = await collab.join(ANNA);

    await anna.writeLines(TALL_TEXT);
    await anna.selectEverything();
    await anna.scrollToMiddle();

    await expect(await anna.selectionBar()).toBeInViewport({ ratio: 1 });

    await anna.startComment();

    await expect(anna.comments).toBeInViewport({ ratio: 1 });
  });

  test('shows what a saved version changed', async ({ collab }) => {
    const anna = await collab.join(ANNA);

    await anna.write('Первая версия');
    await anna.saveVersion(1);
    await anna.appendTo(0, ' правка');
    await anna.saveVersion(2);

    await anna.pickVersion(0);

    await expect(anna.additions).toContainText('правка');
    expect(await wcagViolationsOf(anna.page)).toEqual([]);
  });

  test('restores a version for everybody in the document', async ({ collab }) => {
    const anna = await collab.join(ANNA);
    const boris = await collab.join(BORIS);

    await anna.write('Первая версия');
    await anna.saveVersion(1);
    await anna.appendTo(0, ' правка');
    await expect(boris.editor).toContainText('правка');

    await anna.pickVersion(0);

    await anna.restoreVersion();

    await expect(anna.editor).toHaveText('Первая версия');
    await expect(boris.editor).toHaveText('Первая версия');
  });

  for (const theme of THEMES) {
    test(`has no axe violations with people present in the ${theme} theme`, async ({ collab }) => {
      const anna = await collab.join(ANNA);
      const boris = await collab.join(BORIS);

      await anna.setTheme(theme);
      await anna.write('Текст для проверки');
      await expect(anna.editor).toContainText('Текст для проверки');
      await expect(boris.editor).toContainText('Текст для проверки');

      await boris.selectLine(0);
      await expect(anna.selections).toHaveCount(1);

      await anna.selectLine(0);
      await anna.addComment('Комментарий');
      await expect(anna.threads).toHaveCount(1);

      const violations = await wcagViolationsOf(anna.page);

      expect(violations).toEqual([]);
    });
  }
});
