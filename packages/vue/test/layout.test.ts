import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { LayoutDriver } from './drivers/layout';

describe('NuiLayout with NuiSidebar', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('leads with a skip link that moves focus to the content and can be renamed or left out', async () => {
    const layout = LayoutDriver.mount();

    expect(layout.skipLink.text()).toBe('Skip to content');
    expect(layout.skipLink.attributes('href')).toBe('#app-content');

    await layout.followSkipLink();
    expect(layout.contentFocused).toBe(true);

    layout.unmount();

    const renamed = LayoutDriver.mount({ skipLabel: 'К заказам' });

    expect(renamed.skipLink.text()).toBe('К заказам');

    renamed.unmount();

    const bare = LayoutDriver.mount({ skipLink: false });

    expect(bare.skipLink.exists()).toBe(false);

    bare.unmount();
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

  it('shows the flyout again after the sidebar was expanded and collapsed with the flyout open', async () => {
    const layout = LayoutDriver.mount({ collapsible: 'icon' });

    await layout.clickTrigger();
    await layout.clickSub();

    expect(layout.flyoutShown).toBe(true);

    await layout.pressShortcut();
    await layout.pressShortcut();

    expect(layout.subToggle.attributes('aria-expanded')).toBe('false');

    await layout.clickSub();

    expect(layout.flyoutShown).toBe(true);

    layout.unmount();
  });

  it('keeps a flyout opened by hover when its button is clicked and closes it on a press outside', async () => {
    vi.useFakeTimers();
    const layout = LayoutDriver.mount({ collapsible: 'icon' });

    await layout.clickTrigger();
    await layout.hoverSub();
    await layout.advance(100);
    await layout.clickSub();

    expect(layout.subToggle.attributes('aria-expanded')).toBe('true');

    await layout.leaveSub();
    await layout.advance(300);
    await layout.pressInFlyout();

    expect(layout.subToggle.attributes('aria-expanded')).toBe('true');

    await layout.pressOutside();

    expect(layout.subToggle.attributes('aria-expanded')).toBe('false');

    await layout.clickSub();
    await layout.pressOutside();

    expect(layout.subToggle.attributes('aria-expanded')).toBe('false');

    await layout.clickSub();
    await layout.clickSub();

    expect(layout.subToggle.attributes('aria-expanded')).toBe('false');

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

  it('takes the rail width from the theme unless railWidth sets it and keeps the collapse mode in the drawer', async () => {
    const themed = LayoutDriver.mount();
    expect(themed.railSize).toBe('');

    themed.unmount();
    const narrow = LayoutDriver.mount({ railWidth: '3rem' });
    expect(narrow.railSize).toBe('3rem');

    await narrow.setMobile(true);
    expect(narrow.drawerSidebarModifier('collapsible-icon')).toBe(true);

    narrow.unmount();
  });

  it('marks a start icon rail of a panel or plain sidebar as the rail column of the layout', () => {
    const cases = [
      {},
      { variant: 'plain' },
      { variant: 'floating' },
      { side: 'end' },
      { collapsible: 'offcanvas' },
    ] as const;

    const marked = cases.map((options) => {
      const layout = LayoutDriver.mount(options);
      const holds = layout.sidebarHoldsRailColumn;

      layout.unmount();
      return holds;
    });

    expect(marked).toEqual([true, true, false, false, false]);
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

  it('puts the footer under the whole row with a full header and under the content with an inset one', async () => {
    const site = LayoutDriver.mount({ header: 'full', footer: true });

    await site.ready();
    expect(site.footerParent).toContain('nui-layout--header-full');
    expect(site.footerFollowsContent).toBe(true);

    site.unmount();
    const app = LayoutDriver.mount({ footer: true });

    await app.ready();
    expect(app.footerParent).toBe('nui-layout__body');
    expect(app.footerFollowsContent).toBe(true);

    app.unmount();
    const bare = LayoutDriver.mount();

    expect(bare.hasFooter).toBe(false);

    bare.unmount();
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

  it('marks the current item of the plain look with a line unless a square is asked for', () => {
    const lined = LayoutDriver.mount({ variant: 'plain' });

    expect(lined.sidebarModifier('marker-line')).toBe(true);

    lined.unmount();

    const squared = LayoutDriver.mount({ variant: 'plain', marker: 'square' });

    expect(squared.sidebarModifier('marker-square')).toBe(true);
    expect(squared.sidebarModifier('marker-line')).toBe(false);

    squared.unmount();
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
