import { describe, expect, it } from 'vite-plus/test';
import Sun from 'lucide-vue-next/dist/esm/icons/sun.js';
import { markRaw, type Component } from 'vue';
import { IconDriver } from './drivers/icon';

const Custom = markRaw(Sun);

declare module '@numior/primitives' {
  interface NuiIconSets {
    test: Readonly<Record<'test-brand' | 'test-unregistered', Component>>;
  }
}

describe('NuiIcon', () => {
  it('lazily renders the Lucide default for a known alias as decorative markup', async () => {
    const icon = IconDriver.mount({ icon: 'check' });
    await icon.ready();
    expect(icon.decorative).toBe(true);
    expect(icon.glyphClasses).toContain('lucide-check');
    const trash = IconDriver.mount({ icon: 'trash' });
    await trash.ready();
    expect(trash.glyphClasses).toContain('lucide-trash-2');
  });

  it('prefers the provided registry, takes a component as is and stays empty for a declared alias nobody registered', async () => {
    const fromRegistry = IconDriver.mount({ icon: 'check' }, { icons: { check: Custom } });
    await fromRegistry.ready();
    expect(fromRegistry.glyphClasses).toContain('lucide-sun');
    const fromDefaults = IconDriver.mount({ icon: 'x' }, { icons: { check: Custom } });
    await fromDefaults.ready();
    expect(fromDefaults.glyphClasses).toContain('lucide-x');
    const appAlias = IconDriver.mount({ icon: 'test-brand' }, { icons: { 'test-brand': Custom } });
    await appAlias.ready();
    expect(appAlias.glyphClasses).toContain('lucide-sun');
    const component = IconDriver.mount({ icon: Custom });
    await component.ready();
    expect(component.glyphClasses).toContain('lucide-sun');
    const missing = IconDriver.mount({ icon: 'test-unregistered' }, { expectGlyph: false });
    await missing.ready();
    expect(missing.empty).toBe(true);
  });

  it('turns and scales its glyph without swapping it', async () => {
    const icon = IconDriver.mount({ icon: 'chevron-right' });

    await icon.ready();

    expect(icon.rotation).toBeUndefined();

    await icon.receive({ transform: { rotate: 90 } });

    expect(icon.rotation).toBe('--_rotate: 90deg;');

    await icon.receive({ transform: { rotate: -90, scale: 1.2 } });

    expect(icon.rotation).toBe('--_rotate: -90deg; --_scale: 1.2;');
    expect(icon.glyphClasses).toContain('lucide-chevron-right');
  });
});
