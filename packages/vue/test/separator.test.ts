import { describe, expect, it } from 'vite-plus/test';
import { SeparatorDriver } from './drivers/separator';

describe('NuiSeparator', () => {
  it('is a horizontal semantic separator by default', () => {
    const separator = SeparatorDriver.mount();
    expect(separator.role).toBe('separator');
    expect(separator.orientation).toBeUndefined();
    expect(separator.hasModifier('orientation-horizontal')).toBe(true);
    expect(separator.hasModifier('labelled')).toBe(false);
    expect(separator.labelText).toBeUndefined();
  });

  it('announces a vertical orientation and drops semantics when decorative', () => {
    const vertical = SeparatorDriver.mount({ props: { orientation: 'vertical' } });
    expect(vertical.orientation).toBe('vertical');
    expect(vertical.hasModifier('orientation-vertical')).toBe(true);

    const decorative = SeparatorDriver.mount({
      props: { orientation: 'vertical', decorative: true },
    });

    expect(decorative.role).toBe('none');
    expect(decorative.orientation).toBeUndefined();
  });

  it('shows a label from the prop or the slot between the lines', () => {
    expect(SeparatorDriver.mount({ props: { label: 'or' } }).labelText).toBe('or');

    const slotted = SeparatorDriver.mount({ props: { label: 'or' }, slot: 'either' });
    expect(slotted.labelText).toBe('either');
    expect(slotted.hasModifier('labelled')).toBe(true);
  });
});
