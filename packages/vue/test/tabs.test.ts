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
});
