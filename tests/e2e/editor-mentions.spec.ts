import { expect, test } from './fixtures';
import { PlaygroundPage } from './pages/playground';

test.beforeEach(async ({ playground }) => {
  await playground.emulate({ reducedMotion: 'reduce' });
  await playground.open();
  await playground.editor.root.scrollIntoViewIfNeeded();
});

const newLine = async (playground: PlaygroundPage): Promise<void> => {
  await playground.editor.placeAtEnd();
  await playground.editor.showCaret();
  await playground.page.keyboard.press('Enter');
};

test.describe('editor mentions', () => {
  test('finds people after @ and inserts the chosen one in the editor and the published view', async ({
    playground,
    editor,
    page,
  }) => {
    const before = await editor.publishedMentions().count();

    await newLine(playground);
    await page.keyboard.type('Спросить @бо');

    const list = editor.mentionList();

    await expect(list.getByRole('option')).toHaveCount(1);
    await expect(list.getByRole('option')).toHaveAccessibleName('Борис Ковалёв Разработка');

    await page.keyboard.press('Enter');
    await expect(list).toBeHidden();
    await expect(editor.mentions().last()).toHaveText('@Борис Ковалёв');
    await expect(editor.publishedMentions()).toHaveCount(before + 1);
    await expect(editor.publishedMentions().last()).toHaveText('@Борис Ковалёв');
  });

  test('chooses with the pointer, closes on Escape and passes axe with the list open', async ({
    playground,
    editor,
    page,
  }) => {
    await newLine(playground);
    await page.keyboard.type('@');

    const list = editor.mentionList();

    await expect(list.getByRole('option')).toHaveCount(5);
    expect(await playground.wcagViolations('.nui-editor-mentions')).toEqual([]);

    await page.keyboard.type('нет-такого');
    await expect(list).toContainText('Никого не нашли');

    await page.keyboard.press('Escape');
    await expect(list).toBeHidden();

    await page.keyboard.type(' и @ве');
    await list.getByRole('option', { name: /Вера Соколова/u }).click();
    await expect(editor.mentions().last()).toHaveText('@Вера Соколова');
  });
});
