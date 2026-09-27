import { expect, test } from '@playwright/test';
import { DocsSite } from '../pages/docs';

test('the sidebar navigates, marks the current page and the contents follow the scroll', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'the sidebar lives in a drawer on phones');
  const docs = new DocsSite(page);
  await docs.open('/components/button');
  await expect(docs.heading).toHaveText('Кнопка');
  await expect(docs.currentSidebarLink).toHaveText('Кнопка');
  await docs.sidebarLink('Выбор из списка').click();
  await expect(page).toHaveURL(/\/components\/select$/);
  await expect(docs.heading).toHaveText('Выбор из списка');
  await expect(docs.currentSidebarLink).toHaveText('Выбор из списка');
  await docs.scrollTo('api');
  await expect(docs.currentTocLink).toHaveText('API');
});

test('header sections switch the sidebar and mark the current section', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'the sidebar lives in a drawer on phones');
  const docs = new DocsSite(page);
  await docs.open('/components/button');
  await expect(docs.navLink('Компоненты')).toHaveAttribute('aria-current', 'page');
  await expect(docs.sidebarLink('Начало работы')).toHaveCount(0);
  await docs.navLink('Руководство').click();
  await expect(page).toHaveURL(/\/guide\/getting-started$/);
  await expect(docs.navLink('Руководство')).toHaveAttribute('aria-current', 'page');
  await expect(docs.sidebarLink('Темизация')).toBeVisible();
  await expect(docs.sidebarLink('Кнопка')).toHaveCount(0);
  await docs.open('/');
  await expect(docs.sidebar).toHaveCount(0);
});

test('the theme menu switches the scheme and the choice survives a reload', async ({ page }) => {
  const docs = new DocsSite(page);
  await docs.open('/components/button');
  await docs.pickTheme('Тёмная');
  expect(await docs.scheme()).toBe('dark');
  await page.reload();
  expect(await docs.scheme()).toBe('dark');
  await docs.pickTheme('Светлая');
  expect(await docs.scheme()).toBe('light');
});

test('the language menu opens the same page in English', async ({ page }) => {
  const docs = new DocsSite(page);
  await docs.open('/components/button');
  await docs.pickLanguage('English');
  await expect(page).toHaveURL(/\/en\/components\/button$/);
  await expect(docs.heading).toHaveText('Button');
  await expect(docs.searchButton).toHaveAccessibleName(/Search/);
});

test('search finds a page by text and opens it', async ({ page, isMobile }) => {
  const docs = new DocsSite(page);
  await docs.open('/guide/getting-started');
  if (isMobile) {
    await docs.searchButton.tap();
  } else {
    await page.keyboard.press('Control+k');
  }
  await expect(docs.commandInput).toBeFocused();
  await docs.commandInput.fill('кнопка');
  await expect(docs.commandOptions.first()).toContainText('Кнопка');
  await docs.commandOptions.first().click();
  await expect(page).toHaveURL(/\/components\/button/);
  await expect(docs.commandDialog).toBeHidden();
});

test('the sidebar lives in a drawer on phones and closes after navigation', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'phones only');
  const docs = new DocsSite(page);
  await docs.open('/components/button');
  await expect(docs.sidebar).toBeHidden();
  await docs.trigger.tap();
  await expect(docs.drawer).toBeVisible();
  await docs.drawerLink('Выбор из списка').tap();
  await expect(page).toHaveURL(/\/components\/select$/);
  await expect(docs.drawer).toBeHidden();
});

test('the skip link moves focus to the content', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard only');
  const docs = new DocsSite(page);
  await docs.open('/components/button');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'К содержимому' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(docs.article).toBeFocused();
});
