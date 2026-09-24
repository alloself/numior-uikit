import { describe, expect, it } from 'vitest';
import { BadgeDriver } from './drivers/badge';

describe('NuiBadge', () => {
  it('renders a neutral soft badge by default and exposes tone, variant, size and icon as modifiers', () => {
    const badge = BadgeDriver.mount({ label: 'New' });
    expect(badge.text).toBe('New');
    expect(badge.hasModifier('tone-neutral')).toBe(true);
    expect(badge.hasModifier('variant-soft')).toBe(true);
    expect(badge.hasModifier('size-md')).toBe(true);
    expect(badge.hasIcon).toBe(false);
    expect(badge.attribute('role')).toBeUndefined();

    const custom = BadgeDriver.mount({
      props: { tone: 'success', variant: 'outline', size: 'sm', icon: 'check' },
      label: 'Done',
    });

    expect(custom.hasModifier('tone-success')).toBe(true);
    expect(custom.hasModifier('variant-outline')).toBe(true);
    expect(custom.hasModifier('size-sm')).toBe(true);
    expect(custom.hasIcon).toBe(true);
    const iconOnly = BadgeDriver.mount({ props: { icon: 'check' } });
    expect(iconOnly.hasLabel).toBe(false);
  });

  it('formats the count against max and lets slot content win over the count', () => {
    const single = BadgeDriver.mount({ props: { count: 5 } });
    expect(single.text).toBe('5');
    expect(single.hasModifier('count')).toBe(true);

    expect(BadgeDriver.mount({ props: { count: 10 }, label: 'Ten' }).hasModifier('count')).toBe(
      false,
    );

    expect(BadgeDriver.mount({ props: { count: 120 } }).text).toBe('99+');
    expect(BadgeDriver.mount({ props: { count: 10, max: 9 } }).text).toBe('9+');
    expect(BadgeDriver.mount({ props: { count: 0 } }).text).toBe('0');
    expect(BadgeDriver.mount({ props: { count: 10 }, label: 'Ten' }).text).toBe('Ten');
  });

  it('renders a labelled dot as an image, hides a decorative dot and marks floating badges', () => {
    const dot = BadgeDriver.mount({ props: { dot: true, label: 'Online', tone: 'success' } });
    expect(dot.hasModifier('dot')).toBe(true);
    expect(dot.attribute('role')).toBe('img');
    expect(dot.attribute('aria-label')).toBe('Online');
    expect(dot.attribute('aria-hidden')).toBeUndefined();
    expect(dot.text).toBe('');
    expect(dot.hasLabel).toBe(false);
    const decorative = BadgeDriver.mount({ props: { dot: true } });
    expect(decorative.attribute('role')).toBeUndefined();
    expect(decorative.attribute('aria-hidden')).toBe('true');
    const floating = BadgeDriver.mount({ props: { floating: true, count: 3 } });
    expect(floating.hasModifier('floating')).toBe(true);
    expect(floating.text).toBe('3');
  });
});
