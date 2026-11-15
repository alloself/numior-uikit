import { describe, expect, it } from 'vite-plus/test';
import { ToggleGroupDriver } from './drivers/toggle-group';

describe('NuiToggleGroup', () => {
  it('selects one value as a group of radios and can clear it unless required', async () => {
    const group = ToggleGroupDriver.mount({ modelValue: 'dark', props: { label: 'Theme' } });
    expect(group.attribute('role')).toBe('radiogroup');
    expect(group.attribute('aria-label')).toBe('Theme');
    expect(group.roles).toEqual(['radio', 'radio', 'radio', 'radio']);
    expect(group.checkedStates).toEqual(['false', 'true', 'false', 'false']);
    expect(group.selectedLabels).toEqual(['Dark']);
    expect(group.hasModifier('variant-outline')).toBe(true);

    await group.click('Light');
    expect(group.selected).toBe('light');
    expect(group.selectedLabels).toEqual(['Light']);

    await group.click('Light');
    expect(group.selected).toBeNull();
    expect(group.selectedLabels).toEqual([]);

    const required = ToggleGroupDriver.mount({ modelValue: 'light', props: { required: true } });
    await required.click('Light');
    expect(required.selected).toBe('light');
  });

  it('keeps aria-orientation on the radiogroup only', () => {
    const single = ToggleGroupDriver.mount({ props: { orientation: 'vertical', label: 'Theme' } });
    expect(single.attribute('role')).toBe('radiogroup');
    expect(single.attribute('aria-orientation')).toBe('vertical');

    const many = ToggleGroupDriver.mount({
      props: { orientation: 'vertical', multiple: true, label: 'Panels' },
    });

    expect(many.attribute('role')).toBe('group');
    expect(many.attribute('aria-orientation')).toBeUndefined();

    single.unmount();
    many.unmount();
  });

  it('toggles several pressed buttons in multiple mode', async () => {
    const group = ToggleGroupDriver.mount({ props: { multiple: true }, modelValue: ['light'] });
    expect(group.attribute('role')).toBe('group');
    expect(group.roles).toEqual([undefined, undefined, undefined, undefined]);
    expect(group.pressedStates).toEqual(['true', 'false', 'false', 'false']);

    await group.click('Dark');
    expect(group.selected).toEqual(['light', 'dark']);

    await group.click('Light');
    expect(group.selected).toEqual(['dark']);
    expect(group.selectedLabels).toEqual(['Dark']);
  });

  it('keeps the last pressed item of a required multiple group', async () => {
    const group = ToggleGroupDriver.mount({
      props: { multiple: true, required: true },
      modelValue: ['light', 'dark'],
    });

    await group.click('Light');
    expect(group.selected).toEqual(['dark']);

    await group.click('Dark');
    expect(group.selected).toEqual(['dark']);
    expect(group.pressedStates).toEqual(['false', 'true', 'false', 'false']);

    await group.click('Auto');
    expect(group.selected).toEqual(['dark', 'auto']);

    group.unmount();
  });

  it('puts the tooltip of a vertical group on the inline-end side in both directions', async () => {
    const ltr = ToggleGroupDriver.mount({ props: { iconOnly: true, orientation: 'vertical' } });
    await ltr.focus('Light');
    expect(ltr.tooltipSide('Light')).toBe('1 0');

    ltr.unmount();

    const rtl = ToggleGroupDriver.mount({
      props: { iconOnly: true, orientation: 'vertical' },
      dir: 'rtl',
    });

    await rtl.focus('Light');
    expect(rtl.tooltipSide('Light')).toBe('-1 0');

    rtl.unmount();
    const row = ToggleGroupDriver.mount({ props: { iconOnly: true }, dir: 'rtl' });
    await row.focus('Light');
    expect(row.tooltipSide('Light')).toBe('0 1');

    row.unmount();
  });

  it('names an icon-only item once and does not describe it with the same text', () => {
    const icons = ToggleGroupDriver.mount({ props: { iconOnly: true } });
    expect(icons.names).toEqual(['Light', 'Dark', 'System', 'Auto']);
    expect(icons.descriptions).toEqual([undefined, undefined, undefined, undefined]);

    icons.unmount();
    const labelled = ToggleGroupDriver.mount();
    expect(labelled.names).toEqual([undefined, undefined, undefined, undefined]);
    expect(labelled.descriptions).toEqual([undefined, undefined, undefined, undefined]);

    labelled.unmount();
  });

  it('roves focus with the arrows without selecting and rests on the selected item', async () => {
    const group = ToggleGroupDriver.mount({ modelValue: 'dark' });
    await group.ready();
    expect(group.tabIndexes).toEqual([-1, 0, -1, -1]);

    await group.focus('Dark');
    await group.press('ArrowRight');
    expect(group.focusedLabel).toBe('Auto');
    expect(group.selected).toBe('dark');

    await group.press('ArrowRight');
    expect(group.focusedLabel).toBe('Light');

    await group.press('End');
    expect(group.focusedLabel).toBe('Auto');
    expect(group.tabIndexes).toEqual([-1, -1, -1, 0]);

    await group.focusOutside();
    expect(group.tabIndexes).toEqual([-1, 0, -1, -1]);
  });

  it('shows icons only with accessible names, respects disabled and the segmented look', () => {
    const icons = ToggleGroupDriver.mount({
      props: { iconOnly: true, variant: 'segmented', orientation: 'vertical', size: 'sm' },
    });

    expect(icons.hasLabels).toBe(false);
    expect(icons.labels).toEqual(['Light', 'Dark', 'System', 'Auto']);
    expect(icons.hasModifier('icon-only')).toBe(true);
    expect(icons.hasModifier('variant-segmented')).toBe(true);
    expect(icons.hasModifier('orientation-vertical')).toBe(true);
    expect(icons.hasModifier('size-sm')).toBe(true);
    expect(icons.attribute('aria-orientation')).toBe('vertical');
    expect(icons.item('System').element.disabled).toBe(true);

    const off = ToggleGroupDriver.mount({ props: { disabled: true } });
    expect(off.hasModifier('disabled')).toBe(true);
    expect(off.items.every((item) => item.element.disabled)).toBe(true);
  });

  it('shows an edge button only where items are hidden and pages the group with it', async () => {
    const group = ToggleGroupDriver.mount({ modelValue: 'light', props: { label: 'Theme' } });

    await group.ready();

    expect(group.edges).toEqual({ start: false, end: false });

    expect(group.edgeButtons.map((edge) => edge.attributes('aria-hidden'))).toEqual([
      'true',
      'true',
    ]);

    await group.scrollTrack({ scrollWidth: 600, clientWidth: 200, scrollLeft: 0 });

    expect(group.edges).toEqual({ start: false, end: true });
    expect(group.fades).toEqual({ start: false, end: true });

    await group.clickEdge('end');

    expect(group.scrolled).toBe(160);
    expect(group.edges).toEqual({ start: true, end: true });

    await group.clickEdge('end');
    await group.clickEdge('end');

    expect(group.scrolled).toBe(400);
    expect(group.edges).toEqual({ start: true, end: false });

    await group.clickEdge('start');

    expect(group.scrolled).toBe(240);
    expect(group.tabIndexes).toEqual([0, -1, -1, -1]);

    group.unmount();
  });

  it('scrolls an overflowing group with a vertical wheel and leaves the wheel to the page otherwise', async () => {
    const group = ToggleGroupDriver.mount({ modelValue: 'light' });

    await group.ready();

    expect(await group.wheel(100)).toBe(false);

    await group.scrollTrack({ scrollWidth: 600, clientWidth: 200, scrollLeft: 0 });

    expect(await group.wheel(-100)).toBe(false);
    expect(await group.wheel(100, { shiftKey: true })).toBe(false);
    expect(await group.wheel(100)).toBe(true);
    expect(group.scrolled).toBe(100);

    expect(await group.wheel(1000)).toBe(true);
    expect(await group.wheel(1000)).toBe(false);
    expect(group.scrolled).toBe(400);

    group.unmount();
  });

  it('pages towards the visual end in RTL and shows no edges in a vertical group', async () => {
    const rtl = ToggleGroupDriver.mount({ modelValue: 'light', dir: 'rtl' });

    await rtl.ready();
    await rtl.scrollTrack({ scrollWidth: 600, clientWidth: 200, scrollLeft: 0, rtl: true });
    await rtl.clickEdge('end');

    expect(rtl.scrolled).toBe(-160);
    expect(rtl.edges).toEqual({ start: true, end: true });

    rtl.unmount();

    const vertical = ToggleGroupDriver.mount({
      modelValue: 'light',
      props: { orientation: 'vertical' },
    });

    await vertical.ready();
    await vertical.scrollTrack({ scrollWidth: 600, clientWidth: 200, scrollLeft: 0 });

    expect(vertical.edges).toEqual({ start: false, end: false });
    expect(await vertical.wheel(100)).toBe(false);

    vertical.unmount();
  });

  it('keeps the pressed item in view while sizes change until the user scrolls', async () => {
    const group = ToggleGroupDriver.mount({ modelValue: 'auto', observed: true });

    await group.ready();
    await group.scrollTrack({ scrollWidth: 600, clientWidth: 200, scrollLeft: 0 });
    await group.resizeItem('Auto', { start: 230, size: 80 });

    expect(group.scrolled).toBe(110);

    expect(await group.wheel(40)).toBe(true);

    await group.resizeItem('Auto', { start: 260, size: 80 });

    expect(group.scrolled).toBe(150);

    group.unmount();
  });

  it('scrolls a chosen item that hides behind the edge into view', async () => {
    const group = ToggleGroupDriver.mount({ modelValue: 'light' });

    await group.ready();
    await group.scrollTrack({ scrollWidth: 600, clientWidth: 200, scrollLeft: 0 });
    group.placeItem('Auto', { start: 170, size: 80 });

    await group.click('Auto');

    expect(group.selected).toBe('auto');
    expect(group.scrolled).toBe(50);

    group.unmount();
  });
});
