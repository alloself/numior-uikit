import { expect, test } from './fixtures';
import { wcagViolationsOf } from './helpers/axe';

const THEMES = ['light', 'dark'] as const;

test.describe('collaboration lab', () => {
  test.beforeEach(async ({ collabLab }) => {
    await collabLab.open();
  });

  test('shows what one person types to the other with their caret', async ({ collabLab }) => {
    await collabLab.left.write('hello');

    await expect(collabLab.right.editor).toContainText('hello');
    await expect(collabLab.right.carets.filter({ hasText: 'Анна' })).toHaveCount(1);
  });

  test('takes the first press below the text while the page around the panes holds the focus', async ({
    collabLab,
  }) => {
    await collabLab.focusPageAround();

    await collabLab.left.write('first press');

    await expect(collabLab.left.editor).toContainText('first press');
  });

  test('merges edits made while the link was cut', async ({ collabLab }) => {
    await collabLab.left.write('first');
    await expect(collabLab.right.editor).toContainText('first');

    await collabLab.left.cutLink();
    await collabLab.left.write(' mine');
    await collabLab.right.write(' theirs');
    await expect(collabLab.right.editor).not.toContainText('mine');

    await collabLab.left.restoreLink();

    await expect(collabLab.right.editor).toContainText('mine');
    await expect(collabLab.left.editor).toContainText('theirs');
  });

  test('keeps offline edits through a reload of the pane', async ({ collabLab }) => {
    await collabLab.left.cutLink();
    await collabLab.left.write('saved');
    await expect.poll(() => collabLab.left.unsentSteps()).toBeGreaterThan(0);

    await collabLab.left.reload();

    await expect(collabLab.left.editor).toContainText('saved');
    await expect(collabLab.right.editor).toContainText('saved');
  });

  test('opens a new room empty and working for the document and the workbook', async ({
    collabLab,
  }) => {
    await collabLab.left.write('old');
    await expect(collabLab.right.editor).toContainText('old');

    await collabLab.newRoom();

    await expect(collabLab.left.editor).not.toContainText('old');
    await expect(collabLab.left.status).toHaveText('online');
    await expect(collabLab.right.status).toHaveText('online');

    await collabLab.left.write('fresh');

    await expect(collabLab.right.editor).toContainText('fresh');

    await collabLab.showBook();
    await collabLab.left.enter('1', 0, '7');

    await expect(collabLab.right.cell('1', 0)).toHaveText('7');
  });

  test('edits a workbook together', async ({ collabLab }) => {
    await collabLab.showBook();

    await collabLab.left.enter('1', 0, '2');
    await expect(collabLab.right.cell('1', 0)).toHaveText('2');

    await collabLab.right.enter('1', 1, '=A1*3');

    await expect(collabLab.left.cell('1', 1)).toHaveText('6');
  });

  test('moves an offline value past a row inserted by the other pane', async ({ collabLab }) => {
    await collabLab.showBook();

    await collabLab.left.cutLink();
    await collabLab.left.enter('3', 0, 'mine');
    await collabLab.right.insertRowAbove('1', 0);
    await expect(collabLab.right.cell('4', 0)).toHaveText('');

    await collabLab.left.restoreLink();

    await expect(collabLab.left.cell('4', 0)).toHaveText('mine');
    await expect(collabLab.right.cell('4', 0)).toHaveText('mine');
  });

  for (const theme of THEMES) {
    test(`stays accessible in the ${theme} theme`, async ({ collabLab, page }) => {
      await collabLab.setTheme(theme);

      expect(await wcagViolationsOf(page)).toEqual([]);
    });
  }
});
