import { expect, test } from '@playwright/test';
import { DocsSite } from '../pages/docs';

test('the home page shows a live mosaic, copies the install line and leads to the guide', async ({
  page,
}) => {
  const docs = new DocsSite(page);
  await docs.stubClipboard();
  await docs.open('/');
  const home = docs.home();
  await expect(home.title).toHaveText('Компоненты Vue, которые уже собраны');
  await expect(docs.sidebar).toHaveCount(0);
  await expect(home.nameInput).toBeVisible();
  await home.nameInput.fill('Каталог');
  await expect(home.nameInput).toHaveValue('Каталог');
  await expect(home.period('Месяц')).toHaveAttribute('aria-checked', 'true');
  await home.period('Год').click();
  await expect(home.period('Год')).toHaveAttribute('aria-checked', 'true');
  await expect(home.facts.getByText(/^\d+$/)).toBeVisible();
  await home.copyInstall.click();

  await expect
    .poll(async () => (await docs.copiedTexts()).at(-1))
    .toBe('pnpm add @numior/vue @numior/tokens');

  await home.start.click();
  await expect(page).toHaveURL(/\/guide\/getting-started$/);
});
