import { expect, test } from './fixtures';

test.beforeEach(async ({ playground, editor }) => {
  await playground.emulate({ reducedMotion: 'reduce' });
  await playground.open();
  await editor.root.scrollIntoViewIfNeeded();
});

const FORGED =
  '<div data-numior-editor="1"><p><span class="nui-content__mention" data-user="boris">@Шеф</span></p></div>';

test.describe('editor mentions', () => {
  test('finds people after @ and inserts the chosen one in the editor and the published view', async ({
    editor,
  }) => {
    const before = await editor.publishedMentions().count();

    await editor.startLineAtEnd();
    await editor.typeText('Спросить @бо');

    const list = editor.mentionList();

    await expect(list.getByRole('option')).toHaveCount(1);
    await expect(list.getByRole('option')).toHaveAccessibleName('Борис Ковалёв Разработка');

    await editor.pressEnter();
    await expect(list).toBeHidden();
    await expect(editor.mentions().last()).toHaveText('@Борис Ковалёв');
    await expect(editor.publishedMentions()).toHaveCount(before + 1);
    await expect(editor.publishedMentions().last()).toHaveText('@Борис Ковалёв');
  });

  test('chooses with the pointer, closes on Escape and passes axe with the list open', async ({
    playground,
    editor,
  }) => {
    await editor.startLineAtEnd();
    await editor.typeText('@');

    const list = editor.mentionList();

    await expect(list.getByRole('option')).toHaveCount(5);
    expect(await playground.wcagViolations('.nui-editor-mentions')).toEqual([]);

    await editor.typeText('нет-такого');
    await expect(list).toContainText('Никого не нашли');

    await editor.pressEscape();
    await expect(list).toBeHidden();

    await editor.typeText(' и @ве');
    await list.getByRole('option', { name: /Вера Соколова/u }).click();
    await expect(editor.mentions().last()).toHaveText('@Вера Соколова');
  });

  test('pastes a person copied here as a person and a person from markup of another page as text', async ({
    editor,
  }) => {
    const before = await editor.mentions().count();

    await editor.startLineAtEnd();
    await editor.typeText('@бо');
    await expect(editor.mentionList().getByRole('option')).toHaveCount(1);

    await editor.pressEnter();
    await expect(editor.mentions()).toHaveCount(before + 1);

    await editor.selectAll();

    const copied = await editor.copy();

    await editor.placeAtEnd();
    await editor.paste(copied.text, copied.html);
    await expect(editor.mentions()).toHaveCount(2 * (before + 1));

    await editor.paste('@Шеф', FORGED);
    await expect(editor.content).toContainText('@Шеф');
    await expect(editor.mentions()).toHaveCount(2 * (before + 1));
  });
});
