import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipDriver } from './drivers/tooltip';

describe('NuiTooltip', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('describes the trigger with a manual popover and opens after the hover delay', async () => {
    const tooltip = TooltipDriver.mount({ props: { id: 'hint', openDelay: 300, closeDelay: 100 } });
    expect(tooltip.trigger.attributes('aria-describedby')).toBe('hint');
    expect(tooltip.content.attributes('role')).toBe('tooltip');
    expect(tooltip.content.attributes('popover')).toBe('manual');
    await tooltip.hover();
    await tooltip.advance(299);
    expect(tooltip.modelOpen).toBe(false);
    await tooltip.advance(1);
    expect(tooltip.modelOpen).toBe(true);
    expect(tooltip.popoverCalls.show).toBe(1);
    await tooltip.leave();
    await tooltip.hoverContent();
    await tooltip.advance(200);
    expect(tooltip.modelOpen).toBe(true);
    await tooltip.leave();
    await tooltip.advance(100);
    expect(tooltip.modelOpen).toBe(false);
    tooltip.unmount();
  });

  it('opens on keyboard focus immediately, closes on Escape and blur, and ignores touch and presses', async () => {
    const tooltip = TooltipDriver.mount();
    await tooltip.focus();
    expect(tooltip.modelOpen).toBe(true);
    await tooltip.pressEscape();
    expect(tooltip.modelOpen).toBe(false);
    await tooltip.focus();
    await tooltip.blur();
    expect(tooltip.modelOpen).toBe(false);
    await tooltip.tap();
    await tooltip.advance(1000);
    expect(tooltip.modelOpen).toBe(false);
    await tooltip.press();
    await tooltip.advance(1000);
    expect(tooltip.modelOpen).toBe(false);
    tooltip.unmount();
  });

  it('stays silent while disabled and drops the description from its trigger', async () => {
    const tooltip = TooltipDriver.mount({ props: { disabled: true } });
    expect(tooltip.trigger.attributes('aria-describedby')).toBeUndefined();
    await tooltip.hover();
    await tooltip.advance(400);
    expect(tooltip.modelOpen).toBe(false);
    await tooltip.focus();
    expect(tooltip.modelOpen).toBe(false);
    expect(tooltip.popoverCalls.show).toBe(0);
    tooltip.unmount();
  });
});
