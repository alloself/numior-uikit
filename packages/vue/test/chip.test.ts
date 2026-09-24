import { describe, expect, it } from 'vitest';
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

  it('adds a labelled remove button outside the tab order that emits remove unless disabled', async () => {
    const chip = ChipDriver.mount({ props: { removable: true, removeLabel: 'Убрать Vue' } });
    expect(chip.hasModifier('removable')).toBe(true);
    expect(chip.removeButton.attributes('aria-label')).toBe('Убрать Vue');
    expect(chip.removeButton.attributes('tabindex')).toBe('-1');
    await chip.clickRemove();
    expect(chip.emittedRemove).toBe(1);
    const off = ChipDriver.mount({ props: { removable: true, disabled: true } });
    expect(off.hasModifier('disabled')).toBe(true);
    expect(off.removeButton.element.disabled).toBe(true);
  });
});
