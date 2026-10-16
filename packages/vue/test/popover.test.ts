import { flushPromises } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { PopoverDriver } from './drivers/popover';

describe('NuiPopover', () => {
  it('links the trigger to the content natively and mirrors the model', async () => {
    const popover = PopoverDriver.mount({ props: { id: 'filters' } });
    expect(popover.trigger.attributes('popovertarget')).toBe('filters');
    expect(popover.trigger.attributes('aria-controls')).toBe('filters');
    expect(popover.trigger.attributes('aria-expanded')).toBe('false');
    expect(popover.content.attributes('id')).toBe('filters');
    expect(popover.content.attributes('popover')).toBe('auto');
    expect(popover.content.text()).toBe('Content');
    expect(popover.content.classes()).toContain('nui-popover--padding-md');
    expect(popover.popoverCalls.show).toBe(0);
    await popover.receiveOpen(true);
    expect(popover.popoverCalls.show).toBe(1);
    expect(popover.trigger.attributes('aria-expanded')).toBe('true');
    await popover.receiveOpen(false);
    expect(popover.popoverCalls.hide).toBe(1);
    popover.unmount();
  });

  it('follows native light dismiss and writes the resolved side onto the element', async () => {
    const popover = PopoverDriver.mount({
      open: true,
      props: { placement: 'right-start', arrow: true, padding: 'sm' },
    });

    expect(popover.content.classes()).toContain('nui-popover--padding-sm');

    expect(popover.popoverCalls.show).toBe(1);
    expect(popover.sideVector).toBe('1 0');
    expect(popover.arrow.exists()).toBe(true);
    popover.dismissNatively();
    expect(popover.modelOpen).toBe(false);
    popover.unmount();
  });

  it('positions with fixed strategy once open and generates an id when none is given', async () => {
    const popover = PopoverDriver.mount({ open: true });
    const id = popover.content.attributes('id');
    expect(id).toBeTruthy();
    expect(popover.trigger.attributes('popovertarget')).toBe(id);
    await flushPromises();
    expect(popover.content.attributes('style')).toContain('position: fixed');
    expect(popover.arrow.exists()).toBe(false);
    popover.unmount();
  });

  it('sticks to an anchor instead of the trigger and stays open in manual mode', async () => {
    const anchor = document.createElement('span');

    document.body.append(anchor);

    const popover = PopoverDriver.mount({ open: true, props: { anchor, mode: 'manual' } });

    await flushPromises();

    expect(popover.content.attributes('popover')).toBe('manual');
    expect(popover.content.attributes('style')).toContain('position: fixed');
    popover.unmount();
    anchor.remove();
  });
});
