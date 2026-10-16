import { flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
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

  describe('opened by hover', () => {
    afterEach(() => vi.useRealTimers());

    it('opens after the delay, stays open while the pointer is over the content and closes after leaving', async () => {
      vi.useFakeTimers();

      const popover = PopoverDriver.mount({
        props: { id: 'card', trigger: 'hover', openDelay: 400, closeDelay: 200 },
      });

      expect(popover.trigger.attributes('popovertarget')).toBeUndefined();
      expect(popover.trigger.attributes('aria-controls')).toBe('card');
      expect(popover.content.attributes('popover')).toBe('manual');
      await popover.hover();
      await popover.advance(399);
      expect(popover.modelOpen).toBe(false);
      await popover.advance(1);
      expect(popover.modelOpen).toBe(true);
      expect(popover.trigger.attributes('aria-expanded')).toBe('true');
      await popover.leave();
      await popover.hoverContent();
      await popover.advance(500);
      expect(popover.modelOpen).toBe(true);
      await popover.leaveContent();
      await popover.advance(199);
      expect(popover.modelOpen).toBe(true);
      await popover.advance(1);
      expect(popover.modelOpen).toBe(false);
      popover.unmount();
    });

    it('opens on keyboard focus, keeps focus inside the content and closes on Escape back to the trigger', async () => {
      const popover = PopoverDriver.mount({ props: { trigger: 'hover' } });

      await popover.focusTrigger();
      expect(popover.modelOpen).toBe(true);
      await popover.focusContent();
      expect(popover.modelOpen).toBe(true);
      await popover.pressEscape();
      expect(popover.modelOpen).toBe(false);
      expect(popover.triggerFocused).toBe(true);
      await popover.focusOutside();
      await popover.focusTrigger();
      expect(popover.modelOpen).toBe(true);
      await popover.focusOutside();
      expect(popover.modelOpen).toBe(false);
      popover.unmount();
    });

    it('toggles on a tap and ignores a mouse press that focuses the trigger', async () => {
      const popover = PopoverDriver.mount({ props: { trigger: 'hover' } });

      await popover.click();
      expect(popover.modelOpen).toBe(false);
      await popover.focusOutside();
      await popover.tap();
      expect(popover.modelOpen).toBe(true);
      await popover.tap();
      expect(popover.modelOpen).toBe(false);
      popover.unmount();
    });
  });
});
