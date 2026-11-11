import { describe, expect, it } from 'vite-plus/test';
import { KitBuild, kitCss } from './drivers/kit-build';

const ROOT = ':root, :host';
const SCOPE = '[data-nui-theme]';
const VIOLET = 'oklch(0.5 0.2 300)';

describe('@numior/tailwind', () => {
  it('builds the kit in the components layer, so a utility on a component wins', async () => {
    const kit = new KitBuild(
      await kitCss({ classes: ['bg-surface-muted', 'rounded-none', 'w-full'] }),
    );

    expect(kit.layerOrder).toEqual(['theme', 'base', 'components', 'utilities']);
    expect(kit.layersOf('.nui-button')).toEqual(['components']);
    expect(kit.layersOf('.nui-dialog')).toEqual(['components']);
    expect(kit.layersOf('.bg-surface-muted')).toEqual(['utilities']);

    expect(kit.overrides('.bg-surface-muted', '.nui-button')).toBe(true);
    expect(kit.overrides('.rounded-none', '.nui-button')).toBe(true);
    expect(kit.overrides('.w-full', '.nui-input')).toBe(true);
    expect(kit.overrides('.nui-button', '.w-full')).toBe(false);
  });

  it('styles the components from theme variables', async () => {
    const kit = new KitBuild(await kitCss());

    expect(kit.valueOf('.nui-button', '--_tone')).toBe('var(--color-primary)');
    expect(kit.valueOf('.nui-button', 'border-radius')).toBe('var(--radius)');
    expect(kit.valueOf(ROOT, '--color-primary')).toMatch(/^light-dark\(/);
    expect(kit.valueOf(SCOPE, '--color-primary')).toBe(kit.valueOf(ROOT, '--color-primary'));
  });

  it('carries a theme override of the consumer to the root and to every theme scope', async () => {
    const kit = new KitBuild(
      await kitCss({ theme: `@theme { --color-primary: ${VIOLET}; --radius: 1rem; }` }),
    );

    expect(kit.valueOf(ROOT, '--color-primary')).toBe(VIOLET);
    expect(kit.valueOf(SCOPE, '--color-primary')).toBe(VIOLET);
    expect(kit.valueOf(ROOT, '--radius')).toBe('1rem');
    expect(kit.valueOf(SCOPE, '--radius')).toBe('1rem');
    expect(kit.layersOf(ROOT)).toEqual(['theme']);
    expect(kit.layersOf(SCOPE)).toEqual(['theme']);
  });
});
