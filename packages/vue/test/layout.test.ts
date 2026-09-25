import { describe, expect, it } from 'vitest';
import { LayoutDriver } from './drivers/layout';

describe('NuiLayout with NuiSidebar', () => {
  it('starts open, wires the trigger to the sidebar and collapses to a rail that describes its items', async () => {
    const layout = LayoutDriver.mount({ collapsible: 'icon' });
    expect(layout.sidebar.attributes('aria-label')).toBe('Sections');
    expect(layout.trigger.attributes('aria-expanded')).toBe('true');
    expect(layout.trigger.attributes('aria-controls')).toBe(layout.sidebar.attributes('id'));
    expect(layout.action('Inbox').attributes('aria-describedby')).toBeUndefined();
    expect(layout.action('Inbox').attributes('aria-current')).toBe('page');
    expect(layout.action('Docs').element.tagName).toBe('A');
    expect(layout.action('Docs').attributes('href')).toBe('#docs');
    await layout.clickTrigger();
    expect(layout.open).toBe(false);
    expect(layout.sidebarModifier('rail')).toBe(true);
    expect(layout.sidebarModifier('collapsed')).toBe(true);
    expect(layout.sidebar.attributes('inert')).toBeUndefined();
    expect(layout.action('Inbox').attributes('aria-describedby')).toBeTruthy();
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
    expect(layout.subItems.attributes('inert')).toBeDefined();
    await layout.clickSub();
    expect(layout.open).toBe(true);
    expect(layout.subOpen).toBe(true);
    expect(layout.subToggle.attributes('aria-expanded')).toBe('true');
    layout.unmount();
  });

  it('moves into a drawer on small screens and closes it after an item is picked', async () => {
    const layout = LayoutDriver.mount({ collapsible: 'offcanvas' });
    expect(layout.drawer.exists()).toBe(false);
    await layout.setMobile(true);
    expect(layout.sidebar.exists()).toBe(false);
    expect(layout.drawer.exists()).toBe(true);
    expect(layout.drawer.text()).toContain('Sections');
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
});
