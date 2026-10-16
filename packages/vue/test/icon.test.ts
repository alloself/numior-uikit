import { describe, expect, it } from 'vite-plus/test';
import { defineComponent, h } from 'vue';
import { IconDriver } from './drivers/icon';

const Custom = defineComponent({ render: () => h('svg', { 'data-custom': 'true' }) });

describe('NuiIcon', () => {
  it('lazily renders the Lucide default for a known alias as decorative markup', async () => {
    const icon = IconDriver.mount({ alias: 'check' });
    await icon.ready();
    expect(icon.decorative).toBe(true);
    expect(icon.glyphClasses).toContain('lucide-check');
    const trash = IconDriver.mount({ alias: 'trash' });
    await trash.ready();
    expect(trash.glyphClasses).toContain('lucide-trash-2');
  });

  it('prefers the provided registry, then an explicit component, and stays empty otherwise', async () => {
    const fromRegistry = IconDriver.mount({ alias: 'check' }, { icons: { check: Custom } });
    await fromRegistry.ready();
    expect(fromRegistry.glyphAttribute('data-custom')).toBe('true');
    const fromDefaults = IconDriver.mount({ alias: 'x' }, { icons: { check: Custom } });
    await fromDefaults.ready();
    expect(fromDefaults.glyphClasses).toContain('lucide-x');
    const explicit = IconDriver.mount({ alias: 'check', icon: Custom });
    await explicit.ready();
    expect(explicit.glyphAttribute('data-custom')).toBe('true');
    const missing = IconDriver.mount({ alias: 'unknown-alias' }, { expectGlyph: false });
    await missing.ready();
    expect(missing.empty).toBe(true);
  });

  it('turns and scales its glyph without swapping it', async () => {
    const icon = IconDriver.mount({ alias: 'chevron-right' });

    await icon.ready();

    expect(icon.rotation).toBeUndefined();

    await icon.receive({ transform: { rotate: 90 } });

    expect(icon.rotation).toBe('--_rotate: 90deg;');

    await icon.receive({ transform: { rotate: -90, scale: 1.2 } });

    expect(icon.rotation).toBe('--_rotate: -90deg; --_scale: 1.2;');
    expect(icon.glyphClasses).toContain('lucide-chevron-right');
  });
});
