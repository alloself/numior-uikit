import { describe, expect, it } from 'vite-plus/test';
import { ChipDriver } from './drivers/chip';

describe('NuiChip', () => {
  it('renders a neutral soft chip by default and exposes tone, variant and size as modifiers', () => {
    const chip = ChipDriver.mount();
    expect(chip.text).toBe('Vue');
    expect(chip.hasModifier('tone-neutral')).toBe(true);
    expect(chip.hasModifier('variant-soft')).toBe(true);
    expect(chip.hasModifier('size-md')).toBe(true);
    expect(chip.removeButton.exists()).toBe(false);
    expect(chip.hasIcon).toBe(false);

    const custom = ChipDriver.mount({
      props: { tone: 'success', variant: 'outline', size: 'sm', icon: 'check' },
    });

    expect(custom.hasModifier('tone-success')).toBe(true);
    expect(custom.hasModifier('variant-outline')).toBe(true);
    expect(custom.hasModifier('size-sm')).toBe(true);
    expect(custom.hasIcon).toBe(true);
  });

  it('adds a labelled, tabbable remove button that emits remove unless disabled and leaves the tab order on request', async () => {
    const chip = ChipDriver.mount({ props: { removable: true, removeLabel: 'Убрать Vue' } });
    expect(chip.hasModifier('removable')).toBe(true);
    expect(chip.removeButton.attributes('aria-label')).toBe('Убрать Vue');
    expect(chip.removeButton.attributes('tabindex')).toBeUndefined();

    await chip.clickRemove();
    expect(chip.emittedRemove).toBe(1);

    const listed = ChipDriver.mount({ props: { removable: true, removeTabbable: false } });
    expect(listed.removeButton.attributes('tabindex')).toBe('-1');

    const off = ChipDriver.mount({ props: { removable: true, disabled: true } });
    expect(off.hasModifier('disabled')).toBe(true);
    expect(off.removeButton.element.disabled).toBe(true);
  });

  it('names the remove button in the configured language unless removeLabel is given', () => {
    const english = ChipDriver.mount({ props: { removable: true } });
    const russian = ChipDriver.mount({ props: { removable: true }, config: { locale: 'ru-RU' } });

    expect(english.removeLabel).toBe('Remove');
    expect(russian.removeLabel).toBe('Убрать');
  });
});
