import { expect, test } from './fixtures';
import { PlaygroundPage, type Theme } from './pages/playground';

const SECTION = 'section[aria-labelledby="editor-title"]';

const THEMES: readonly Theme[] = ['light', 'dark'];

const openEditor = async (playground: PlaygroundPage, theme: Theme): Promise<void> => {
  await playground.emulate({ reducedMotion: 'reduce' });
  await playground.open();
  await playground.setTheme(theme);
  await playground.editor.root.scrollIntoViewIfNeeded();
};

const clean = async (playground: PlaygroundPage): Promise<void> => {
  expect(await playground.wcagViolations(SECTION)).toEqual([]);
};

for (const theme of THEMES) {
  test.describe(`editor accessibility in the ${theme} theme`, () => {
    test('passes axe with the bubble, the link form, the colours and the slash menu open', async ({
      playground,
      editor,
    }) => {
      test.slow();
      await openEditor(playground, theme);
      const fine = await editor.hasFinePointer();

      await editor.clear();
      await editor.typeText('Hello world');

      for (let step = 0; step < 'world'.length; step += 1) {
        await editor.extendSelection('left');
      }

      if (fine) {
        await expect(editor.bubble()).toBeVisible();

        await clean(playground);
      }

      await editor.openLinkField();
      await expect(editor.linkField()).toBeFocused();

      await clean(playground);
      await editor.pressEscape();

      const colours = fine
        ? editor.bubble()
        : editor.root.getByRole('toolbar', { name: 'Форматирование' });

      await colours.getByRole('button', { name: 'Цвет' }).click();
      await expect(editor.menuItemRadio(/Красный/u).first()).toBeVisible();

      await clean(playground);
      await editor.pressEscape();

      await editor.tool('Вставить').click();
      await expect(editor.insertSearch()).toBeFocused();

      await clean(playground);
      await editor.pressEscape();

      await editor.placeAtEnd();
      await editor.pressEnter();
      await editor.typeText('/');
      await expect(editor.slashMenu()).toBeVisible();

      await clean(playground);
    });

    test('passes axe with the block menu, the callout tones and the code languages open', async ({
      playground,
      editor,
    }) => {
      test.slow();
      await openEditor(playground, theme);
      await editor.block(0).scrollIntoViewIfNeeded();

      if (await editor.hasFinePointer()) {
        await editor.hoverStart(editor.block(0));
      } else {
        await editor.block(0).click();
      }

      await editor.grip().click();
      await expect(editor.menuItem('Дублировать')).toBeVisible();

      await clean(playground);
      await editor.pressEscape();

      await editor.calloutTone().click();
      await expect(editor.menuItemRadio().first()).toBeVisible();

      await clean(playground);
      await editor.pressEscape();

      await editor.codeLanguage().click();
      await expect(editor.option('TypeScript')).toBeVisible();

      await clean(playground);
    });

    test('passes axe with the column menu, the file bar, a caret beside a block and a marked comment', async ({
      playground,
      editor,
    }) => {
      test.slow();
      await openEditor(playground, theme);
      await editor.showTable();
      await editor.openColumnMenu(0);
      await expect(editor.menuItem('Переименовать')).toBeVisible();

      await clean(playground);
      await editor.pressEscape();

      await editor.file('Заметки к релизу').click();
      await expect(editor.linkBar()).toBeVisible();

      await clean(playground);

      await editor.clickBeside(editor.bookmark('numior.test'));
      await expect(editor.bookmark('numior.test')).toHaveClass(/nui-editor__gap/u);

      await clean(playground);

      await editor.placeInText('Наберите', 0);

      for (let step = 0; step < 8; step += 1) {
        await editor.extendSelection('right');
      }

      await editor.markSelection();
      await expect(editor.anchors()).toHaveCount(1);

      await editor.placeAtEnd();
      await clean(playground);
    });

    test('passes axe with an upload that failed and with the toolbar docked on a phone', async ({
      playground,
      editor,
    }) => {
      test.slow();
      await openEditor(playground, theme);
      await editor.uploadFailSwitch.click();
      await editor.placeAtEnd();
      await editor.pasteFiles([{ name: 'broken.txt', type: 'text/plain' }]);
      await expect(editor.uploadCards()).toContainText('Сервер не ответил', { timeout: 10_000 });

      await clean(playground);

      if (await editor.hasFinePointer()) {
        return;
      }

      await editor.placeAtEnd();
      await editor.showCaret();
      await expect(editor.dock()).toBeVisible();

      await clean(playground);
    });
  });
}
