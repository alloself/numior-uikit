import { describe, expect, it } from 'vitest';
import { DrawerDriver } from './drivers/dialog';

describe('NuiDrawer', () => {
  it('is a dialog mixed with side and size modifiers', () => {
    const drawer = DrawerDriver.mount({ props: { title: 'Filters', side: 'start', size: 'sm' } });
    expect(drawer.isOpen).toBe(true);
    expect(drawer.dialog.classes()).toContain('nui-dialog');
    expect(drawer.hasModifier('side-start')).toBe(true);
    expect(drawer.hasModifier('size-sm')).toBe(true);
    expect(drawer.titleText).toBe('Filters');
    drawer.unmount();
  });

  it('defaults to the end side and forwards close behavior and slots', async () => {
    const drawer = DrawerDriver.mount({ slots: { footer: () => 'Apply' } });
    expect(drawer.hasModifier('side-end')).toBe(true);
    expect(drawer.footer.text()).toBe('Apply');
    await drawer.clickClose();
    expect(drawer.emittedOpen).toEqual([false]);
    expect(drawer.emittedClose).toEqual(['']);
    drawer.unmount();
  });

  it('leaves the close text to the dialog dictionary', () => {
    const drawer = DrawerDriver.mount({ config: { locale: 'ru-RU' } });
    expect(drawer.closeLabel).toBe('Закрыть');
    drawer.unmount();
  });
});
