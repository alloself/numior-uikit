import { expect, test } from '../fixtures';
import { boxOf } from '../helpers/geometry';

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

  await docs.scrollFocusedRight();
  await docs.scrollFocusedRight();
  await expect.poll(() => docs.scrollLeftOf(docs.codeScroller)).toBeGreaterThan(0);
});

test('the command dialog example opens on Ctrl+J and Ctrl+K opens the docs search', async ({
  docs,
}) => {
  const palette = docs.article.getByRole('dialog');

  await docs.open('/components/command');
  await docs.openExamplePalette();
  await expect(palette.getByRole('option', { name: 'Новый заказ' })).toBeVisible();

  await docs.pressEscape();
  await expect(palette).toBeHidden();

  await docs.openSearchWithShortcut();
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

test('a menu opened with ArrowUp focuses its last item', async ({ docs }) => {
  await docs.open('/components/menu');
  await docs.article.getByRole('button', { name: 'Действия' }).first().focus();
  await docs.openMenuFromItsEnd();

  await expect(
    docs.article.getByRole('menuitem', { name: 'Отменить заказ' }).first(),
  ).toBeFocused();
});

test('a submenu with no room on either side stays on a phone screen', async ({ docs, page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await docs.open('/components/menu');
  await docs.article.getByRole('button', { name: 'Действия' }).first().click();
  await docs.article.getByRole('menuitem', { name: 'Отправить покупателю' }).first().click();

  const submenu = docs.article.getByRole('menu', { name: 'Отправить покупателю' }).first();

  await expect.poll(async () => (await boxOf(submenu)).x).toBeGreaterThanOrEqual(0);

  await expect
    .poll(async () => {
      const box = await boxOf(submenu);

      return box.x + box.width;
    })
    .toBeLessThanOrEqual(390);
});

test('a props table fits a phone screen with the type under the name', async ({ docs, page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await docs.open('/components/button');

  const props = docs.apiTable('Свойства');

  await props.scrollIntoViewIfNeeded();
  await expect.poll(() => docs.sidewaysOverflow(props)).toBe(0);

  await expect(props.getByRole('row').filter({ hasText: 'variant' }).first()).toContainText(
    'NuiButtonVariant',
  );
});

test('the action of a toast replaces its text in place', async ({ docs }) => {
  await docs.open('/components/toast');
  await docs.article.getByRole('button', { name: 'Ошибка с действием' }).click();
  await expect(docs.toasts).toHaveText([/Не удалось сохранить/]);

  await docs.toastAction('Повторить').click();
  await expect(docs.toasts).toHaveText([/Сохранено/]);

  await docs.movePointerAway();
  await expect(docs.toasts).toHaveCount(0, { timeout: 8000 });
});

for (const route of ['/components/input', '/components/textarea', '/components/number-field']) {
  test(`a disabled field on ${route} draws no text caret`, async ({ docs }) => {
    await docs.open(route);
    const configurator = docs.configurator();
    expect(await configurator.caretColor()).not.toBe('rgba(0, 0, 0, 0)');

    await configurator.enable('disabled');

    expect(await configurator.caretColor()).toBe('rgba(0, 0, 0, 0)');
  });
}
