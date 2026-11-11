import { expect, test } from '../fixtures';

test('a click on the calendar month or year opens the list of months or years', async ({
  docs,
}) => {
  await docs.open('/components/calendar');
  await docs.article.getByRole('button', { name: 'Выбрать месяц' }).first().click();

  await expect(
    docs.article.getByRole('group', { name: 'Выбрать месяц' }).getByRole('button'),
  ).toHaveCount(12);

  await docs.article.getByRole('button', { name: 'Выбрать год' }).first().click();
  await expect(docs.article.getByRole('group', { name: 'Выбрать год' })).toBeVisible();
});

test('the code area takes keyboard focus and scrolls with the arrow keys', async ({
  docs,
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await docs.open('/components/code');
  await docs.codeScroller.focus();
  await expect(docs.codeScroller).toBeFocused();
  expect(await docs.scrollLeftOf(docs.codeScroller)).toBe(0);

  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => docs.scrollLeftOf(docs.codeScroller)).toBeGreaterThan(0);
});

test('the command dialog example opens on Ctrl+J and Ctrl+K opens the docs search', async ({
  docs,
  page,
}) => {
  const palette = docs.article.getByRole('dialog');

  await docs.open('/components/command');
  await page.keyboard.press('Control+j');
  await expect(palette.getByRole('option', { name: 'Темизация' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(palette).toBeHidden();

  await page.keyboard.press('Control+k');
  await expect(docs.commandInput).toBeFocused();
  await expect(palette).toBeHidden();
});

test('an empty date field shows the date pattern of the page language', async ({ docs }) => {
  await docs.open('/components/date-picker');

  await expect(docs.article.getByRole('textbox', { name: 'Дата доставки' })).toHaveAttribute(
    'placeholder',
    'ДД.ММ.ГГГГ',
  );
});

test('a menu opened with ArrowUp focuses its last item', async ({ docs, page }) => {
  await docs.open('/components/menu');
  await docs.article.getByRole('button', { name: 'Файл' }).first().focus();
  await page.keyboard.press('ArrowUp');
  await expect(docs.article.getByRole('menuitem', { name: 'Удалить' }).first()).toBeFocused();
});

test('the action of a toast replaces its text in place', async ({ docs, page }) => {
  await docs.open('/components/toast');
  await docs.article.getByRole('button', { name: 'Ошибка с действием' }).click();
  await expect(docs.toasts).toHaveText([/Не удалось сохранить/]);

  await page.getByRole('button', { name: 'Повторить' }).click();
  await expect(docs.toasts).toHaveText([/Сохранено/]);

  await page.mouse.move(0, 0);
  await expect(docs.toasts).toHaveCount(0, { timeout: 8000 });
});
