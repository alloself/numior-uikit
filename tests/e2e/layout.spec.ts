import { expect, test } from '@playwright/test';
import { PlaygroundPage } from './pages/playground';

test.describe('layout', () => {
  test('sidebar collapses to a rail with tooltips, toggles with Ctrl+B and hides offcanvas', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'desktop sidebar');
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { layout } = playground;
    await layout.root.scrollIntoViewIfNeeded();
    expect(await layout.sidebarWidth()).toBeGreaterThan(200);
    await expect(layout.itemLabel('overview')).toBeVisible();
    await expect(layout.trigger).toHaveAttribute('aria-expanded', 'true');
    await layout.trigger.click();
    await expect(layout.trigger).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(() => layout.sidebarWidth()).toBeLessThan(80);
    await expect.poll(() => layout.labelWidth('overview')).toBeLessThanOrEqual(1);
    await expect(layout.item('overview')).toHaveAccessibleName(/Обзор/);
    for (const target of [layout.item('overview'), layout.subToggle, layout.item('docs')]) {
      await expect.poll(() => layout.iconOffset(target)).toBeLessThan(1);
    }
    await layout.item('calendar').hover();
    await expect(layout.tooltip('Календарь')).toBeVisible();
    await layout.item('calendar').click();
    await expect(layout.heading).toHaveText('Календарь');
    await expect(layout.item('calendar')).toHaveAttribute('aria-current', 'page');
    await page.keyboard.press('Control+b');
    await expect.poll(() => layout.sidebarWidth()).toBeGreaterThan(200);
    await expect.poll(async () => (await layout.readOutput()).open).toBe(true);
    await layout.collapsible.selectOption('offcanvas');
    await layout.trigger.click();
    await expect(layout.sidebar).toBeHidden();
    await expect.poll(() => layout.sidebarWidth()).toBeLessThan(1);
    await page.keyboard.press('Control+b');
    await expect(layout.sidebar).toBeVisible();
  });

  test('sub list expands, the sidebar can dock at the end and mirrors in RTL', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'desktop sidebar');
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { layout } = playground;
    await layout.root.scrollIntoViewIfNeeded();
    await expect(layout.subToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(layout.item('report-sales')).toBeHidden();
    await layout.subToggle.click();
    await expect(layout.subToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(layout.item('report-sales')).toBeVisible();
    expect(await layout.opensUnderToggle('report-sales')).toBe(true);
    await layout.item('report-sales').click();
    await expect(layout.heading).toHaveText('Отчёт: продажи');
    const contentBox = await layout.content().boundingBox();
    const startBox = await layout.sidebar.boundingBox();
    expect(startBox && contentBox && startBox.x < contentBox.x).toBe(true);
    await layout.side.selectOption('end');
    const endBox = await layout.sidebar.boundingBox();
    const bodyBox = await layout.content().boundingBox();
    expect(endBox && bodyBox && endBox.x > bodyBox.x).toBe(true);
    await layout.side.selectOption('start');
    await playground.setDirection('rtl');
    const rtlBox = await layout.sidebar.boundingBox();
    const rtlBody = await layout.content().boundingBox();
    expect(rtlBox && rtlBody && rtlBox.x > rtlBody.x).toBe(true);
    await playground.setDirection('ltr');
  });

  test('sidebar becomes a drawer on small screens and closes after navigation', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'mobile drawer');
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { layout } = playground;
    await layout.root.scrollIntoViewIfNeeded();
    await expect(layout.sidebar).toHaveCount(0);
    await expect(layout.drawer).toBeHidden();
    await layout.trigger.click();
    await expect(layout.drawer).toBeVisible();
    await expect(layout.drawer).toContainText('Разделы');
    await layout.item('files').click();
    await expect(layout.drawer).toBeHidden();
    await expect(layout.heading).toHaveText('Файлы');
    await expect.poll(async () => (await layout.readOutput()).mobileOpen).toBe(false);
  });

  test('layout has no automatically detectable WCAG AA violations', async ({ page, isMobile }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { layout } = playground;
    await layout.root.scrollIntoViewIfNeeded();
    if (!isMobile) {
      await layout.subToggle.click();
      await expect(layout.item('report-sales')).toBeVisible();
    }
    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      expect(await playground.wcagViolations()).toEqual([]);
    }
    if (!isMobile) {
      await layout.trigger.click();
      await expect.poll(() => layout.sidebarWidth()).toBeLessThan(80);
      expect(await playground.wcagViolations()).toEqual([]);
    }
  });
});
