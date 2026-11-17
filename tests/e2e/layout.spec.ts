import { expect, test } from './fixtures';
import { channelSumOf, rgbDelta } from './helpers/color';
import { boxOf } from './helpers/geometry';
import { motionOf, SLOW_MOTION, slowMotion } from './helpers/motion';

const GUTTER = 24;

test.describe('layout', () => {
  test('a full header spans the frame, an end column docks beside the content and groups collapse', async ({
    playground,
    layout,
    isMobile,
  }) => {
    await playground.open();
    await layout.root.scrollIntoViewIfNeeded();

    if (!isMobile) {
      expect(await layout.appBarInset()).toBeGreaterThan(100);
    }

    await layout.header.selectOption('full');
    expect(await layout.appBarInset()).toBeLessThan(2);
    expect(await layout.appBarWidthGap()).toBeLessThan(2);

    await layout.endToggle.check();

    if (isMobile) {
      await expect(layout.endColumn).toBeHidden();
      return;
    }

    await expect(layout.endColumn).toBeVisible();
    expect(await layout.endColumnGap()).toBeLessThan(2);
    await expect(layout.groupToggle).toHaveAttribute('aria-expanded', 'true');

    await layout.groupToggle.click();
    await expect(layout.groupToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(layout.item('calendar')).toBeHidden();

    await layout.groupToggle.click();
    await expect(layout.item('calendar')).toBeVisible();
    await expect(layout.subToggle).toHaveAttribute('aria-expanded', 'false');

    await layout.gotoReport.click();
    await expect(layout.subToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(layout.heading).toHaveText('Отчёт: команда');
  });

  test('the top bar keeps the content gutter, puts the trigger icon on the text line and its trigger in the rail column over an icon rail', async ({
    playground,
    layout,
    isMobile,
  }) => {
    await playground.open();
    await layout.root.scrollIntoViewIfNeeded();
    expect(await layout.appBarEndGap()).toBe(GUTTER);
    expect(await layout.triggerIconStart()).toBeCloseTo(await layout.textStart(), 0);

    await layout.header.selectOption('full');

    await expect.poll(() => layout.appBarEndGap()).toBe(GUTTER);

    if (isMobile) {
      expect(await layout.triggerIconStart()).toBeCloseTo(await layout.textStart(), 0);
      return;
    }

    const trigger = await layout.triggerStart();
    const heading = await layout.headingStart();

    await layout.trigger.click();

    await expect.poll(() => layout.sidebarWidth()).toBeLessThan(80);
    await expect.poll(() => layout.triggerOffset()).toBeLessThan(1);
    expect(await layout.headingStart()).toBeCloseTo(await layout.textStart(), 0);
    expect(await layout.headingStart()).toBeCloseTo((await layout.sidebarWidth()) + GUTTER, 0);
    expect(await layout.headingStart()).toBeCloseTo(heading, 0);
    expect(await layout.triggerStart()).toBeCloseTo(trigger, 0);
  });

  test('sidebar collapses to a rail with tooltips, toggles with Ctrl+B and hides offcanvas', async ({
    playground,
    layout,
    isMobile,
  }) => {
    test.skip(isMobile, 'desktop sidebar');
    await playground.open();
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

    await layout.toggleSidebarWithShortcut();
    await expect.poll(() => layout.sidebarWidth()).toBeGreaterThan(200);
    await expect.poll(async () => (await layout.readOutput()).open).toBe(true);

    await layout.collapsible.selectOption('offcanvas');
    await layout.trigger.click();
    await expect(layout.sidebar).toBeHidden();
    await expect.poll(() => layout.sidebarWidth()).toBeLessThan(1);

    await layout.toggleSidebarWithShortcut();
    await expect(layout.sidebar).toBeVisible();
  });

  test('the icon rail keeps a count at the top end corner of the icon, off most of it, and turns a text tag into a dot', async ({
    playground,
    layout,
    isMobile,
  }) => {
    test.skip(isMobile, 'desktop rail');
    await playground.open();
    await layout.root.scrollIntoViewIfNeeded();
    await layout.item('calendar').click();
    await layout.trigger.click();
    await expect.poll(() => layout.sidebarWidth()).toBeLessThan(80);

    await expect(layout.itemBadge('overview')).toHaveText('12');

    const count = await layout.badgeOnIcon('overview');
    expect(count.startFromIconEnd).toBeCloseTo(-4, 0);
    expect(Math.abs(count.centreFromIconTop)).toBeLessThan(1);
    expect(count.cover).toBeLessThan(0.2);
    expect(count.insideBar).toBe(true);
    expect(await layout.badgeClipped('overview')).toBe(false);

    const dot = await layout.badgeOnIcon('files');
    expect(dot.width).toBeCloseTo(dot.height, 1);
    expect(dot.width).toBeLessThan(12);
    expect(dot.startFromIconEnd).toBeCloseTo(-4, 0);
    await expect(layout.item('files')).toHaveAccessibleName(/Файлы.*Новое/);

    await playground.setDirection('rtl');

    await expect
      .poll(async () => (await layout.badgeOnIcon('overview')).endFromIconStart)
      .toBeCloseTo(4, 0);

    await playground.setDirection('ltr');
    await layout.trigger.click();
    await expect.poll(() => layout.sidebarWidth()).toBeGreaterThan(200);
    await expect(layout.itemBadge('files')).toHaveText('Новое');
  });

  test('sub list expands, the sidebar can dock at the end and mirrors in RTL', async ({
    playground,
    layout,
    isMobile,
  }) => {
    test.skip(isMobile, 'desktop sidebar');
    await playground.open();
    await layout.root.scrollIntoViewIfNeeded();
    await expect(layout.subToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(layout.item('report-sales')).toBeHidden();

    await layout.subToggle.click();
    await expect(layout.subToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(layout.item('report-sales')).toBeVisible();
    expect(await layout.opensUnderToggle('report-sales')).toBe(true);

    await layout.item('report-sales').click();
    await expect(layout.heading).toHaveText('Отчёт: продажи');

    const contentBox = await boxOf(layout.content());
    const startBox = await boxOf(layout.sidebar);
    expect(startBox.x).toBeLessThan(contentBox.x);

    await layout.side.selectOption('end');
    const endBox = await boxOf(layout.sidebar);
    const bodyBox = await boxOf(layout.content());
    expect(endBox.x).toBeGreaterThan(bodyBox.x);

    await layout.side.selectOption('start');
    await playground.setDirection('rtl');
    const rtlBox = await boxOf(layout.sidebar);
    const rtlBody = await boxOf(layout.content());
    expect(rtlBox.x).toBeGreaterThan(rtlBody.x);

    await playground.setDirection('ltr');
  });

  test('a navigation item fades its icon together with its label and changes its background at once', async ({
    playground,
    layout,
    isMobile,
  }) => {
    test.skip(isMobile, 'desktop sidebar');
    await playground.open();
    await layout.root.scrollIntoViewIfNeeded();
    await slowMotion(layout.sidebar);
    await layout.item('calendar').click();
    const label = await motionOf(layout.itemRow('calendar'), 'color');

    expect(label?.duration).toBe(SLOW_MOTION);
    expect(await motionOf(layout.itemIcon('calendar'), 'color')).toEqual(label);
    expect(await motionOf(layout.item('calendar'), 'background-color')).toBeNull();
    expect(await motionOf(layout.item('calendar'), 'color')).toBeNull();

    await layout.subToggle.click();
    await layout.item('report-sales').click();

    expect(await motionOf(layout.subToggle, 'color')).toEqual(label);
    expect(await motionOf(layout.subIcon, 'color')).toEqual(label);
  });

  test('the icon rail opens sub lists as flyouts by hover, click and keyboard', async ({
    playground,
    layout,
    isMobile,
  }) => {
    test.skip(isMobile, 'desktop rail');
    await playground.open();
    await layout.root.scrollIntoViewIfNeeded();
    await layout.trigger.click();
    await expect.poll(() => layout.sidebarWidth()).toBeLessThan(80);
    await expect(layout.flyout).toBeHidden();

    await layout.subToggle.hover();
    await expect(layout.flyout).toBeVisible();
    await expect(layout.flyout).toContainText('Отчёты');
    await expect(layout.tooltip('Отчёты')).toBeHidden();

    const [toggle, flyout] = await Promise.all([boxOf(layout.subToggle), boxOf(layout.flyout)]);
    expect(flyout.x).toBeGreaterThanOrEqual(toggle.x + toggle.width);
    expect(flyout.y).toBeLessThanOrEqual(toggle.y + 1);
    await expect(layout.itemLabel('report-sales')).toBeVisible();

    await layout.item('report-sales').click();
    await expect(layout.heading).toHaveText('Отчёт: продажи');
    await expect(layout.flyout).toBeHidden();
    expect(await layout.sidebarWidth()).toBeLessThan(80);

    await layout.subToggle.focus();
    await layout.expandFocusedGroup();
    await expect(layout.flyout).toBeVisible();
    await expect(layout.item('report-sales')).toBeFocused();

    await layout.focusNextItem();
    await expect(layout.item('report-team')).toBeFocused();

    await layout.closeFlyout();
    await expect(layout.flyout).toBeHidden();
    await expect(layout.subToggle).toBeFocused();

    await playground.setDirection('rtl');
    await layout.subToggle.click();
    await expect(layout.flyout).toBeVisible();

    const [rtlToggle, rtlFlyout] = await Promise.all([
      boxOf(layout.subToggle),
      boxOf(layout.flyout),
    ]);

    expect(rtlFlyout.x + rtlFlyout.width).toBeLessThanOrEqual(rtlToggle.x + 1);

    await layout.closeFlyout();
    await playground.setDirection('ltr');
    await layout.trigger.click();
    await expect.poll(() => layout.sidebarWidth()).toBeGreaterThan(200);
  });

  test('a flyout stays after a click on its hovered button and closes on a press outside', async ({
    playground,
    layout,
    isMobile,
  }) => {
    test.skip(isMobile, 'desktop rail');
    await playground.open();
    await layout.root.scrollIntoViewIfNeeded();
    await layout.trigger.click();
    await expect.poll(() => layout.sidebarWidth()).toBeLessThan(80);

    await layout.subToggle.hover();
    await expect(layout.flyout).toBeVisible();

    await layout.subToggle.click();
    await expect(layout.flyout).toBeVisible();

    await layout.itemLabel('report-sales').hover();
    await expect(layout.flyout).toBeVisible();

    await layout.heading.click();
    await expect(layout.flyout).toBeHidden();
  });

  test('a flyout opens again after the sidebar was expanded and collapsed over it', async ({
    playground,
    layout,
    isMobile,
  }) => {
    test.skip(isMobile, 'desktop rail');
    await playground.open();
    await layout.root.scrollIntoViewIfNeeded();
    await layout.trigger.click();
    await expect.poll(() => layout.sidebarWidth()).toBeLessThan(80);

    await layout.subToggle.focus();
    await layout.activateFocused();
    await expect(layout.flyout).toBeVisible();

    await layout.toggleSidebarWithShortcut();
    await expect.poll(() => layout.sidebarWidth()).toBeGreaterThan(200);

    await layout.toggleSidebarWithShortcut();
    await expect.poll(() => layout.sidebarWidth()).toBeLessThan(80);

    await layout.subToggle.focus();
    await layout.activateFocused();
    await expect(layout.flyout).toBeVisible();
    await expect(layout.item('report-sales')).toBeFocused();
  });

  test('inset puts the content into a card and floating frames the sidebar', async ({
    playground,
    layout,
    isMobile,
  }) => {
    await playground.open();
    await layout.root.scrollIntoViewIfNeeded();
    await layout.variant.selectOption('inset');

    if (isMobile) {
      expect((await layout.bodyInsets()).start).toBeLessThan(1);
      expect(await layout.bodyRadius()).toBe(0);

      await layout.trigger.click();
      await expect(layout.drawer).toBeVisible();
      return;
    }

    await expect.poll(async () => (await layout.bodyInsets()).top).toBeGreaterThanOrEqual(7);
    expect((await layout.bodyInsets()).end).toBeGreaterThanOrEqual(7);
    expect((await layout.bodyInsets()).start).toBeGreaterThan(200);
    expect(await layout.bodyRadius()).toBeGreaterThan(0);

    const surfaces = await layout.surfaces();
    expect(surfaces.frame).not.toBe(surfaces.body);
    expect((await layout.sidebarFrame()).padding).toBeGreaterThanOrEqual(7);

    await layout.collapsible.selectOption('offcanvas');
    await layout.trigger.click();
    await expect.poll(() => layout.sidebarWidth()).toBeLessThan(1);
    await expect.poll(async () => (await layout.bodyInsets()).start).toBeGreaterThanOrEqual(7);

    await layout.trigger.click();
    await layout.collapsible.selectOption('icon');
    await layout.variant.selectOption('floating');
    await expect.poll(async () => (await layout.sidebarFrame()).padding).toBeGreaterThanOrEqual(8);

    const frame = await layout.sidebarFrame();
    expect(frame.border).toBe(1);
    expect(frame.radius).toBeGreaterThan(0);
    await expect.poll(async () => (await layout.bodyInsets()).top).toBeLessThan(1);

    await layout.trigger.click();
    await expect.poll(() => layout.sidebarWidth()).toBeLessThan(90);
    await expect.poll(() => layout.iconOffset(layout.item('overview'))).toBeLessThan(1);

    await layout.trigger.click();
    await playground.setDirection('rtl');
    const rtlBox = await boxOf(layout.sidebar);
    const rtlBody = await boxOf(layout.content());
    expect(rtlBox && rtlBody && rtlBox.x > rtlBody.x).toBe(true);

    await playground.setDirection('ltr');
    await layout.variant.selectOption('panel');
  });

  test('a plain sidebar marks the current item with a square on request', async ({
    playground,
    layout,
    isMobile,
  }) => {
    await playground.open();
    await layout.root.scrollIntoViewIfNeeded();
    await layout.variant.selectOption('plain');
    await layout.marker.selectOption('square');

    if (isMobile) {
      await layout.trigger.click();
      await expect(layout.drawer).toBeVisible();
    }

    await expect
      .poll(() => layout.markerOf('overview'))
      .toEqual({ opacity: 1, width: 6, height: 6 });

    await expect.poll(async () => (await layout.markerOf('calendar')).opacity).toBe(0);

    await layout.item('calendar').click();

    if (isMobile) {
      await layout.trigger.click();
      await expect(layout.drawer).toBeVisible();
    }

    await expect.poll(async () => (await layout.markerOf('calendar')).opacity).toBe(1);
    await expect.poll(async () => (await layout.markerOf('overview')).opacity).toBe(0);

    if (isMobile) {
      await layout.item('calendar').click();
    }

    await layout.marker.selectOption('line');
    await layout.variant.selectOption('panel');
  });

  test('the current item lights up above the sidebar in the dark theme', async ({
    playground,
    layout,
    isMobile,
  }) => {
    test.skip(isMobile, 'desktop sidebar');
    await playground.open();
    await playground.setTheme('dark');
    await layout.root.scrollIntoViewIfNeeded();

    const current = await layout.paintOf('overview');
    const idle = await layout.paintOf('calendar');

    expect(channelSumOf(current)).toBeGreaterThan(channelSumOf(idle));
    expect(rgbDelta(current, idle)).toBeGreaterThan(20);
  });

  test('sidebar becomes a drawer on small screens and closes after navigation', async ({
    playground,
    layout,
    isMobile,
  }) => {
    test.skip(!isMobile, 'mobile drawer');
    await playground.open();
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

  test('layout has no automatically detectable WCAG AA violations', async ({
    playground,
    layout,
    isMobile,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await layout.root.scrollIntoViewIfNeeded();

    if (!isMobile) {
      await layout.subToggle.click();
      await expect(layout.item('report-sales')).toBeVisible();
    }

    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      expect(await playground.wcagViolations(layout.scope)).toEqual([]);
    }
  });

  test('icon rail and its flyout have no automatically detectable WCAG AA violations', async ({
    playground,
    layout,
    isMobile,
  }) => {
    test.skip(isMobile, 'the icon rail is a desktop mode');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await layout.root.scrollIntoViewIfNeeded();
    await layout.trigger.click();
    await expect.poll(() => layout.sidebarWidth()).toBeLessThan(80);
    expect(await playground.wcagViolations(layout.scope)).toEqual([]);

    await layout.subToggle.click();
    await expect(layout.flyout).toBeVisible();
    expect(await playground.wcagViolations(layout.scope)).toEqual([]);
  });
});
