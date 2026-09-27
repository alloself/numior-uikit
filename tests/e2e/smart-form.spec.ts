import { expect, test, type Page } from '@playwright/test';
import { PlaygroundPage } from './pages/playground';
import { boxOf } from './helpers/geometry';

const openSmartForm = async (page: Page): Promise<PlaygroundPage> => {
  const playground = new PlaygroundPage(page);

  await playground.emulate({ reducedMotion: 'reduce' });
  await playground.open();
  await playground.setTheme('light');
  return playground;
};

test.describe('smart form', () => {
  test('conditional fields come and go inside their section: the fields below slide, the fields above stay', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    await playground.setTheme('light');
    const { smartForm } = playground;
    await smartForm.slowDownMotion();

    const shown = await smartForm.switchKindWatchingLayout('Компания');
    expect(shown.after).toBeGreaterThan(shown.before + 20);
    expect(shown.slid).toBe(true);
    expect(shown.faded).toBe(true);
    expect(shown.drift).toBeLessThan(1);
    expect(shown.spill).toBeLessThan(1);
    expect(shown.companyAfter).toBe(true);

    const hidden = await smartForm.switchKindWatchingLayout('Частное лицо');
    expect(hidden.after).toBeLessThan(hidden.before - 20);
    expect(hidden.slid).toBe(true);
    expect(hidden.faded).toBe(true);
    expect(hidden.drift).toBeLessThan(1);
    expect(hidden.spill).toBeLessThan(1);
    expect(hidden.companyAfter).toBe(false);
  });

  test('a company reveals its fields, and a person is saved without them while their values stay', async ({
    page,
  }) => {
    const { smartForm } = await openSmartForm(page);
    await smartForm.fillRequired();
    await expect(smartForm.control('company')).toHaveCount(0);
    await smartForm.kind('Компания').check();
    await smartForm.control('company').fill('Numior');
    await smartForm.control('vat').fill('1234567890');
    await smartForm.kind('Частное лицо').check();
    await expect(smartForm.control('company')).toHaveCount(0);
    await smartForm.save.click();
    await expect.poll(async () => (await smartForm.readOutput()).profile?.kind).toBe('person');
    const { profile } = await smartForm.readOutput();
    expect(profile).not.toHaveProperty('company');
    expect(profile).not.toHaveProperty('vat');
    await smartForm.kind('Компания').check();
    await expect(smartForm.control('company')).toHaveValue('Numior');
  });

  test('the layout pairs cells on wide screens, stacks them on phones and gives the rest the full width', async ({
    page,
    isMobile,
  }) => {
    const { smartForm } = await openSmartForm(page);
    const name = await boxOf(smartForm.control('name'));
    const email = await boxOf(smartForm.control('email'));
    const about = await boxOf(smartForm.control('about'));
    const form = await boxOf(smartForm.profile);
    if (isMobile) {
      expect(email.y).toBeGreaterThan(name.y + name.height);
    } else {
      expect(email.y).toBeCloseTo(name.y, 0);
      expect(email.x).toBeGreaterThan(name.x + name.width);
    }
    expect(about.width).toBeGreaterThan(form.width * 0.9);
    const profile = smartForm.section('Профиль');
    const address = smartForm.section('Адрес');
    const divider = await boxOf(profile);
    const legend = await boxOf(smartForm.legendOf(address));
    await expect(profile).toHaveCSS('border-bottom-style', 'solid');
    await expect(address).toHaveCSS('border-top-style', 'none');
    expect(legend.y).toBeGreaterThan(divider.y + divider.height);
  });

  test('contacts grow to the limit, keep the last row and move by keyboard with announcements', async ({
    page,
  }) => {
    const { smartForm } = await openSmartForm(page);
    await expect(smartForm.contacts).toHaveCount(1);
    await expect(smartForm.remove(1)).toHaveCount(0);
    await expect(smartForm.grip(1)).toBeHidden();
    await smartForm.control('contacts.0.name').fill('Вера');
    await smartForm.addContact.click();
    await expect(smartForm.control('contacts.1.name')).toBeFocused();
    await page.keyboard.type('Анна');
    await smartForm.addContact.click();
    await expect(smartForm.control('contacts.2.name')).toBeFocused();
    await page.keyboard.type('Борис');
    await expect(smartForm.addContact).toBeDisabled();
    await expect(smartForm.limit).toHaveText('Достигнут предел строк: 3');
    const name = await boxOf(smartForm.control('contacts.1.name').locator('..'));
    const remove = await boxOf(smartForm.remove(2));
    expect(remove.height).toBeCloseTo(name.height, 0);
    expect(remove.y).toBeCloseTo(name.y, 0);
    await smartForm.grip(2).focus();
    await page.keyboard.press('Space');
    await expect(smartForm.live).toContainText('Строка 2 захвачена, позиция 2 из 3.');
    await page.keyboard.press('ArrowDown');
    await expect(smartForm.live).toHaveText('Строка 2, позиция 3 из 3.');
    await page.keyboard.press('Space');
    await expect(smartForm.live).toHaveText('Строка 2 перемещена на позицию 3 из 3.');
    await expect.poll(() => smartForm.names()).toEqual(['Вера', 'Борис', 'Анна']);
    await expect(smartForm.grip(3)).toBeFocused();
    await smartForm.remove(1).click();
    await expect.poll(() => smartForm.names()).toEqual(['Борис', 'Анна']);
    await expect(smartForm.addContact).toBeEnabled();
  });

  test('dragging a grip moves a contact with a ghost under the pointer', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'pointer dragging is covered on desktop');
    const { smartForm } = await openSmartForm(page);
    await smartForm.control('contacts.0.name').fill('Вера');
    await smartForm.addContact.click();
    await smartForm.control('contacts.1.name').fill('Анна');
    await smartForm.addContact.click();
    await smartForm.control('contacts.2.name').fill('Борис');
    await smartForm.dragContact(1, 2);
    await expect(smartForm.ghost).toHaveText('Строка 1');
    await smartForm.drop();
    await expect.poll(() => smartForm.names()).toEqual(['Анна', 'Вера', 'Борис']);
    await expect(smartForm.ghost).toHaveCount(0);
  });

  test('the about counter follows the text and the newsletter is saved with the profile', async ({
    page,
  }) => {
    const { smartForm } = await openSmartForm(page);
    await smartForm.fillRequired();
    await smartForm.control('about').fill('Люблю формы');
    await expect(smartForm.counter).toHaveText('11 / 280');
    await smartForm.newsletter.check();
    await smartForm.save.click();
    await expect.poll(async () => (await smartForm.readOutput()).profile?.newsletter).toBe(true);
    expect((await smartForm.readOutput()).profile?.about).toBe('Люблю формы');
  });

  test('the inline filter applies on Enter and keeps its button next to the fields', async ({
    page,
    isMobile,
  }) => {
    const playground = await openSmartForm(page);
    const { smartForm } = playground;
    await smartForm.search.fill('анна');
    await smartForm.search.press('Enter');
    await expect.poll(async () => (await smartForm.readOutput()).filter.query).toBe('анна');
    await smartForm.status.click();
    await smartForm.option('Активные').click();
    await smartForm.find.click();
    await expect.poll(async () => (await smartForm.readOutput()).filter.status).toBe('active');
    const find = await boxOf(smartForm.find);
    const status = await boxOf(smartForm.status);
    if (isMobile) {
      expect(find.y - (status.y + status.height)).toBeLessThanOrEqual(24);
    } else {
      expect(Math.abs(find.y + find.height - (status.y + status.height))).toBeLessThanOrEqual(1);
    }
    expect(await playground.hasHorizontalOverflow()).toBe(false);
  });

  test('saving with errors focuses the first invalid field and passes axe in light and dark', async ({
    page,
  }) => {
    const playground = await openSmartForm(page);
    const { smartForm } = playground;
    await smartForm.kind('Компания').check();
    await smartForm.save.click();
    await expect(smartForm.control('name')).toBeFocused();
    await expect(smartForm.errorOf(smartForm.control('company'))).toHaveText('Заполните поле');

    await expect(smartForm.errorOf(smartForm.control('contacts.0.name'))).toHaveText(
      'Заполните поле',
    );

    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      expect(await playground.wcagViolations()).toEqual([]);
    }
  });

  test('in RTL the layout mirrors and nothing overflows', async ({ page, isMobile }) => {
    const playground = await openSmartForm(page);
    const { smartForm } = playground;
    await playground.setDirection('rtl');
    await smartForm.save.click();
    await expect(smartForm.errorOf(smartForm.control('name'))).toBeVisible();
    expect(await playground.hasHorizontalOverflow()).toBe(false);
    if (!isMobile) {
      const name = await boxOf(smartForm.control('name'));
      const email = await boxOf(smartForm.control('email'));
      expect(name.x).toBeGreaterThan(email.x + email.width);
    }
  });
});
