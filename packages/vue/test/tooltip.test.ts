import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { TooltipTargetsDriver, TooltipDriver } from './drivers/tooltip';

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

  it('closes a hovered tooltip on Escape pressed anywhere on the page', async () => {
    const tooltip = TooltipDriver.mount({ props: { openDelay: 0 } });
    await tooltip.focusOutside();
    await tooltip.hover();
    expect(tooltip.modelOpen).toBe(true);

    await tooltip.pressEscapeOutside();
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

  it('follows an external anchor element without describing it and stops listening once unmounted', async () => {
    const tooltip = TooltipDriver.mount({ anchored: true, props: { openDelay: 300 } });
    expect(tooltip.trigger.attributes('aria-describedby')).toBeUndefined();

    await tooltip.hover();
    await tooltip.advance(300);
    expect(tooltip.modelOpen).toBe(true);

    await tooltip.pressEscape();
    expect(tooltip.modelOpen).toBe(false);

    await tooltip.focus();
    expect(tooltip.modelOpen).toBe(true);

    await tooltip.blur();
    expect(tooltip.modelOpen).toBe(false);

    tooltip.unmount();
    const silent = TooltipDriver.mount({ anchored: true, props: { disabled: true } });
    await silent.focus();
    expect(silent.modelOpen).toBe(false);

    silent.unmount();
  });

  it('serves every target of a container with one tooltip and moves between them at once', async () => {
    const hint = TooltipTargetsDriver.mount();

    await hint.ready();

    await hint.hover('Bold');
    await hint.hover('Bold', null, true);
    await hint.advance(299);
    expect(hint.open).toBe(false);

    await hint.advance(1);
    expect(hint.open).toBe(true);
    expect(hint.text).toBe('Bold');
    expect(hint.describedBy('Bold')).toBe('hint');

    await hint.hover('Italic', 'Bold');

    expect(hint.open).toBe(true);
    expect(hint.text).toBe('Italic');
    expect(hint.describedBy('Bold')).toBeNull();
    expect(hint.describedBy('Italic')).toBe('hint');

    await hint.hoverGap('Italic');
    await hint.advance(100);

    expect(hint.open).toBe(false);

    hint.unmount();
  });

  it('follows the focus between the targets of a container and closes when it leaves them', async () => {
    const hint = TooltipTargetsDriver.mount();

    await hint.ready();

    await hint.focus('Bold');
    expect(hint.open).toBe(true);
    expect(hint.text).toBe('Bold');

    await hint.focus('Italic', 'Bold');

    expect(hint.open).toBe(true);
    expect(hint.text).toBe('Italic');

    await hint.blur('Italic');

    expect(hint.open).toBe(false);

    hint.unmount();
  });
});
