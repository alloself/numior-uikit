import { describe, expect, it } from 'vite-plus/test';
import type { NuiTabLinkDescriptor } from '../src';
import { TabsDriver } from './drivers/tabs';
import { RouteObjectStub, RouterStub } from './support/router-stub';

const pathOf = (to: string | object): string =>
  typeof to === 'string' ? to : 'path' in to && typeof to.path === 'string' ? to.path : '';

const SECTIONS: readonly NuiTabLinkDescriptor[] = [
  { to: '#overview', label: 'Overview', icon: 'check' },
  { to: '#orders', label: 'Orders' },
  { to: '#archive', label: 'Archive', disabled: true },
];

describe('NuiTabs', () => {
  it('wires tabs to panels and keeps the selected tab as the only tab stop', () => {
    const tabs = TabsDriver.mount({ modelValue: 'team', props: { id: 'settings' } });
    expect(tabs.labels).toEqual(['General', 'Billing', 'Team', 'Danger']);
    expect(tabs.list.attributes('aria-orientation')).toBe('horizontal');
    expect(tabs.list.attributes('aria-label')).toBe('Settings');
    expect(tabs.tab('Team').attributes('id')).toBe('settings-tab-team');
    expect(tabs.tab('Team').attributes('aria-selected')).toBe('true');
    expect(tabs.tab('Team').attributes('aria-controls')).toBe('settings-panel-team');
    expect(tabs.panel('team').attributes('aria-labelledby')).toBe('settings-tab-team');
    expect(tabs.tab('Billing').attributes('aria-disabled')).toBe('true');
    expect(tabs.tabIndexes).toEqual([-1, -1, 0, -1]);
    expect(tabs.panelVisible('team')).toBe(true);
    expect(tabs.panelVisible('general')).toBe(false);
    expect(tabs.hasRootModifier('variant-line')).toBe(true);
    expect(tabs.hasRootModifier('size-md')).toBe(true);

    tabs.unmount();
  });

  it('works as a switcher from data without panels and points at no panel then', async () => {
    const tabs = TabsDriver.mount({ modelValue: 'general', fromData: true, switcher: true });

    expect(tabs.panelCount).toBe(0);
    expect(tabs.tab('General').attributes('aria-controls')).toBeUndefined();

    await tabs.clickTab('Team');
    expect(tabs.tab('Team').attributes('aria-selected')).toBe('true');

    tabs.unmount();
  });

  it('moves with arrows and activates automatically, skipping disabled tabs and looping', async () => {
    const tabs = TabsDriver.mount({ modelValue: 'general' });
    await tabs.focusTab('General');
    await tabs.press('ArrowRight');
    expect(tabs.focusedTab).toBe('Team');
    expect(tabs.selected).toBe('team');

    await tabs.press('ArrowRight');
    await tabs.press('ArrowRight');
    expect(tabs.selected).toBe('general');

    await tabs.press('End');
    expect(tabs.selected).toBe('danger');
    expect(tabs.tabIndexes).toEqual([-1, -1, -1, 0]);

    await tabs.clickTab('Billing');
    expect(tabs.selected).toBe('danger');

    tabs.unmount();
  });

  it('only moves focus in manual mode and returns the tab stop to the selected tab on leave', async () => {
    const tabs = TabsDriver.mount({ modelValue: 'general', props: { activation: 'manual' } });
    await tabs.focusTab('General');
    await tabs.press('ArrowRight');
    expect(tabs.focusedTab).toBe('Team');
    expect(tabs.selected).toBe('general');
    expect(tabs.tabIndexes).toEqual([-1, -1, 0, -1]);

    await tabs.focusOutside();
    expect(tabs.tabIndexes).toEqual([0, -1, -1, -1]);

    await tabs.clickTab('Team');
    expect(tabs.selected).toBe('team');

    tabs.unmount();
  });

  it('keeps right and middle clicks from focusing and so activating a tab', () => {
    const tabs = TabsDriver.mount({ modelValue: 'general' });

    expect(tabs.pressTabButton('Team', 2)).toBe(true);
    expect(tabs.pressTabButton('Team', 1)).toBe(true);
    expect(tabs.pressTabButton('Team', 0)).toBe(false);
    expect(tabs.selected).toBe('general');
  });

  it('swaps arrows in RTL and walks vertical lists with ArrowDown', async () => {
    const rtl = TabsDriver.mount({ modelValue: 'general', dir: 'rtl' });
    await rtl.focusTab('General');
    await rtl.press('ArrowLeft');
    expect(rtl.selected).toBe('team');

    await rtl.press('ArrowRight');
    expect(rtl.selected).toBe('general');

    rtl.unmount();

    const vertical = TabsDriver.mount({
      modelValue: 'general',
      props: { orientation: 'vertical' },
    });

    expect(vertical.list.attributes('aria-orientation')).toBe('vertical');

    await vertical.focusTab('General');
    await vertical.press('ArrowDown');
    expect(vertical.selected).toBe('team');

    await vertical.press('ArrowRight');
    expect(vertical.selected).toBe('team');

    vertical.unmount();
  });

  it('renders lazy panels after their first activation and keeps them mounted', async () => {
    const tabs = TabsDriver.mount({ modelValue: 'general', lazyPanels: ['danger'] });
    expect(tabs.panelText('team')).toBe('Team panel');
    expect(tabs.panelText('danger')).toBe('');

    await tabs.receive('danger');
    expect(tabs.panelText('danger')).toBe('Danger panel');

    await tabs.receive('general');
    expect(tabs.panelText('danger')).toBe('Danger panel');
    expect(tabs.panelVisible('danger')).toBe(false);

    tabs.unmount();
  });

  it('keeps a panel in the Tab order unless it holds controls of its own', () => {
    const tabs = TabsDriver.mount({ modelValue: 'general', unfocusablePanels: ['team'] });
    expect(tabs.panelTabIndex('general')).toBe('0');
    expect(tabs.panelTabIndex('team')).toBeUndefined();

    tabs.unmount();
  });

  it('builds the list and panels from data and exposes the indicator position', async () => {
    const tabs = TabsDriver.mount({
      modelValue: 'team',
      fromData: true,
      props: { variant: 'soft' },
    });

    expect(tabs.labels).toEqual(['General', 'Billing', 'Team', 'Danger']);
    expect(tabs.panelText('team')).toBe('Team panel');
    expect(tabs.hasRootModifier('variant-soft')).toBe(true);

    await tabs.ready();
    expect(tabs.indicatorVars).toEqual({ start: '0px', size: '0px' });

    await tabs.clickTab('Danger');
    expect(tabs.selected).toBe('danger');
    expect(tabs.panelVisible('danger')).toBe(true);

    tabs.unmount();
  });

  it('keeps the indicator under the selected tab when the tab changes its size', async () => {
    const tabs = TabsDriver.mount({ modelValue: 'team', observed: true });
    await tabs.ready();
    expect(tabs.indicatorVars).toEqual({ start: '0px', size: '0px' });

    await tabs.resizeTab('Team', { start: 96, size: 140 });
    expect(tabs.indicatorVars).toEqual({ start: '96px', size: '140px' });

    await tabs.resizeTab('General', { start: 0, size: 120 });
    expect(tabs.indicatorVars).toEqual({ start: '96px', size: '140px' });

    tabs.unmount();
  });

  it('keeps the selected tab in view while tabs change their size until the user pages the list', async () => {
    const tabs = TabsDriver.mount({ modelValue: 'danger', observed: true });

    await tabs.ready();
    await tabs.scrollTrack({ scrollWidth: 600, clientWidth: 200, scrollLeft: 0 });
    await tabs.resizeTab('Danger', { start: 230, size: 80 });

    expect(tabs.scrolled).toBe(110);

    await tabs.clickEdge('start');
    await tabs.resizeTab('Danger', { start: 260, size: 80 });

    expect(tabs.scrolled).toBe(0);

    tabs.unmount();
  });

  it('shows an edge button only where tabs are hidden and pages the list with it', async () => {
    const tabs = TabsDriver.mount({ modelValue: 'general' });

    await tabs.ready();

    expect(tabs.edges).toEqual({ start: false, end: false });

    await tabs.scrollTrack({ scrollWidth: 600, clientWidth: 200, scrollLeft: 0 });

    expect(tabs.edges).toEqual({ start: false, end: true });
    expect(tabs.fades).toEqual({ start: false, end: true });

    await tabs.clickEdge('end');

    expect(tabs.scrolled).toBe(160);
    expect(tabs.edges).toEqual({ start: true, end: true });

    await tabs.clickEdge('end');
    await tabs.clickEdge('end');

    expect(tabs.scrolled).toBe(400);
    expect(tabs.edges).toEqual({ start: true, end: false });

    await tabs.clickEdge('start');

    expect(tabs.scrolled).toBe(240);

    tabs.unmount();
  });

  it('pages towards the visual end in RTL and shows no edges on a vertical list', async () => {
    const rtl = TabsDriver.mount({ modelValue: 'general', dir: 'rtl' });

    await rtl.ready();
    await rtl.scrollTrack({ scrollWidth: 600, clientWidth: 200, scrollLeft: 0, rtl: true });
    await rtl.clickEdge('end');

    expect(rtl.scrolled).toBe(-160);
    expect(rtl.edges).toEqual({ start: true, end: true });

    rtl.unmount();

    const vertical = TabsDriver.mount({
      modelValue: 'general',
      props: { orientation: 'vertical' },
    });

    await vertical.ready();
    await vertical.scrollTrack({ scrollWidth: 600, clientWidth: 200, scrollLeft: 0 });

    expect(vertical.edges).toEqual({ start: false, end: false });
    expect(await vertical.wheel(100)).toBe(false);

    vertical.unmount();
  });

  it('scrolls an overflowing list with a vertical wheel and leaves the wheel to the page otherwise', async () => {
    const tabs = TabsDriver.mount({ modelValue: 'general' });

    await tabs.ready();

    expect(await tabs.wheel(100)).toBe(false);

    await tabs.scrollTrack({ scrollWidth: 600, clientWidth: 200, scrollLeft: 0 });

    expect(await tabs.wheel(-100)).toBe(false);
    expect(await tabs.wheel(100, { shiftKey: true })).toBe(false);
    expect(await tabs.wheel(100, { deltaX: 40 })).toBe(false);
    expect(await tabs.wheel(100)).toBe(true);
    expect(tabs.scrolled).toBe(100);

    expect(await tabs.wheel(3, { deltaMode: WheelEvent.DOM_DELTA_LINE })).toBe(true);
    expect(tabs.scrolled).toBe(148);

    expect(await tabs.wheel(1000)).toBe(true);
    expect(await tabs.wheel(1000)).toBe(false);
    expect(tabs.scrolled).toBe(400);

    tabs.unmount();
  });

  it('brings a tab selected from outside into view without scrolling the page', async () => {
    const tabs = TabsDriver.mount({ modelValue: 'general' });

    await tabs.ready();
    await tabs.scrollTrack({ scrollWidth: 600, clientWidth: 200, scrollLeft: 0 });
    tabs.placeTab('Danger', { start: 300, size: 80 });
    await tabs.receive('danger');

    expect(tabs.scrolled).toBe(180);

    tabs.placeTab('General', { start: -180, size: 60 });
    await tabs.receive('general');

    expect(tabs.scrolled).toBe(0);

    tabs.unmount();
  });

  it('closes a closable tab from its cross, the middle button and Delete', async () => {
    const tabs = TabsDriver.mount({
      modelValue: 'general',
      closable: ['general', 'team', 'danger'],
    });

    expect(tabs.closableLabels).toEqual(['General', 'Team', 'Danger']);
    expect(tabs.crossHiddenFromAssistiveTechnology('Team')).toBe(true);

    await tabs.clickCross('Danger');
    expect(tabs.closed).toEqual(['danger']);
    expect(tabs.selected).toBe('general');

    await tabs.middleClickTab('Team');
    expect(tabs.closed).toEqual(['danger', 'team']);
    expect(tabs.labels).toEqual(['General', 'Billing']);

    await tabs.middleClickTab('Billing');
    expect(tabs.closed).toEqual(['danger', 'team']);

    await tabs.focusTab('General');
    await tabs.press('Delete');
    expect(tabs.closed).toEqual(['danger', 'team', 'general']);
    expect(tabs.labels).toEqual(['Billing']);

    tabs.unmount();
  });

  it('moves the focus of a closed tab to the selected one', async () => {
    const tabs = TabsDriver.mount({ modelValue: 'team', closable: ['team'] });
    await tabs.focusTab('Team');
    await tabs.press('Delete');
    expect(tabs.labels).toEqual(['General', 'Billing', 'Danger']);
    expect(tabs.selected).toBe('danger');
    expect(tabs.focusedTab).toBe('Danger');

    tabs.unmount();
  });

  it('leaves a disabled tab open and reports a closed tab of the data list by its value', async () => {
    const tabs = TabsDriver.mount({
      modelValue: 'general',
      fromData: true,
      closable: ['billing', 'team'],
    });

    await tabs.clickCross('Billing');
    expect(tabs.closed).toEqual([]);

    await tabs.clickCross('Team');
    expect(tabs.closed).toEqual(['team']);
    expect(tabs.labels).toEqual(['General', 'Billing', 'Danger']);

    tabs.unmount();
  });

  it('renders links in a labelled nav and marks the current page instead of tab roles', async () => {
    const tabs = TabsDriver.mount({ links: SECTIONS, modelValue: '#orders' });

    await tabs.ready();

    expect(tabs.nav.attributes('aria-label')).toBe('Sections');
    expect(tabs.roles).toEqual([]);
    expect(tabs.linkLabels).toEqual(['Overview', 'Orders', 'Archive']);
    expect(tabs.hrefs).toEqual(['#overview', '#orders', undefined]);
    expect(tabs.currentLinks).toEqual(['Orders']);
    expect(tabs.link('Orders').classes()).toContain('nui-tab--selected');
    expect(tabs.link('Overview').element.tabIndex).toBe(0);
    expect(tabs.link('Archive').attributes('aria-disabled')).toBe('true');
    expect(tabs.link('Archive').attributes('tabindex')).toBe('-1');

    tabs.unmount();
  });

  it('follows a plain click on a link but not a modified click or a disabled link', async () => {
    const tabs = TabsDriver.mount({ links: SECTIONS, modelValue: '#overview' });

    expect(await tabs.clickLink('Orders', { ctrlKey: true })).toBe(false);
    expect(tabs.selected).toBe('#overview');

    expect(await tabs.clickLink('Archive')).toBe(true);
    expect(tabs.selected).toBe('#overview');

    await tabs.clickLink('Orders');

    expect(tabs.selected).toBe('#orders');
    expect(tabs.currentLinks).toEqual(['Orders']);

    tabs.unmount();
  });

  it('routes links through the registered router link and keys object locations by getKey', async () => {
    const routed = TabsDriver.mount({
      links: [{ to: '/orders', label: 'Orders' }],
      modelValue: '/orders',
      routerComponent: RouterStub,
    });

    expect(routed.hrefs).toEqual(['/router/orders']);
    expect(routed.currentLinks).toEqual(['Orders']);

    routed.unmount();

    const keyed = TabsDriver.mount({
      links: [
        { to: { path: '/orders' }, label: 'Orders' },
        { to: { path: '/clients' }, label: 'Clients' },
      ],
      modelValue: '/clients',
      props: { as: RouteObjectStub, getKey: pathOf },
    });

    expect(keyed.hrefs).toEqual(['/route/orders', '/route/clients']);
    expect(keyed.currentLinks).toEqual(['Clients']);

    keyed.unmount();
  });
});
