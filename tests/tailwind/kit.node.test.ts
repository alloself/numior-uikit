import { describe, expect, it } from 'vite-plus/test';
import { KitBuild, kitCss } from './drivers/kit-build';

const ROOT = ':root, :host';
const VIOLET = 'oklch(0.5 0.2 300)';
const COMPACT = '.nui-theme--density-compact';
const BROKEN_VARIABLE = /var\(--\s/;

describe('@numior/tailwind', () => {
  it('builds the kit in the components layer, so a utility on a component wins', async () => {
    const kit = new KitBuild(
      await kitCss({ classes: ['bg-surface-muted', 'rounded-none', 'w-full'] }),
    );

    expect(kit.layerOrder).toEqual(['properties', 'theme', 'base', 'components', 'utilities']);
    expect(kit.layersOf('.nui-button')).toEqual(['components']);
    expect(kit.layersOf('.nui-dialog')).toEqual(['components']);
    expect(kit.layersOf('.nui-table')).toEqual(['components']);
    expect(kit.layersOf('.bg-surface-muted')).toEqual(['utilities']);

    expect(kit.overrides('.bg-surface-muted', '.nui-button')).toBe(true);
    expect(kit.overrides('.rounded-none', '.nui-button')).toBe(true);
    expect(kit.overrides('.w-full', '.nui-input')).toBe(true);
    expect(kit.overrides('.nui-button', '.w-full')).toBe(false);
  });

  it('puts base keys on the root and computes derived keys where they are used', async () => {
    const kit = new KitBuild(await kitCss());

    expect(kit.valueOf(ROOT, '--color-primary')).toMatch(/^light-dark\(/);
    expect(kit.valueOf(ROOT, '--radius-base')).toBe('0.5rem');
    expect(kit.selectorsDeclaring('--color-primary-soft')).toEqual([]);
    expect(kit.selectorsDeclaring('--radius')).toEqual([]);

    expect(kit.valueOf('.nui-button', '--_tone')).toBe('var(--color-primary)');
    expect(kit.valueOf('.nui-button', 'border-radius')).toBe('var(--radius-base)');

    expect(kit.valueOf('.nui-button', '--_tone-soft')).toContain(
      'var(--color-layer, var(--color-surface))',
    );
  });

  it('carries a theme override of the consumer to the root and a derivation to every use', async () => {
    const kit = new KitBuild(
      await kitCss({
        theme: `@theme { --color-primary: ${VIOLET}; } @theme inline { --radius: 1rem; }`,
      }),
    );

    expect(kit.valueOf(ROOT, '--color-primary')).toBe(VIOLET);
    expect(kit.valueOf('.nui-button', 'border-radius')).toBe('1rem');
    expect(kit.layersOf(ROOT)).toEqual(['theme']);
  });

  it('declares scopes with base keys only and never through attributes', async () => {
    const css = await kitCss({ classes: ['dark:bg-surface'] });
    const kit = new KitBuild(css);

    expect(kit.valueOf(COMPACT, '--spacing-control-md')).toBe('2rem');
    expect(kit.valueOf(COMPACT, '--spacing-control')).toBeUndefined();
    expect(kit.valueOf('.nui-layer', '--color-layer')).toBe('var(--color-surface-overlay)');
    expect(kit.selectorsDeclaring('--color-primary-soft')).toEqual([]);
    expect(css).not.toMatch(/\[data-/);
    expect(css).not.toMatch(/--([a-z0-9-]+):\s*var\(--\1\)/);
  });

  it('follows the nearest scheme scope in the dark variant', async () => {
    const kit = new KitBuild(await kitCss({ classes: ['dark:bg-surface'] }));

    expect(kit.layersOf('.dark\\:bg-surface:where(.nui-theme--dark)')).toEqual(['utilities']);

    expect(
      kit.valueOf(
        '.dark\\:bg-surface:not(:where(:root, .nui-theme--light, .nui-theme--dark, .nui-theme--system))',
        'background-color',
      ),
    ).toBe('var(--color-surface)');
  });

  it('keeps the name of every variable in the arbitrary values of the kit', async () => {
    const css = await kitCss();

    expect(css.split('\n').filter((line) => BROKEN_VARIABLE.test(line))).toEqual([]);
  });

  it('names the outline style in every rule that draws an outline', async () => {
    const kit = new KitBuild(await kitCss());

    expect(kit.selectorsEndingWith('outline-style', 'var(--tw-outline-style)')).toEqual([]);
  });
});
