import { describe, expect, it } from 'vite-plus/test';
import { AccordionDriver } from './drivers/accordion';

describe('NuiAccordion', () => {
  it('opens one section at a time and lets it close again unless told otherwise', async () => {
    const accordion = AccordionDriver.mount({ modelValue: 'install' });
    expect(accordion.expandedLabels).toEqual(['Install']);

    await accordion.click('Usage');
    expect(accordion.selected).toBe('usage');
    expect(accordion.expandedLabels).toEqual(['Usage']);

    await accordion.click('Usage');
    expect(accordion.selected).toBeNull();
    expect(accordion.expandedLabels).toEqual([]);

    const sticky = AccordionDriver.mount({ modelValue: 'faq', props: { collapsible: false } });
    await sticky.click('FAQ');
    expect(sticky.selected).toBe('faq');
    expect(sticky.trigger('API').element.disabled).toBe(true);
  });

  it('carries the supplied id on its root', () => {
    const accordion = AccordionDriver.mount({ props: { id: 'faq' } });
    expect(accordion.attribute('id')).toBe('faq');
  });

  it('keeps several sections open in multiple mode', async () => {
    const accordion = AccordionDriver.mount({ props: { multiple: true }, modelValue: ['usage'] });
    await accordion.click('Install');
    expect(accordion.selected).toEqual(['usage', 'install']);
    expect(accordion.expandedLabels).toEqual(['Install', 'Usage']);

    await accordion.click('Usage');
    expect(accordion.selected).toEqual(['install']);
  });

  it('moves between headers with the arrows and renders them at the requested level', async () => {
    const accordion = AccordionDriver.mount({ props: { headingLevel: 3, variant: 'card' } });
    expect(accordion.headingTags).toEqual(['h3', 'h3', 'h3', 'h3']);
    expect(accordion.hasModifier('variant-card')).toBe(true);

    await accordion.focus('Install');
    await accordion.press('ArrowDown');
    expect(accordion.focusedLabel).toBe('Usage');

    await accordion.press('ArrowDown');
    expect(accordion.focusedLabel).toBe('FAQ');

    await accordion.press('End');
    expect(accordion.focusedLabel).toBe('FAQ');

    await accordion.press('Home');
    expect(accordion.focusedLabel).toBe('Install');
    expect(accordion.expandedLabels).toEqual([]);
  });
});
