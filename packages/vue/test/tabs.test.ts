import { describe, expect, it } from 'vitest';
import { TabsDriver } from './drivers/tabs';

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
});
