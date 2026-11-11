import { expect, test } from '../fixtures';
import { expectRgb } from '../helpers/color';
import { boxOf } from '../helpers/geometry';

test('the sidebar navigates, marks the current page and the contents follow the scroll', async ({
  docs,
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'the sidebar lives in a drawer on phones');
  await docs.open('/components/button');
  await expect(docs.heading).toHaveText('Button');
  await expect(docs.currentSidebarLink).toHaveText('Button');

  await docs.sidebarLink('Select').click();
  await expect(page).toHaveURL(/\/components\/select$/);
  await expect(docs.heading).toHaveText('Select');
  await expect(docs.currentSidebarLink).toHaveText('Select');

  await docs.scrollTo('api');
  await expect(docs.currentTocLink).toHaveText('API');
});

test('header sections switch the sidebar and mark the current section', async ({
  docs,
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'the sidebar lives in a drawer on phones');
  await docs.open('/components/button');
  await expect(docs.navLink('Компоненты')).toHaveAttribute('aria-current', 'page');
  await expect(docs.sidebarLink('Начало работы')).toHaveCount(0);

  await docs.navLink('Документация').click();
  await expect(page).toHaveURL(/\/guide\/getting-started$/);
  await expect(docs.navLink('Документация')).toHaveAttribute('aria-current', 'page');
  await expect(docs.sidebarLink('Темы оформления')).toBeVisible();
  await expect(docs.sidebarLink('Button')).toHaveCount(0);

  await docs.sidebarLink('useToast').click();
  await expect(page).toHaveURL(/\/composables\/toast$/);
  await expect(docs.navLink('Документация')).toHaveAttribute('aria-current', 'page');
  await expect(docs.sidebarLink('Темы оформления')).toBeVisible();

  await docs.open('/');
  await expect(docs.sidebar).toHaveCount(0);
});

test('a focused field shows its frame without an outer ring and a button keeps the ring', async ({
  docs,
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'focus rings follow the keyboard');
  await docs.open('/components/input');
  await docs.inputFrame.getByRole('textbox').focus();
  await expect(docs.inputFrame).toHaveCSS('outline-width', '0px');

  await page.keyboard.press('Tab');
  await docs.searchButton.focus();
  await expect(docs.searchButton).toHaveCSS('outline-width', '2px');
});

test('an example leaves the site theme for the base one and the guide shows the theme file', async ({
  docs,
  page,
}) => {
  await docs.open('/guide/custom-theme');
  const example = docs.example();

  await expect(example.preview).not.toHaveAttribute('data-nui-accent');
  expect(await example.radiusOf('Подтвердить заказ')).toBe('4px');

  await example.baseTheme.click();
  await expect(example.preview).toHaveAttribute('data-nui-accent', 'indigo');
  expect(await example.radiusOf('Подтвердить заказ')).toBe('8px');

  await example.baseTheme.click();
  expect(await example.radiusOf('Подтвердить заказ')).toBe('4px');

  await expect(
    page.getByText('--nui-primary: light-dark(#b04010, #e0561a);').last(),
  ).toBeAttached();
});

test('a missing address offers the search and the page with a similar address', async ({
  docs,
  page,
}) => {
  await docs.open('/components/buton');
  await expect(docs.article).toContainText('Страница не найдена');
  expect(await docs.wcagViolations()).toEqual([]);

  await docs.article.getByRole('button', { name: 'Открыть поиск' }).click();
  await expect(docs.commandInput).toBeFocused();

  await page.keyboard.press('Escape');
  await docs.similarPage('Button').click();
  await expect(page).toHaveURL(/\/components\/button$/);
});

test('the footer closes a page with the license and the sections of the site', async ({
  docs,
  page,
}) => {
  await docs.open('/components/kbd');
  await expect(docs.footer).toContainText('Распространяется по лицензии MIT.');

  await docs.footerLink('Документация').click();
  await expect(page).toHaveURL(/\/guide\/getting-started$/);
  await expect(docs.footer).toBeAttached();
});

test('the contents stay in place when the footer scrolls into view', async ({ docs, isMobile }) => {
  test.skip(isMobile, 'phones have no contents column');
  await docs.open('/blocks/');
  const top = await docs.tocTop();

  await docs.scrollToEnd();

  await expect(docs.footer).toBeInViewport({ ratio: 1 });
  expect(await docs.tocTop()).toBe(top);
});

test('the sidebar scrolls to the page that is open', async ({ docs, isMobile }) => {
  test.skip(isMobile, 'the sidebar lives in a drawer on phones');
  await docs.open('/composables/block-size-tween');

  await expect(docs.sidebarLink('useBlockSizeTween')).toBeInViewport({ ratio: 1 });
});

test('the theme menu switches the scheme and the choice survives a reload', async ({
  docs,
  page,
}) => {
  await docs.open('/components/button');
  await docs.pickTheme('Тёмная');
  expect(await docs.scheme()).toBe('dark');

  await page.reload();
  expect(await docs.scheme()).toBe('dark');

  await docs.pickTheme('Светлая');
  expect(await docs.scheme()).toBe('light');
});

test('the language menu opens the same page in English', async ({ docs, page }) => {
  await docs.open('/components/button');
  await docs.pickLanguage('English');
  await expect(page).toHaveURL(/\/en\/components\/button$/);
  await expect(docs.heading).toHaveText('Button');
  await expect(docs.searchButton).toHaveAccessibleName(/Search/);
});

test('search finds a page by text and opens it', async ({ docs, page, isMobile }) => {
  await docs.open('/guide/getting-started');
  const before = await boxOf(docs.heading);

  if (isMobile) {
    await docs.searchButton.tap();
  } else {
    await docs.pressSearchHotkeyOnRussianLayout();
  }

  await expect(docs.commandInput).toBeFocused();
  expect((await boxOf(docs.heading)).x).toBe(before.x);
  await expect(docs.commandOptions.first()).toBeVisible();
  expect(await docs.commandLeadingStart()).toBeCloseTo(await docs.commandGroupTextStart(), 0);

  await docs.commandInput.fill('Button');
  await expect(docs.commandOptions.first()).toContainText('Button');

  await docs.commandOptions.first().click();
  await expect(page).toHaveURL(/\/components\/button/);
  await expect(docs.commandDialog).toBeHidden();
});

test('search lists every page once by section and marks the found words in a snippet', async ({
  docs,
}) => {
  await docs.open('/components/kbd');
  await docs.searchButton.click();
  await expect(docs.commandGroups).toHaveText(['Документация', 'Компоненты', 'Темы']);
  await expect(docs.commandOption('Начало работы')).toHaveCount(1);

  await docs.commandInput.fill('индикатор загрузки');
  await expect(docs.commandGroups.first()).toHaveText('Компоненты');
  await expect(docs.commandMarks.first()).toHaveText(/индикатор|загруз/i);
});

test('the sidebar lives in a drawer on phones and closes after navigation', async ({
  docs,
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'phones only');
  await docs.open('/components/button');
  await expect(docs.sidebar).toBeHidden();

  await docs.trigger.tap();
  await expect(docs.drawer).toBeVisible();

  await docs.drawerLink('Select').tap();
  await expect(page).toHaveURL(/\/components\/select$/);
  await expect(docs.drawer).toBeHidden();
});

test('the skip link moves focus to the content', async ({ docs, page, isMobile }) => {
  test.skip(isMobile, 'keyboard only');
  await docs.open('/components/button');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'К содержимому' })).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(docs.main).toBeFocused();
});

test('code tabs switch the package manager and keep the pick after a reload', async ({ docs }) => {
  await docs.open('/guide/getting-started');
  await expect(docs.codeVariant('pnpm')).toHaveAttribute('aria-selected', 'true');
  await expect(docs.shownVariant).toHaveText('pnpm add @numior/vue @numior/tokens');

  await docs.codeVariant('npm').click();
  await expect(docs.shownVariant).toHaveText('npm install @numior/vue @numior/tokens');

  await docs.open('/guide/getting-started');
  await expect(docs.codeVariant('npm')).toHaveAttribute('aria-selected', 'true');
  await expect(docs.shownVariant).toHaveText('npm install @numior/vue @numior/tokens');
});

test('the tokens page shows a colour of the base theme in both schemes whatever the site theme', async ({
  docs,
}) => {
  await docs.open('/theme/tokens', 'dark');
  await expect(docs.heading).toHaveText('Токены');
  await expect(docs.tokenRow('--nui-primary')).toContainText('oklch(0.457 0.215 277.02)');

  await expectRgb(docs.tokenSwatches('--nui-surface').nth(0), 'background-color', [255, 255, 255]);
  await expectRgb(docs.tokenSwatches('--nui-surface').nth(1), 'background-color', [24, 24, 27]);
});

test('the icon page finds an icon by its Lucide name and copies the name components use', async ({
  docs,
}) => {
  await docs.stubClipboard();
  await docs.open('/components/icon');
  await expect(docs.iconRows.first()).toContainText('check');

  await docs.iconSearch.fill('triangle');
  await expect(docs.iconRows).toHaveCount(1);
  await expect(docs.iconRows.first()).toContainText('warning');

  await docs.copyIconName('warning').click();
  await expect.poll(() => docs.copiedTexts()).toEqual(['warning']);
});
