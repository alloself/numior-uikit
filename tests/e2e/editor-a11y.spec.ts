import { type Page } from '@playwright/test';
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

const finePointer = (page: Page): Promise<boolean> =>
  page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches);

const clean = async (playground: PlaygroundPage): Promise<void> => {
  expect(await playground.wcagViolations(SECTION)).toEqual([]);
};

for (const theme of THEMES) {
  test.describe(`editor accessibility in the ${theme} theme`, () => {
    test('passes axe with the bubble, the link form, the colours and the slash menu open', async ({
      playground,
      editor,
      page,
    }) => {
      test.slow();
      await openEditor(playground, theme);
      const fine = await finePointer(page);

      await editor.clear();
      await page.keyboard.type('Hello world');

      for (let step = 0; step < 'world'.length; step += 1) {
        await page.keyboard.press('Shift+ArrowLeft');
      }

      if (fine) {
        await expect(editor.bubble()).toBeVisible();

        await clean(playground);
      }

      await page.keyboard.press('ControlOrMeta+k');
      await expect(editor.linkField()).toBeFocused();

      await clean(playground);
      await page.keyboard.press('Escape');

      const colours = fine
        ? editor.bubble()
        : editor.root.getByRole('toolbar', { name: 'Форматирование' });

      await colours.getByRole('button', { name: 'Цвет' }).click();
      await expect(page.getByRole('menuitemradio', { name: /Красный/u }).first()).toBeVisible();

      await clean(playground);
      await page.keyboard.press('Escape');

      await editor.placeAtEnd();
      await page.keyboard.press('Enter');
      await page.keyboard.type('/');
      await expect(editor.slashMenu()).toBeVisible();

      await clean(playground);
    });

    test('passes axe with the block menu, the callout tones and the code languages open', async ({
      playground,
      editor,
      page,
    }) => {
      test.slow();
      await openEditor(playground, theme);
      await editor.block(0).scrollIntoViewIfNeeded();

      if (await finePointer(page)) {
        await editor.hoverStart(editor.block(0));
      } else {
        await editor.block(0).click();
      }

      await editor.grip().click();
      await expect(page.getByRole('menuitem', { name: 'Дублировать' })).toBeVisible();

      await clean(playground);
      await page.keyboard.press('Escape');

      await editor.calloutTone().click();
      await expect(page.getByRole('menuitemradio').first()).toBeVisible();

      await clean(playground);
      await page.keyboard.press('Escape');

      await editor.codeLanguage().click();
      await expect(page.getByRole('option', { name: 'TypeScript' })).toBeVisible();

      await clean(playground);
    });

    test('passes axe with the column menu, the file bar, a caret beside a block and a marked comment', async ({
      playground,
      editor,
      page,
    }) => {
      test.slow();
      await openEditor(playground, theme);
      await editor.showTable();
      await editor.openColumnMenu(0);
      await expect(page.getByRole('menuitem', { name: 'Переименовать' })).toBeVisible();

      await clean(playground);
      await page.keyboard.press('Escape');

      await editor.file('Заметки к релизу').click();
      await expect(editor.linkBar()).toBeVisible();

      await clean(playground);

      await editor.clickBeside(editor.bookmark('numior.test'));
      await expect(editor.bookmark('numior.test')).toHaveClass(/nui-editor__gap/u);

      await clean(playground);

      await editor.placeInText('Наберите', 0);

      for (let step = 0; step < 8; step += 1) {
        await page.keyboard.press('Shift+ArrowRight');
      }

      await editor.markSelection();
      await expect(editor.anchors()).toHaveCount(1);

      await editor.placeAtEnd();
      await clean(playground);
    });

    test('passes axe with an upload that failed and with the toolbar docked on a phone', async ({
      playground,
      editor,
      page,
    }) => {
      test.slow();
      await openEditor(playground, theme);
      await page.getByTestId('editor-upload-fail').click();
      await editor.placeAtEnd();
      await editor.pasteFiles([{ name: 'broken.txt', type: 'text/plain' }]);
      await expect(editor.uploadCards()).toContainText('Сервер не ответил', { timeout: 10_000 });

      await clean(playground);

      if (await finePointer(page)) {
        return;
      }

      await editor.placeAtEnd();
      await editor.showCaret();
      await expect(editor.dock()).toBeVisible();

      await clean(playground);
    });
  });
}
