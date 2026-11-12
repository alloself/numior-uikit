import { Sun } from '@lucide/vue';
import { lazyIcon } from '@numior/primitives';
import { describe, expect, it } from 'vite-plus/test';
import { markRaw } from 'vue';
import { iconAliases } from '../src';
import { IconDriver, kitAliases } from './drivers/icon';

const Custom = markRaw(Sun);

describe('NuiIcon', () => {
  it('renders the Lucide default for a known alias as decorative markup', async () => {
    const icon = IconDriver.mount({ icon: 'check' });
    await icon.ready();
    expect(icon.decorative).toBe(true);
    expect(icon.glyphClasses).toContain('lucide-check');

    const trash = IconDriver.mount({ icon: 'trash' });
    await trash.ready();
    expect(trash.glyphClasses).toContain('lucide-trash');
  });

  it('prefers the provided registry and takes a component as is', async () => {
    const fromRegistry = IconDriver.mount({ icon: 'check' }, { icons: { check: Custom } });
    await fromRegistry.ready();
    expect(fromRegistry.glyphClasses).toContain('lucide-sun');

    const fromDefaults = IconDriver.mount({ icon: 'x' }, { icons: { check: Custom } });
    await fromDefaults.ready();
    expect(fromDefaults.glyphClasses).toContain('lucide-x');

    const component = IconDriver.mount({ icon: Custom });
    await component.ready();
    expect(component.glyphClasses).toContain('lucide-sun');
  });

  it('draws the Lucide file of every kit alias', async () => {
    for (const alias of kitAliases()) {
      const icon = IconDriver.mount({ icon: alias });

      await icon.ready();

      expect(icon.glyphClasses).toContain(`lucide-${iconAliases[alias]}`);
    }
  });

  it('fades a glyph in once while it loads and leaves it alone afterwards', async () => {
    const icon = IconDriver.mount({ icon: markRaw(lazyIcon(() => Promise.resolve(Custom))) });

    await icon.ready();

    expect(icon.hasModifier('appearing')).toBe(true);

    await icon.finishAppearing();

    expect(icon.hasModifier('appearing')).toBe(false);
  });

  it('shows a glyph that is already loaded without the fade', async () => {
    const loaded = markRaw(lazyIcon(() => Promise.resolve(Custom)));
    const first = IconDriver.mount({ icon: loaded });

    await first.ready();

    const second = IconDriver.mount({ icon: loaded });

    await second.ready();

    expect(second.hasModifier('appearing')).toBe(false);
  });

  it('fills closed shapes when asked', async () => {
    const icon = IconDriver.mount({ icon: 'check' });

    await icon.ready();

    expect(icon.hasModifier('filled')).toBe(false);

    await icon.receive({ filled: true });

    expect(icon.hasModifier('filled')).toBe(true);
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
