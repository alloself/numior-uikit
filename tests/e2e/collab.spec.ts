import { expect, test } from './fixtures';
import { boxOf } from './helpers/geometry';
import { wcagViolationsOf } from './helpers/axe';

const ANNA = 'Анна';

const BORIS = 'Борис';

const CARET_TOLERANCE = 4;

const THEMES = ['light', 'dark'] as const;

test.describe('collaboration', () => {
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

      const violations = await wcagViolationsOf(anna.page);

      expect(violations).toEqual([]);
    });
  }
});
