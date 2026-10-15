import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { PlaygroundPage } from './pages/playground';

const office = (path: string): string =>
  readFileSync(new URL(`fixtures/paste/${path}`, import.meta.url), 'utf8');

const openEditor = async (page: Page): Promise<PlaygroundPage> => {
  const playground = new PlaygroundPage(page);

  await playground.emulate({ reducedMotion: 'reduce' });
  await playground.open();
  await playground.editor.root.scrollIntoViewIfNeeded();
  return playground;
};

test.describe('editor', () => {
  test('types, splits and joins blocks and keeps the published view in step', async ({ page }) => {
    const { editor } = await openEditor(page);

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

  test('turns markdown shortcuts into blocks and nests list items with Tab', async ({ page }) => {
    const { editor } = await openEditor(page);

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

  test('formats a selection with the keyboard and selects the mention as one piece', async ({
    page,
  }) => {
    const { editor } = await openEditor(page);

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

  test('pastes plain text as paragraphs and stays still in read mode', async ({ page }) => {
    const { editor } = await openEditor(page);

    await editor.placeAtEnd();
    await editor.paste('one\ntwo');

    await expect
      .poll(async () => (await editor.blockTexts()).slice(-2))
      .toEqual(['Наберите # и пробел для заголовка или - для списка.one', 'two']);

    const before = (await editor.readOutput()).changes;

    await editor.readonlySwitch.click();
    await expect(editor.content).toHaveAttribute('contenteditable', 'false');
    await expect(editor.content).toHaveAttribute('aria-readonly', 'true');
    await editor.content.click();
    await page.keyboard.type('x');
    expect((await editor.readOutput()).changes).toBe(before);
  });

  test('pastes markup from other pages as blocks and copies the selection as markup', async ({
    page,
  }) => {
    const { editor } = await openEditor(page);

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
    page,
  }) => {
    const { editor } = await openEditor(page);

    await editor.clear();
    await editor.paste('report', office('word/report.html'));
    await expect.poll(() => editor.blockTags()).toEqual(['h1', 'h2', 'p', 'ul', 'ol', 'div']);
    await expect(editor.content.locator('ul ul li')).toHaveText('Москва');
    await expect(editor.content.locator('ol')).toHaveAttribute('start', '3');
    expect((await editor.readOutput()).paste).toBe('word');
    await editor.clear();
    await editor.paste('budget', office('sheets/budget.html'));
    await expect(editor.content.locator('td strong')).toHaveText(['Статья', 'Сумма']);
    expect((await editor.readOutput()).paste).toBe('sheets');
  });

  test('formats from the toolbar without losing the selection and changes blocks from its menu', async ({
    page,
  }) => {
    const { editor } = await openEditor(page);

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
    await expect(editor.tool('Тип блока: Заголовок 1')).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(editor.tool('Жирный')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(editor.content).toBeFocused();
  });

  test('links with Ctrl+K and colours a selection from the bubble over it', async ({ page }) => {
    const { editor } = await openEditor(page);

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

  test('passes axe in light and dark, fits phones and types in RTL', async ({ page }) => {
    const playground = await openEditor(page);
    const { editor } = playground;

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
    await expect.poll(async () => (await editor.blockTexts()).at(-1)).toMatch(/ abc$/);
    expect(await editor.content.evaluate((root) => getComputedStyle(root).direction)).toBe('rtl');
  });
});
