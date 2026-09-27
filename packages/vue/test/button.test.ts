import { describe, expect, it } from 'vitest';
import { ButtonDriver } from './drivers/button';

describe('NuiButton', () => {
  it('is a native button that never submits by accident and forwards attributes and clicks', async () => {
    const clicks = { count: 0 };

    const button = ButtonDriver.mount({
      attrs: { 'aria-label': 'Save document' },
      onClick: () => {
        clicks.count += 1;
      },
    });

    expect(button.type).toBe('button');
    expect(button.attribute('aria-label')).toBe('Save document');
    expect(button.text).toBe('Save');
    await button.click();
    expect(clicks.count).toBe(1);
  });

  it('blocks activation while loading and recovers afterwards', async () => {
    const clicks = { count: 0 };

    const button = ButtonDriver.mount({
      props: { loading: true, type: 'submit' },
      onClick: () => {
        clicks.count += 1;
      },
    });

    expect(button.clickNatively()).toBe(true);
    expect(clicks.count).toBe(0);
    expect(button.busy).toBe(true);
    expect(button.disabled).toBe(false);
    expect(button.ariaDisabled).toBe('true');
    expect(button.showsSpinner).toBe(true);
    expect(button.hasModifier('loading')).toBe(true);
    await button.update({ loading: false });
    expect(button.clickNatively()).toBe(false);
    expect(clicks.count).toBe(1);
    expect(button.ariaDisabled).toBeUndefined();
    expect(button.busy).toBe(false);
    expect(button.showsSpinner).toBe(false);
    expect(button.type).toBe('submit');
  });

  it('exposes variant, tone and size as modifiers with solid primary md defaults', () => {
    const defaults = ButtonDriver.mount();
    expect(defaults.hasModifier('variant-solid')).toBe(true);
    expect(defaults.hasModifier('tone-primary')).toBe(true);
    expect(defaults.hasModifier('size-md')).toBe(true);
    const custom = ButtonDriver.mount({ props: { variant: 'outline', tone: 'error', size: 'sm' } });
    expect(custom.hasModifier('variant-outline')).toBe(true);
    expect(custom.hasModifier('tone-error')).toBe(true);
    expect(custom.hasModifier('size-sm')).toBe(true);
    expect(custom.hasModifier('variant-solid')).toBe(false);
  });

  it('squares itself when the slot holds only an icon unless told otherwise', () => {
    const close = ButtonDriver.mount({ content: 'icon', attrs: { 'aria-label': 'Close' } });
    expect(close.hasModifier('icon-only')).toBe(true);
    expect(ButtonDriver.mount({ content: 'icon-with-text' }).hasModifier('icon-only')).toBe(false);
    expect(ButtonDriver.mount().hasModifier('icon-only')).toBe(false);
    const wide = ButtonDriver.mount({ content: 'icon', props: { iconOnly: false } });
    expect(wide.hasModifier('icon-only')).toBe(false);
    expect(ButtonDriver.mount({ props: { iconOnly: true } }).hasModifier('icon-only')).toBe(true);
  });

  it('renders as a link when given a destination and keeps the button contract', () => {
    const link = ButtonDriver.mount({ props: { href: '/docs', variant: 'outline' } });
    expect(link.tag).toBe('a');
    expect(link.href).toBe('/docs');
    expect(link.type).toBeUndefined();
    expect(link.hasModifier('variant-outline')).toBe(true);
    expect(link.clickNatively()).toBe(false);
    const routed = ButtonDriver.mount({ props: { to: '/guide' }, viaRouter: true });
    expect(routed.tag).toBe('a');
    expect(routed.href).toBe('/router/guide');
    const off = ButtonDriver.mount({ props: { href: '/docs', disabled: true } });
    expect(off.href).toBeUndefined();
    expect(off.ariaDisabled).toBe('true');
    expect(off.attribute('tabindex')).toBe('-1');
    expect(off.hasModifier('disabled')).toBe(true);
    expect(off.clickNatively()).toBe(true);
    const busy = ButtonDriver.mount({ props: { href: '/docs', loading: true } });
    expect(busy.href).toBe('/docs');
    expect(busy.busy).toBe(true);
    expect(busy.clickNatively()).toBe(true);
  });

  it('keeps focus on a loading button and cancels its clicks so a form submits once', async () => {
    const clicks = { count: 0 };

    const button = ButtonDriver.mount({
      props: { type: 'submit' },
      attached: true,
      onClick: () => {
        clicks.count += 1;
      },
    });

    button.focus();
    await button.update({ loading: true });
    expect(button.focused).toBe(true);
    expect(button.clickNatively()).toBe(true);
    expect(clicks.count).toBe(0);
    await button.update({ loading: false });
    expect(button.focused).toBe(true);
    expect(button.clickNatively()).toBe(false);
    expect(clicks.count).toBe(1);
    button.unmount();
  });
});
