import { describe, expect, it } from 'vite-plus/test';
import { h } from 'vue';
import { AlertDriver } from './drivers/alert';

describe('NuiAlert', () => {
  it('renders a soft info alert with the tone icon, title and description', () => {
    const alert = AlertDriver.mount({
      props: { title: 'Heads up', description: 'Something changed' },
    });

    expect(alert.hasModifier('variant-soft')).toBe(true);
    expect(alert.hasModifier('tone-info')).toBe(true);
    expect(alert.hasIcon).toBe(true);
    expect(alert.role).toBeUndefined();
    expect(alert.titleText).toBe('Heads up');
    expect(alert.bodyText).toBe('Something changed');
    expect(alert.closeButton.exists()).toBe(false);
  });

  it('marks errors as alerts, supports variants, custom icons and hiding the icon', () => {
    const solid = AlertDriver.mount({ props: { tone: 'error', variant: 'solid' } });
    expect(solid.role).toBe('alert');
    expect(solid.hasModifier('variant-solid')).toBe(true);
    const custom = AlertDriver.mount({ props: { tone: 'neutral', icon: 'search' } });
    expect(custom.hasIcon).toBe(true);
    const bare = AlertDriver.mount({ props: { tone: 'success', hideIcon: true } });
    expect(bare.hasIcon).toBe(false);
  });

  it('dismisses through the close button, emits and follows the open model', async () => {
    const alert = AlertDriver.mount({
      props: { title: 'Saved', dismissible: true, dismissLabel: 'Закрыть' },
      slots: { actions: () => h('button', 'Undo') },
    });

    expect(alert.actions.text()).toBe('Undo');
    expect(alert.closeButton.attributes('aria-label')).toBe('Закрыть');
    await alert.clickClose();
    expect(alert.emittedDismiss).toBe(1);
    expect(alert.emittedOpen).toEqual([false]);
    await alert.receiveOpen(false);
    expect(alert.hasModifier('closed')).toBe(true);
    await alert.receiveOpen(true);
    expect(alert.hasModifier('closed')).toBe(false);
  });

  it('names the dismiss button in the configured language unless dismissLabel is given', () => {
    const english = AlertDriver.mount({ props: { dismissible: true } });

    const russian = AlertDriver.mount({
      props: { dismissible: true },
      config: { locale: 'ru-RU' },
    });

    const labelled = AlertDriver.mount({
      props: { dismissible: true, dismissLabel: 'Скрыть' },
      config: { locale: 'ru-RU' },
    });

    expect(english.closeLabel).toBe('Close');
    expect(russian.closeLabel).toBe('Закрыть');
    expect(labelled.closeLabel).toBe('Скрыть');
  });
});
