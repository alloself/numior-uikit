import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { LayoutDriver } from './drivers/layout';

describe('NuiLayout with NuiSidebar', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts open, wires the trigger to the sidebar and collapses to a rail that describes its items', async () => {
    const layout = LayoutDriver.mount({ collapsible: 'icon' });
    expect(layout.sidebarLabel).toBe('Navigation');
    expect(layout.triggerLabel).toBe('Toggle sidebar');
    expect(layout.trigger.attributes('aria-expanded')).toBe('true');
    expect(layout.trigger.attributes('aria-controls')).toBe(layout.sidebar.attributes('id'));
    expect(layout.action('Inbox').attributes('aria-describedby')).toBeUndefined();
    expect(layout.action('Inbox').attributes('aria-current')).toBe('page');
    expect(layout.action('Inbox').find('.nui-badge').text()).toBe('3');
    expect(layout.action('Docs').element.tagName).toBe('A');
    expect(layout.action('Docs').attributes('href')).toBe('#docs');
    await layout.focusItem('Calendar');
    expect(layout.tooltipShows).toBe(0);
    await layout.clickTrigger();
    expect(layout.open).toBe(false);
    expect(layout.sidebarModifier('rail')).toBe(true);
    expect(layout.sidebarModifier('collapsed')).toBe(true);
    expect(layout.sidebar.attributes('inert')).toBeUndefined();
    expect(layout.action('Inbox').text()).toContain('Inbox');
    expect(layout.action('Inbox').attributes('aria-describedby')).toBeUndefined();
    await layout.focusItem('Inbox');
    expect(layout.tooltipShows).toBe(1);
    expect(layout.trigger.attributes('aria-expanded')).toBe('false');
    await layout.clickItem('Calendar');
    expect(layout.active).toBe('calendar');
    expect(layout.heading).toBe('calendar');
    await layout.clickTrigger();
    expect(layout.sidebarModifier('rail')).toBe(false);
    layout.unmount();
  });

  it('toggles with Ctrl or Cmd+B outside editable fields and hides an offcanvas sidebar with inert', async () => {
    const layout = LayoutDriver.mount({ collapsible: 'offcanvas' });
    expect(await layout.pressShortcut('ctrl')).toBe(true);
    expect(layout.open).toBe(false);
    expect(layout.sidebar.attributes('inert')).toBeDefined();
    expect(layout.sidebarModifier('rail')).toBe(false);
    expect(await layout.pressShortcutInEditor()).toBe(false);
    expect(layout.open).toBe(false);
    expect(await layout.pressShortcut('meta')).toBe(true);
    expect(layout.open).toBe(true);
    expect(layout.sidebar.attributes('inert')).toBeUndefined();
    layout.unmount();

    const fixed = LayoutDriver.mount({ collapsible: 'none', shortcut: false });
    expect(await fixed.pressShortcut('ctrl')).toBe(false);
    expect(fixed.open).toBe(true);
    fixed.unmount();
  });

  it('expands a sub list, keeps it closed in rail mode and reopens the sidebar from the rail', async () => {
    const layout = LayoutDriver.mount({ collapsible: 'icon' });
    expect(layout.subToggle.attributes('aria-expanded')).toBe('false');
    expect(layout.subToggle.attributes('aria-controls')).toBe(layout.subItems.attributes('id'));
    expect(layout.subItems.attributes('inert')).toBeDefined();
    await layout.clickSub();
    expect(layout.subOpen).toBe(true);
    expect(layout.subToggle.attributes('aria-expanded')).toBe('true');
    expect(layout.subItems.attributes('inert')).toBeUndefined();
    await layout.clickItem('Sales');
    expect(layout.active).toBe('sales');
    await layout.clickTrigger();
    expect(layout.subToggle.attributes('aria-expanded')).toBe('false');
    expect(layout.subItems.exists()).toBe(false);
    expect(layout.flyout.exists()).toBe(true);
    await layout.clickTrigger();
    expect(layout.flyout.exists()).toBe(false);
    expect(layout.subToggle.attributes('aria-expanded')).toBe('true');
    layout.unmount();
  });

  it('opens a flyout from the rail on hover, click or arrow key and closes it on Escape or a pick', async () => {
    vi.useFakeTimers();
    const layout = LayoutDriver.mount({ collapsible: 'icon' });
    await layout.clickTrigger();
    expect(layout.flyout.attributes('role')).toBe('group');
    expect(layout.flyout.attributes('popover')).toBe('manual');
    expect(layout.subToggle.attributes('aria-controls')).toBe(layout.flyout.attributes('id'));
    expect(layout.subToggle.attributes('aria-expanded')).toBe('false');
    expect(layout.flyout.text()).toContain('Reports');
    await layout.hoverSub();
    await layout.advance(100);
    expect(layout.subToggle.attributes('aria-expanded')).toBe('true');
    expect(layout.tooltipShows).toBe(1);
    await layout.leaveSub();
    await layout.advance(300);
    expect(layout.subToggle.attributes('aria-expanded')).toBe('false');
    await layout.pressOnSub('ArrowRight');
    expect(layout.subToggle.attributes('aria-expanded')).toBe('true');
    expect(layout.focusedLabel).toBe('Sales');
    await layout.pressFocused('ArrowDown');
    expect(layout.focusedLabel).toBe('Team');
    await layout.pressFocused('Escape');
    expect(layout.subToggle.attributes('aria-expanded')).toBe('false');
    expect(layout.subFocused).toBe(true);
    await layout.clickSub();
    expect(layout.subToggle.attributes('aria-expanded')).toBe('true');
    await layout.clickItem('Sales');
    expect(layout.active).toBe('sales');
    expect(layout.subToggle.attributes('aria-expanded')).toBe('false');
    expect(layout.open).toBe(false);
    await layout.clickTrigger();
    expect(layout.flyout.exists()).toBe(false);
    layout.unmount();
  });

  it('moves into a drawer on small screens and closes it after an item is picked', async () => {
    const layout = LayoutDriver.mount({ collapsible: 'offcanvas' });
    expect(layout.drawer.exists()).toBe(false);
    await layout.setMobile(true);
    expect(layout.sidebar.exists()).toBe(false);
    expect(layout.drawer.exists()).toBe(true);
    expect(layout.drawer.text()).toContain('Navigation');
    expect(layout.trigger.attributes('aria-expanded')).toBe('false');
    expect(layout.trigger.attributes('aria-controls')).toBe(layout.drawer.attributes('id'));
    await layout.clickTrigger();
    expect(layout.mobileOpen).toBe(true);
    expect(layout.showModalCalls).toBe(1);
    await layout.clickItem('Calendar');
    expect(layout.active).toBe('calendar');
    expect(layout.mobileOpen).toBe(false);
    await layout.clickTrigger();
    expect(layout.mobileOpen).toBe(true);
    await layout.setMobile(false);
    expect(layout.mobileOpen).toBe(false);
    expect(layout.sidebar.exists()).toBe(true);
    expect(layout.open).toBe(true);
    layout.unmount();
  });

  it('places a full header above the sidebar, offers an end column and sticks both columns', async () => {
    const layout = LayoutDriver.mount({ header: 'full', end: true, sticky: true });
    expect(layout.hasModifier('pending')).toBe(true);
    await layout.ready();
    expect(layout.hasModifier('pending')).toBe(false);
    expect(layout.hasModifier('header-full')).toBe(true);
    expect(layout.hasModifier('sticky')).toBe(true);
    expect(layout.hasModifier('with-end')).toBe(true);
    expect(layout.headerBeforeRow).toBe(true);
    expect(layout.endColumn.text()).toBe('Outline');
    layout.unmount();
    const inset = LayoutDriver.mount();
    expect(inset.hasModifier('header-inset')).toBe(true);
    expect(inset.headerBeforeRow).toBe(false);
    expect(inset.endColumn.exists()).toBe(false);
    inset.unmount();
  });

  it('collapses a group behind its label and reveals a sub list when a child becomes current', async () => {
    const layout = LayoutDriver.mount({ collapsibleGroup: true });
    expect(layout.groupToggle.attributes('aria-expanded')).toBe('true');
    expect(layout.groupToggle.attributes('aria-controls')).toBe(layout.groupList.attributes('id'));
    await layout.clickGroupToggle();
    expect(layout.groupToggle.attributes('aria-expanded')).toBe('false');
    expect(layout.groupList.attributes('inert')).toBeDefined();
    await layout.clickGroupToggle();
    expect(layout.groupList.attributes('inert')).toBeUndefined();
    expect(layout.subOpen).toBe(false);
    await layout.activate('team');
    expect(layout.subOpen).toBe(true);
    expect(layout.action('Team').attributes('aria-current')).toBe('page');
    layout.unmount();
  });

  it('renders the plain, inset and floating looks as modifiers of the panel', () => {
    for (const variant of ['plain', 'inset', 'floating'] as const) {
      const layout = LayoutDriver.mount({ variant });

      expect(layout.sidebarModifier(`variant-${variant}`)).toBe(true);
      layout.unmount();
    }
    const panel = LayoutDriver.mount();

    expect(panel.sidebarModifier('variant-panel')).toBe(true);
    panel.unmount();
  });

  it('names the sidebar, its trigger and the drawer in the configured language', async () => {
    const russian = LayoutDriver.mount({ config: { locale: 'ru-RU' } });
    expect(russian.sidebarLabel).toBe('Навигация');
    expect(russian.triggerLabel).toBe('Переключить боковую панель');
    russian.unmount();

    const labelled = LayoutDriver.mount({ config: { locale: 'ru-RU' }, label: 'Разделы' });
    expect(labelled.sidebarLabel).toBe('Разделы');
    labelled.unmount();

    const mobile = LayoutDriver.mount({ config: { locale: 'ru-RU' } });
    await mobile.setMobile(true);
    expect(mobile.drawer.text()).toContain('Навигация');
    expect(mobile.drawerCloseLabel).toBe('Закрыть');
    mobile.unmount();
  });
});
