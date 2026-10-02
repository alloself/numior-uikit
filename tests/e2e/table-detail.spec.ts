import { expect, test } from '@playwright/test';
import { boxOf } from './helpers/geometry';
import { PlaygroundPage } from './pages/playground';

test.describe('table detail rows', () => {
  test('opens a detail with a nested table from the chevron and keeps its clicks to itself', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tableDetail: detail } = playground;
    await detail.root.scrollIntoViewIfNeeded();

    await expect(detail.grid).toHaveRole('treegrid');
    await expect(detail.row(1)).toHaveAttribute('aria-expanded', 'false');
    await expect(detail.toggle(5)).toHaveCount(0);
    await detail.toggle(1).click();

    await expect(detail.row(1)).toHaveAttribute('aria-expanded', 'true');
    await expect(detail.row(2)).toHaveAttribute('aria-level', '2');
    await expect(detail.panel(2)).toBeVisible();
    await expect(detail.nestedCell(2, 0, 0)).toHaveText('Блендер');
    await expect(detail.cell(3, 1)).toHaveText('Зелёный дом');
    expect((await detail.readOutput()).expanded).toEqual([2]);
    await detail.nestedCell(2, 1, 0).click();
    await detail.openButton(2).click();

    await expect.poll(async () => (await detail.readOutput()).opened).toBe(2);
    expect((await detail.readOutput()).lastClick).toBeNull();
    await detail.toggle(1).click();
    await expect(detail.panel(2)).toHaveCount(0);
    await expect(detail.cell(2, 1)).toHaveText('Зелёный дом');
  });

  test('counts the measured detail in the scroll height of the row window', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tableDetail: detail } = playground;
    await detail.root.scrollIntoViewIfNeeded();
    const closed = await detail.scrollHeight();

    await detail.toggle(1).click();
    await expect(detail.panel(2)).toBeVisible();
    const { height } = await boxOf(detail.row(2));

    await expect
      .poll(async () => Math.abs((await detail.scrollHeight()) - closed - height))
      .toBeLessThanOrEqual(1);

    await detail.scrollTo(40_000);
    await expect(detail.panel(2)).toHaveCount(0);
    await detail.scrollTo(0);
    await expect(detail.nestedCell(2, 1, 0)).toHaveText('Весы');
    expect(Math.abs((await detail.scrollHeight()) - closed - height)).toBeLessThanOrEqual(1);
  });

  test('keeps the row under the header in place while details above it are measured', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tableDetail: detail } = playground;
    await detail.root.scrollIntoViewIfNeeded();

    await detail.scrollTo(40_000);
    await expect(detail.cell(1000, 0)).toHaveText('1001');
    await detail.openFirst.click();
    await detail.scrollTo(680);
    await expect(detail.panel(3)).toBeAttached();
    await expect.poll(async () => (await detail.topRow())?.text).toBe('6');
    expect(Math.abs((await detail.topRow())?.gap ?? 99)).toBeLessThanOrEqual(1);
  });

  test('walks into the detail and its nested table from the keyboard and back', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard scenario');
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tableDetail: detail } = playground;
    await detail.root.scrollIntoViewIfNeeded();

    await detail.cell(1, 0).focus();
    await page.keyboard.press('Enter');
    await expect(detail.panel(2)).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await expect(detail.cell(2, 0)).toBeFocused();
    await page.keyboard.press('Tab');

    await expect(detail.nestedCell(2, 0, 0)).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(detail.nestedCell(2, 1, 0)).toBeFocused();
    await expect(detail.cell(2, 0)).toHaveAttribute('tabindex', '0');
    await page.keyboard.press('Shift+Tab');

    await expect(detail.cell(2, 0)).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(detail.cell(3, 1)).toBeFocused();
  });

  test('keeps the detail inside the visible width while the table scrolls sideways', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'the columns overflow on a phone');
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tableDetail: detail } = playground;
    await detail.root.scrollIntoViewIfNeeded();

    await detail.toggle(1).tap();
    await expect(detail.panel(2)).toBeVisible();

    for (const direction of ['ltr', 'rtl'] as const) {
      await playground.setDirection(direction);
      await detail.scrollAcross();
      expect(await detail.scrolledAcross()).toBe(true);
      const frame = await boxOf(detail.viewport);
      const panel = await boxOf(detail.panel(2));

      expect(panel.x).toBeGreaterThanOrEqual(frame.x);
      expect(panel.x + panel.width).toBeLessThanOrEqual(frame.x + frame.width + 1);
    }
    expect(await playground.hasHorizontalOverflow()).toBe(false);
  });

  test('shows details in a paged table without a row window', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tableDetail: detail } = playground;
    await detail.root.scrollIntoViewIfNeeded();

    await detail.windowSwitch.click();
    await detail.openFirst.click();
    await expect(detail.panel(1)).toBeVisible();
    await expect(detail.panel(3)).toBeVisible();
    await expect(detail.grid).toHaveAttribute('aria-rowcount', '14');
    await detail.closeAll.click();
    await expect(detail.panel(1)).toHaveCount(0);
    await expect(detail.grid).toHaveAttribute('aria-rowcount', '11');
  });

  test('open details have no automatically detectable WCAG AA violations', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { tableDetail: detail } = playground;
    await detail.root.scrollIntoViewIfNeeded();
    await detail.openFirst.click();
    await expect(detail.panel(1)).toBeVisible();

    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      expect(await playground.wcagViolations()).toEqual([]);
    }
  });
});
