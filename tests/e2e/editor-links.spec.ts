import { expect, test } from './fixtures';

const VIDEO = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

test.beforeEach(async ({ playground, editor }) => {
  await playground.emulate({ reducedMotion: 'reduce' });
  await playground.open();
  await editor.liveLinksSwitch().click();
  await editor.root.scrollIntoViewIfNeeded();
});

test.describe('editor links', () => {
  test('embeds a pasted video link in the editor and in the published view', async ({ editor }) => {
    await editor.startLineAtEnd();
    await editor.paste(VIDEO);
    await expect(editor.pasteMenu()).toBeVisible();

    await editor.menuItem('Встроить YouTube').click();

    const frame = editor.content.locator('.nui-editor-embed iframe');

    await expect(frame).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    );

    await expect(editor.preview.locator('.nui-content__embed iframe')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    );
  });

  test('bookmarks a pasted link with the metadata the adapter returns', async ({ editor }) => {
    await editor.startLineAtEnd();
    await editor.paste('https://example.test/news');
    await editor.menuItem('Закладка').click();

    await expect(
      editor.content.locator('.nui-content__bookmark-title', { hasText: 'Страница example.test' }),
    ).toBeVisible();

    await expect(
      editor.preview.locator('.nui-content__bookmark-title', { hasText: 'Страница example.test' }),
    ).toBeVisible();
  });

  test('keeps a pasted link as text when the choice is dismissed', async ({ editor }) => {
    await editor.startLineAtEnd();
    await editor.paste('https://example.test/keep');
    await expect(editor.pasteMenu()).toBeVisible();

    await editor.pressEscape();
    await expect(editor.pasteMenu()).toBeHidden();
    await expect(editor.content.locator('a[href="https://example.test/keep"]')).toBeVisible();
  });

  test('refuses links no allowed provider embeds in the embed panel', async ({ editor }) => {
    await editor.startLineAtEnd();
    await editor.typeText('/emb');
    await editor.pressEnter();
    await editor.mediaPanel().getByRole('textbox').fill('https://example.test/video');
    await editor.mediaPanel().getByRole('button', { name: 'Вставить' }).click();
    await expect(editor.mediaPanel()).toContainText('Эту ссылку нельзя встроить');
  });

  test('changes the address of a bookmark from its bar and asks for the new metadata', async ({
    editor,
  }) => {
    const card = editor.bookmark('numior.test');

    await card.scrollIntoViewIfNeeded();
    await card.locator('.nui-content__bookmark-title').click();
    await expect(editor.linkBar()).toBeVisible();

    await editor.relink('https://docs.example.test/start');

    await expect(editor.publishedBookmark('docs.example.test')).toContainText(
      'Страница docs.example.test',
    );

    await expect(editor.linkBar()).toBeVisible();

    await editor.undo();
    await expect(editor.publishedBookmark('numior.test')).toContainText('Релиз 2.4');

    await editor.bookmark('numior.test').locator('.nui-content__bookmark-title').click();
    await editor.relink('https://numior.test/blog/release-2-4', 'Что нового в 2.4');
    await expect(editor.publishedBookmark('numior.test')).toContainText('Что нового в 2.4');
  });

  test('keeps a bookmark between other blocks selected and types over it from the keyboard', async ({
    editor,
  }) => {
    const card = editor.bookmark('numior.test');

    await card.scrollIntoViewIfNeeded();
    await card.locator('.nui-content__bookmark-description').click();
    await editor.tapShift();
    await expect(editor.selectedAtoms()).toHaveCount(1);
    await expect(editor.linkBar()).toBeVisible();

    await editor.replaceSelectionWith('x');
    await expect(editor.bookmark('numior.test')).toHaveCount(0);
    await expect(editor.content.locator('p', { hasText: /^x$/u })).toHaveCount(1);

    await editor.undo();
    await expect(editor.bookmark('numior.test')).toHaveCount(1);

    await editor.bookmark('numior.test').locator('.nui-content__bookmark-title').click();
    await editor.deleteBackward();
    await expect(editor.bookmark('numior.test')).toHaveCount(0);
  });

  test('passes axe with the paste menu and the bookmark bar open', async ({
    playground,
    editor,
  }) => {
    await editor.startLineAtEnd();
    await editor.paste('https://example.test/axe');
    await expect(editor.pasteMenu()).toBeVisible();
    expect(await playground.wcagViolations('.nui-editor-paste')).toEqual([]);

    await editor.menuItem('Закладка').click();

    const card = editor.content.locator('.nui-content__bookmark-link').last();

    await card.click();
    await expect(editor.lastLinkBar()).toBeVisible();
    expect(await playground.wcagViolations('section[aria-labelledby="editor-title"]')).toEqual([]);

    await editor.linkBar().getByRole('button', { name: 'Изменить закладку' }).click();
    await expect(editor.linkBarForm()).toBeVisible();
    expect(await playground.wcagViolations('.nui-editor-link-bar__edit')).toEqual([]);
  });
});
