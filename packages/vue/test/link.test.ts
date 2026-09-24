import { describe, expect, it } from 'vitest';
import { LinkDriver } from './drivers/link';

describe('NuiLink', () => {
  it('renders an anchor with primary tone and a permanent underline by default', () => {
    const link = LinkDriver.mount({ props: { href: '/docs' }, attrs: { role: 'menuitem' } });
    expect(link.tag).toBe('a');
    expect(link.href).toBe('/docs');
    expect(link.text).toBe('Docs');
    expect(link.hasModifier('tone-primary')).toBe(true);
    expect(link.hasModifier('underline-always')).toBe(true);
    expect(link.attribute('role')).toBe('menuitem');
    expect(link.hasExternalIcon).toBe(false);
  });

  it('opens external targets safely and can hide the underline until hover', () => {
    const link = LinkDriver.mount({
      props: { href: 'https://example.com', external: true, underline: 'hover', tone: 'neutral' },
    });

    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
    expect(link.hasExternalIcon).toBe(true);
    expect(link.hasModifier('underline-hover')).toBe(true);
    expect(link.hasModifier('tone-neutral')).toBe(true);
  });

  it('drops navigation and focus when disabled', () => {
    const link = LinkDriver.mount({ props: { href: '/docs', external: true, disabled: true } });
    expect(link.href).toBeUndefined();
    expect(link.target).toBeUndefined();
    expect(link.ariaDisabled).toBe('true');
    expect(link.tabindex).toBe('-1');
    expect(link.hasModifier('disabled')).toBe(true);
  });

  it('renders through a router component and passes the destination as to', () => {
    const link = LinkDriver.mount({ props: { to: '/guide' }, viaRouter: true });
    expect(link.tag).toBe('a');
    expect(link.href).toBe('/router/guide');
    expect(link.hasModifier('tone-primary')).toBe(true);
  });
});
