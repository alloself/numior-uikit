import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToasterDriver } from './drivers/toaster';

describe('NuiToaster and NuiToast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('is an always-open manual popover live region placed top-end by default', async () => {
    const toaster = ToasterDriver.mount({ props: { label: 'Уведомления' } });
    await toaster.advance(0);
    expect(toaster.region.attributes('popover')).toBe('manual');
    expect(toaster.region.attributes('aria-live')).toBe('polite');
    expect(toaster.region.attributes('role')).toBe('region');
    expect(toaster.region.attributes('aria-label')).toBe('Уведомления');
    expect(toaster.hasModifier('placement-top-end')).toBe(true);
    expect(toaster.popoverCalls.show).toBe(1);
    expect(toaster.toasts).toHaveLength(0);
    toaster.unmount();
  });

  it('renders toasts with tone icon and alert role for errors, then auto-dismisses', async () => {
    const toaster = ToasterDriver.mount({ storeOptions: { duration: 1000 } });
    toaster.success('Saved', { description: 'All changes are stored' });
    toaster.error('Failed');
    await toaster.advance(0);
    const saved = toaster.toast(0);
    const failed = toaster.toast(1);
    expect(saved.title).toBe('Saved');
    expect(saved.description).toBe('All changes are stored');
    expect(saved.hasTone('success')).toBe(true);
    expect(saved.hasIcon).toBe(true);
    expect(saved.role).toBeUndefined();
    expect(failed.role).toBe('alert');
    expect(failed.hasTone('error')).toBe(true);
    await toaster.advance(1000);
    expect(toaster.toast(0).leaving).toBe(true);
    await toaster.advance(200);
    expect(toaster.toasts).toHaveLength(0);
    toaster.unmount();
  });

  it('pauses the timer while hovered or focused and resumes afterwards', async () => {
    const toaster = ToasterDriver.mount({ storeOptions: { duration: 1000 } });
    toaster.show({ title: 'Hover me' });
    await toaster.advance(0);
    const toast = toaster.toast(0);
    await toast.hover();
    await toaster.advance(5000);
    expect(toaster.toast(0).leaving).toBe(false);
    await toast.leave();
    await toaster.advance(1000);
    expect(toaster.toast(0).leaving).toBe(true);
    toaster.unmount();
  });

  it('dismisses a focused toast on Escape and moves focus to its neighbour', async () => {
    const toaster = ToasterDriver.mount({ storeOptions: { duration: 0 } });
    toaster.show({ title: 'First' });
    toaster.show({ title: 'Second' });
    await toaster.advance(0);
    const first = toaster.toast(0);
    await first.focus();
    await first.pressEscape();
    expect(toaster.toast(0).leaving).toBe(true);
    expect(toaster.toast(1).focused).toBe(true);
    toaster.unmount();
  });

  it('runs the action then dismisses, and the close button dismisses', async () => {
    const onClick = vi.fn<() => void>();
    const toaster = ToasterDriver.mount({ storeOptions: { duration: 0 } });
    toaster.show({ title: 'Deleted', action: { label: 'Undo', onClick } });
    toaster.show({ title: 'Plain' });
    await toaster.advance(0);
    await toaster.toast(0).clickAction();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(toaster.toast(0).leaving).toBe(true);
    await toaster.toast(1).clickClose();
    expect(toaster.toast(1).leaving).toBe(true);
    toaster.unmount();
  });

  it('lets the slot own the layout and works without the plugin', async () => {
    const custom = ToasterDriver.mount({ customLayout: true });
    custom.show({ title: 'Custom' });
    await custom.advance(0);
    expect(custom.customLayout.findAll('li')).toHaveLength(1);
    expect(custom.toast(0).title).toBe('Custom');
    custom.unmount();
    const shared = ToasterDriver.mount({ withPlugin: false });
    shared.show({ title: 'Shared' });
    await shared.advance(0);
    expect(shared.toast(0).title).toBe('Shared');
    shared.unmount();
  });

  it('raises the region above an open modal dialog and pauses while the tab is hidden', async () => {
    const toaster = ToasterDriver.mount({ modalOpen: true, storeOptions: { duration: 1000 } });
    await toaster.advance(0);
    toaster.show({ title: 'Above the dialog' });
    await toaster.advance(0);
    expect(toaster.popoverCalls).toEqual({ show: 2, hide: 1 });
    await toaster.setTabHidden(true);
    await toaster.advance(5000);
    expect(toaster.toast(0).leaving).toBe(false);
    await toaster.setTabHidden(false);
    await toaster.advance(1000);
    expect(toaster.toast(0).leaving).toBe(true);
    toaster.unmount();
  });
});
