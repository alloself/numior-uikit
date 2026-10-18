import { expect, test, type Page } from '@playwright/test';
import { PlaygroundPage, type Theme } from './pages/playground';

const SECTION = 'section[aria-labelledby="formulas-title"]';

const openFormulas = async (page: Page) => {
  const playground = new PlaygroundPage(page);

  await playground.emulate({ reducedMotion: 'reduce' });
  await playground.open();
  await playground.formulas.show();
  return playground;
};

test.describe('formulas on the calc core', () => {
  test('computes the budget and recalculates what depends on an edited cell', async ({ page }) => {
    const { formulas } = await openFormulas(page);

    expect(await formulas.texts(1, 3, 5)).toEqual(['340000', '3679.65', 'крупная']);
    expect(await formulas.textAt(7, 3)).toBe('784800');
    expect(await formulas.textAt(8, 3)).toBe('156960');
    expect(await formulas.textAt(9, 3)).toBe('5');

    await expect(await formulas.reveal(11, 1)).toHaveText(
      'Ноутбуки, Мониторы, Кресла, Лицензии, Обучение',
    );

    await (await formulas.reveal(1, 3)).click();
    await expect(formulas.formula).toHaveValue('=B2*C2');
    await formulas.enter(1, 1, '5');

    await expect(await formulas.reveal(1, 3)).toHaveText('425000');
    await expect(await formulas.reveal(7, 3)).toHaveText('869800');
    await expect(formulas.status).toContainText('Пересчитано формул');
  });

  test('spills an array, blocks it with a value and spills again once the value is gone', async ({
    page,
  }) => {
    const { formulas } = await openFormulas(page);

    expect(await formulas.texts(13, 1, 5)).toEqual(['1', '4', '9', '16', '25']);
    await formulas.enter(13, 3, 'x');
    await expect(await formulas.reveal(13, 1)).toHaveText('#SPILL!');
    await expect(await formulas.reveal(13, 2)).toHaveText('');

    await formulas.clear(13, 3);
    await expect(await formulas.reveal(13, 3)).toHaveText('9');
    expect(await formulas.texts(13, 1, 5)).toEqual(['1', '4', '9', '16', '25']);
  });

  test('looks rates up on another sheet and follows their edits', async ({ page }) => {
    const { formulas } = await openFormulas(page);

    await formulas.openSheet('Курсы');
    await expect(formulas.cell(1, 1)).toHaveText('92.4');
    await formulas.enter(1, 1, '100');
    await formulas.openSheet('Бюджет');

    await expect(await formulas.reveal(1, 4)).toHaveText('3400');
  });

  test('answers #NAME? for an unknown function and names it in the status', async ({ page }) => {
    const { formulas } = await openFormulas(page);

    await formulas.enter(1, 7, '=FOO(1)');

    await expect(await formulas.reveal(1, 7)).toHaveText('#NAME?');
    await expect(formulas.status).toContainText('неизвестные функции: FOO');
  });

  test('recalculates twenty thousand rows of running totals in chunks', async ({ page }) => {
    const { formulas } = await openFormulas(page);

    await formulas.load.click();

    await expect(formulas.sheets.getByRole('radio', { name: 'Нагрузка' })).toBeChecked();
    await expect(formulas.status).toContainText('Пересчитано формул: 40001', { timeout: 30_000 });
    await expect(formulas.cell(2, 2)).toHaveText('12');
    await expect(formulas.load).toBeDisabled();
  });

  for (const theme of ['light', 'dark'] satisfies readonly Theme[]) {
    test(`passes axe with the sheet open in the ${theme} theme`, async ({ page }) => {
      test.slow();
      const playground = await openFormulas(page);

      await playground.setTheme(theme);
      await (await playground.formulas.reveal(1, 3)).click();

      expect(await playground.wcagViolations(SECTION)).toEqual([]);
    });
  }
});
