import { describe, expect, it } from 'vitest';
import { SplitterDriver } from './drivers/splitter';

describe('NuiSplitter', () => {
  it('exposes the divider as a separator that controls the start pane', () => {
    const splitter = SplitterDriver.mount({ ratio: 0.3 });
    expect(splitter.ariaOrientation).toBe('vertical');
    expect(splitter.valueNow).toBe(30);
    expect(splitter.label).toBe('Resize panes');
    expect(splitter.controls).toBe(splitter.startPaneId);
    expect(splitter.cssRatio).toBe('0.3');
    expect(splitter.hasModifier('orientation-horizontal')).toBe(true);
    const vertical = SplitterDriver.mount({ props: { orientation: 'vertical' } });
    expect(vertical.ariaOrientation).toBe('horizontal');
  });

  it('follows the pointer within its bounds and reads the writing direction', async () => {
    const splitter = SplitterDriver.mount({ props: { min: 0.2, max: 0.8 } });
    await splitter.dragTo(100);
    expect(splitter.ratio.value).toBe(0.25);
    expect(splitter.hasModifier('dragging')).toBe(false);
    await splitter.dragTo(390);
    expect(splitter.ratio.value).toBe(0.8);
    const rtl = SplitterDriver.mount({ dir: 'rtl' });
    await rtl.dragTo(100);
    expect(rtl.ratio.value).toBe(0.75);
    const vertical = SplitterDriver.mount({ props: { orientation: 'vertical' } });
    await vertical.drag(100, 50, 'y');
    expect(vertical.ratio.value).toBe(0.25);
  });

  it('steps with the keyboard, jumps to the bounds and ignores input when disabled', async () => {
    const splitter = SplitterDriver.mount({ props: { step: 0.1, min: 0.2, max: 0.7 } });
    await splitter.press('ArrowRight');
    expect(splitter.ratio.value).toBeCloseTo(0.6);
    await splitter.press('ArrowLeft');
    expect(splitter.ratio.value).toBeCloseTo(0.5);
    await splitter.press('End');
    expect(splitter.ratio.value).toBe(0.7);
    await splitter.press('Home');
    expect(splitter.ratio.value).toBe(0.2);
    await splitter.press('ArrowUp');
    expect(splitter.ratio.value).toBe(0.2);
    const rtl = SplitterDriver.mount({ dir: 'rtl', props: { step: 0.1 } });
    await rtl.press('ArrowLeft');
    expect(rtl.ratio.value).toBeCloseTo(0.6);
    const off = SplitterDriver.mount({ props: { disabled: true } });
    await off.press('ArrowRight');
    expect(off.ratio.value).toBe(0.5);
    expect(off.divider.attributes('tabindex')).toBe('-1');
  });

  it('speaks the configured language and lets the label prop win', () => {
    expect(SplitterDriver.mount({ config: { locale: 'ru-RU' } }).label).toBe(
      'Изменить размер панелей',
    );

    expect(SplitterDriver.mount({ props: { label: 'Preview width' } }).label).toBe('Preview width');
  });
});
