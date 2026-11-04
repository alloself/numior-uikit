import { expect, test } from './fixtures';
import type { Theme } from './pages/playground';

const SECTION = 'section[aria-labelledby="formulas-title"]';

const NBSP = '\u00a0';

const today = (): string => {
  const now = new Date();

  return [now.getDate(), now.getMonth() + 1]
    .map((part) => String(part).padStart(2, '0'))
    .concat(String(now.getFullYear()))
    .join('.');
};

test.beforeEach(async ({ playground }) => {
  await playground.emulate({ reducedMotion: 'reduce' });
  await playground.open();
  await playground.formulas.show();
});

test.describe('formulas on the calc core', () => {
  test('computes the budget and recalculates what depends on an edited cell', async ({
    formulas,
  }) => {
    expect(await formulas.texts(1, 3, 5)).toEqual([
      `340${NBSP}000,00 ₽`,
      `$3${NBSP}679,65`,
      'крупная',
    ]);

    expect(await formulas.textAt(7, 3)).toBe(`784${NBSP}800,00 ₽`);
    expect(await formulas.textAt(8, 3)).toBe(`156${NBSP}960,00 ₽`);
    expect(await formulas.textAt(9, 3)).toBe('5');

    await expect(await formulas.reveal(11, 1)).toHaveText(
      'Ноутбуки, Мониторы, Кресла, Лицензии, Обучение',
    );

    await (await formulas.reveal(1, 3)).click();
    await expect(formulas.formula).toHaveValue('=B2*C2');

    await formulas.enter(1, 1, '5');

    await expect(await formulas.reveal(1, 3)).toHaveText(`425${NBSP}000,00 ₽`);
    await expect(await formulas.reveal(7, 3)).toHaveText(`869${NBSP}800,00 ₽`);
    await expect(formulas.status).toContainText('Пересчитано формул');
  });

  test('spills an array, blocks it with a value and spills again once the value is gone', async ({
    formulas,
  }) => {
    expect(await formulas.texts(13, 1, 5)).toEqual(['1', '4', '9', '16', '25']);

    await formulas.enter(13, 3, 'x');
    await expect(await formulas.reveal(13, 1)).toHaveText('#ПЕРЕНОС!');
    await expect(await formulas.reveal(13, 2)).toHaveText('');

    await formulas.clear(13, 3);
    await expect(await formulas.reveal(13, 3)).toHaveText('9');
    expect(await formulas.texts(13, 1, 5)).toEqual(['1', '4', '9', '16', '25']);
  });

  test('looks rates up on another sheet and follows their edits', async ({ formulas }) => {
    await formulas.openSheet('Курсы');
    await expect(formulas.cell(1, 1)).toHaveText('92,4');

    await formulas.enter(1, 1, '100');
    await formulas.openSheet('Бюджет');

    await expect(await formulas.reveal(1, 4)).toHaveText(`$3${NBSP}400,00`);
  });

  test('shows dates, percents and money through their formats and reads typed dates', async ({
    formulas,
  }) => {
    await expect(await formulas.reveal(15, 1)).toHaveText(today());
    await expect(await formulas.reveal(17, 1)).toHaveText('43,3%');
    await expect(await formulas.reveal(18, 1)).toHaveText(`-36${NBSP}943,26 ₽`);

    await formulas.enter(1, 6, '01.02.2026');
    await formulas.enter(2, 6, '12,5%');

    await expect(await formulas.reveal(1, 6)).toHaveText('01.02.2026');
    await expect(await formulas.reveal(2, 6)).toHaveText('12,50%');

    await (await formulas.reveal(2, 6)).click();
    await expect(formulas.formula).toHaveValue('12,5%');
  });

  test('formats the selected cells from the format list', async ({ formulas }) => {
    await (await formulas.reveal(1, 1)).click();
    await formulas.chooseFormat('Числовой');

    await expect(await formulas.reveal(1, 1)).toHaveText('4,00');

    await formulas.chooseFormat('Процентный');

    await expect(await formulas.reveal(1, 1)).toHaveText('400,00%');
    await expect(formulas.formula).toHaveValue('400%');
  });

  test('switches the book locale for numbers and formulas', async ({ formulas }) => {
    await (await formulas.reveal(1, 4)).click();

    await expect(formulas.formula).toHaveValue('=ОКРУГЛ(D2/ВПР("USD";Курсы!$A$2:$B$4;2;ЛОЖЬ);2)');

    await formulas.switchLocale('EN');

    await expect(formulas.formula).toHaveValue(
      '=ROUND(D2/VLOOKUP("USD",Курсы!$A$2:$B$4,2,FALSE),2)',
    );

    await expect(await formulas.reveal(1, 3)).toHaveText('340,000.00 ₽');
    await expect(await formulas.reveal(1, 4)).toHaveText('$3,679.65');
  });

  test('inserts and deletes rows from the context menu with references following them', async ({
    formulas,
  }) => {
    await formulas.fromMenu(1, 1, 'Вставить строки выше');

    await expect(await formulas.reveal(1, 1)).toHaveText('');
    await expect(await formulas.reveal(2, 1)).toHaveText('4');
    await expect(await formulas.reveal(8, 3)).toHaveText(`784${NBSP}800,00 ₽`);

    await (await formulas.reveal(8, 3)).click();
    await expect(formulas.formula).toHaveValue('=СУММ(D3:D7)');

    await formulas.fromMenu(2, 1, 'Удалить строки');

    await expect(await formulas.reveal(7, 3)).toHaveText(`444${NBSP}800,00 ₽`);

    await (await formulas.reveal(7, 3)).click();
    await expect(formulas.formula).toHaveValue('=СУММ(D3:D6)');
  });

  test('undoes and redoes edits and row insertions with the keyboard', async ({ formulas }) => {
    await formulas.enter(1, 1, '5');
    await expect(await formulas.reveal(1, 3)).toHaveText(`425${NBSP}000,00 ₽`);

    await formulas.press(1, 3, 'ControlOrMeta+z');
    await expect(await formulas.reveal(1, 3)).toHaveText(`340${NBSP}000,00 ₽`);

    await formulas.press(1, 3, 'ControlOrMeta+y');
    await expect(await formulas.reveal(1, 3)).toHaveText(`425${NBSP}000,00 ₽`);

    await formulas.fromMenu(0, 0, 'Вставить строки выше');
    await expect(await formulas.reveal(8, 3)).toHaveText(`869${NBSP}800,00 ₽`);

    await formulas.press(0, 0, 'ControlOrMeta+z');
    await expect(await formulas.reveal(7, 3)).toHaveText(`869${NBSP}800,00 ₽`);
    await expect(await formulas.reveal(0, 0)).toHaveText('Статья');
  });

  test('answers #ИМЯ? for an unknown function and names it in the status', async ({ formulas }) => {
    await formulas.enter(1, 7, '=FOO(1)');

    await expect(await formulas.reveal(1, 7)).toHaveText('#ИМЯ?');
    await expect(formulas.status).toContainText('неизвестные функции: FOO');
  });

  test('recalculates twenty thousand rows of running totals in chunks', async ({ formulas }) => {
    await formulas.load.click();

    await expect(formulas.sheets.getByRole('radio', { name: 'Нагрузка' })).toBeChecked();
    await expect(formulas.status).toContainText('Пересчитано формул: 40003', { timeout: 30_000 });
    await expect(formulas.cell(2, 2)).toHaveText('12');
    await expect(formulas.load).toBeDisabled();
  });

  for (const theme of ['light', 'dark'] satisfies readonly Theme[]) {
    test(`passes axe with the sheet open in the ${theme} theme`, async ({ playground }) => {
      test.slow();
      await playground.setTheme(theme);
      await (await playground.formulas.reveal(1, 3)).click();

      expect(await playground.wcagViolations(SECTION)).toEqual([]);
    });
  }
});
