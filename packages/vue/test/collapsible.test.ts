import { describe, expect, it } from 'vite-plus/test';
import { CollapsibleDriver } from './drivers/collapsible';

describe('NuiCollapsible', () => {
  it('starts closed with content hidden until found and opens from the trigger', async () => {
    const collapsible = CollapsibleDriver.mount({ props: { label: 'More' } });
    expect(collapsible.label).toBe('More');
    expect(collapsible.expanded).toBe(false);
    expect(collapsible.controls).toBe(collapsible.contentId);
    expect(collapsible.hiddenState).toBe('until-found');
    expect(collapsible.headingTag).toBe('div');
    expect(collapsible.hasModifier('variant-plain')).toBe(true);

    await collapsible.toggle();
    expect(collapsible.open.value).toBe(true);
    expect(collapsible.expanded).toBe(true);
    expect(collapsible.hiddenState).toBeUndefined();
    expect(collapsible.hasModifier('open')).toBe(true);
    expect(collapsible.contentText).toBe('Details');
  });

  it('keeps the content visible while collapsing and hides it once the motion settles', async () => {
    const collapsible = CollapsibleDriver.mount({ open: true, props: { label: 'More' } });
    expect(collapsible.hiddenState).toBeUndefined();

    await collapsible.toggle();
    expect(collapsible.open.value).toBe(false);
    expect(collapsible.hiddenState).toBeUndefined();

    await collapsible.settleCollapse();
    expect(collapsible.hiddenState).toBe('until-found');

    await collapsible.matchInside();
    expect(collapsible.open.value).toBe(true);
    expect(collapsible.hiddenState).toBeUndefined();
  });

  it('renders a heading, the card look, a custom trigger and a disabled state', async () => {
    const collapsible = CollapsibleDriver.mount({
      props: { label: 'More', headingLevel: 3, variant: 'card', disabled: true },
      trigger: 'Custom',
    });

    expect(collapsible.headingTag).toBe('h3');
    expect(collapsible.hasModifier('variant-card')).toBe(true);
    expect(collapsible.hasModifier('disabled')).toBe(true);
    expect(collapsible.label).toBe('Custom');
    expect(collapsible.trigger.element.disabled).toBe(true);

    await collapsible.receive(true);
    expect(collapsible.expanded).toBe(true);
  });
});
