import { expect, test, type Page } from '@playwright/test';
import { PlaygroundPage } from './pages/playground';

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
