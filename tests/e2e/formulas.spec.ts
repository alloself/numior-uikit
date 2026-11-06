import { expect, test } from './fixtures';
import type { Theme } from './pages/playground';

const NBSP = ' ';

const today = (): string => {
  const now = new Date();

  return [now.getDate(), now.getMonth() + 1]
    .map((part) => String(part).padStart(2, '0'))
    .concat(String(now.getFullYear()))
    .join('.');
};

test.beforeEach(async ({ playground, formulas }) => {
  await playground.emulate({ reducedMotion: 'reduce' });
  await playground.open();
  await formulas.sheet.scrollIntoViewIfNeeded();
});

test.describe('formulas sheet', () => {
  test('computes the budget and recalculates what depends on an edited cell', async ({
    formulas,
  }) => {
    await expect(formulas.cell('2', 3)).toHaveText(`340${NBSP}000,00 ₽`);
    await expect(formulas.cell('2', 4)).toHaveText(`$3${NBSP}679,65`);
    await expect(formulas.cell('8', 3)).toHaveText(`784${NBSP}800,00 ₽`);
    await expect(formulas.cell('9', 3)).toHaveText(`156${NBSP}960,00 ₽`);
    await expect(formulas.cell('10', 3)).toHaveText('5');

    await expect(formulas.cell('12', 1)).toHaveText(
      'Ноутбуки, Мониторы, Кресла, Лицензии, Обучение',
    );

    await formulas.goTo('F2');

    await expect(formulas.cell('2', 5)).toHaveText('крупная');

    await formulas.cell('2', 3).click();

    await expect(formulas.formula).toHaveValue('=B2*C2');
    await expect(formulas.referenceFrames).toHaveCount(2);

    await formulas.enter('2', 1, '5');

    await expect(formulas.cell('2', 3)).toHaveText(`425${NBSP}000,00 ₽`);
    await expect(formulas.cell('8', 3)).toHaveText(`869${NBSP}800,00 ₽`);
    await expect(formulas.status).toContainText('Пересчитано формул');
  });

  test('spills an array, blocks it with a value and spills again once the value is gone', async ({
    formulas,
  }) => {
    await expect(formulas.cell('14', 1)).toHaveText('1');

    await formulas.goTo('F14');

    await expect(formulas.cell('14', 5)).toHaveText('25');

    await formulas.enter('14', 3, 'x');

    await expect(formulas.cell('14', 1)).toHaveText('#ПЕРЕНОС!');

    await formulas.clear('14', 3);

    await expect(formulas.cell('14', 3)).toHaveText('9');

    await formulas.goTo('F14');

    await expect(formulas.cell('14', 5)).toHaveText('25');
  });

  test('looks rates up on another sheet and follows their edits', async ({ formulas }) => {
    await formulas.chooseSheet('Курсы');
    await expect(formulas.cell('2', 1)).toHaveText('92,4');

    await formulas.enter('2', 1, '100');
    await formulas.chooseSheet('Бюджет');

    await expect(formulas.cell('2', 4)).toHaveText(`$3${NBSP}400,00`);
  });

  test('shows dates and percents through their formats', async ({ formulas }) => {
    await expect(formulas.cell('16', 1)).toHaveText(today());
    await expect(formulas.cell('18', 1)).toHaveText('43,3%');
    await expect(formulas.cell('19', 1)).toHaveText(`-36${NBSP}943,26 ₽`);
  });

  test('inserts and deletes rows from the cell menu and formats the selection', async ({
    formulas,
  }) => {
    await formulas.cellMenu('3', 0, 'Вставить 1 строку выше');

    await expect(formulas.cell('4', 0)).toHaveText('Мониторы');
    await expect(formulas.cell('3', 0)).toHaveText('');
    await expect(formulas.cell('9', 3)).toHaveText(`784${NBSP}800,00 ₽`);

    await formulas.cellMenu('3', 0, 'Удалить 1 строку');

    await expect(formulas.cell('3', 0)).toHaveText('Мониторы');
    await expect(formulas.cell('8', 3)).toHaveText(`784${NBSP}800,00 ₽`);

    await formulas.cell('2', 1).click();

    await expect(formulas.format).toContainText('Общий');

    await formulas.chooseFormat('Процентный');

    await expect(formulas.cell('2', 1)).toHaveText('400,00%');
  });

  test('switches the book locale for numbers and formulas', async ({ formulas }) => {
    await formulas.cell('2', 4).click();

    await expect(formulas.formula).toHaveValue('=ОКРУГЛ(D2/ВПР("USD";Курсы!$A$2:$B$4;2;ЛОЖЬ);2)');

    await formulas.switchLocale('EN');
    await formulas.cell('2', 4).click();

    await expect(formulas.formula).toHaveValue(
      '=ROUND(D2/VLOOKUP("USD",Курсы!$A$2:$B$4,2,FALSE),2)',
    );

    await expect(formulas.cell('2', 3)).toHaveText('340,000.00 ₽');
  });

  test('answers #ИМЯ? for an unknown function and names it in the status', async ({ formulas }) => {
    await formulas.enterAt('H2', '=FOO(1)');

    await expect(formulas.cell('2', 7)).toHaveText('#ИМЯ?');
    await expect(formulas.status).toContainText('неизвестные функции: FOO');
  });

  test('enters twenty thousand rows of running totals in chunks and reports the time', async ({
    formulas,
  }) => {
    await formulas.load.click();

    await expect(formulas.status).toContainText('Введено ячеек: 60000', { timeout: 30_000 });
    await expect(formulas.status).toContainText('самый длинный кусок');
    await expect(formulas.sheetTab('Нагрузка')).toHaveAttribute('aria-selected', 'true');
    await expect(formulas.cell('3', 2)).toHaveText('12');
    await expect(formulas.load).toBeDisabled();
  });

  for (const theme of ['light', 'dark'] satisfies readonly Theme[]) {
    test(`passes axe in the ${theme} theme`, async ({ playground, formulas }) => {
      await playground.setTheme(theme);
      await formulas.cell('2', 3).click();

      expect(await playground.wcagViolations('section[aria-labelledby="formulas-title"]')).toEqual(
        [],
      );
    });
  }
});
