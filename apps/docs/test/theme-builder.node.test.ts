import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';
import { THEME_IMPORTS, createThemeModel } from '../.vitepress/theme/theme-builder';
import { DocsAccent, ThemeFont, ThemePreset } from '../.vitepress/theme/theme.types';

const read = (path: string): string =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

const DECLARATION_RE = /(--[a-z0-9-]+):\s*([^;{}]+);/gu;

const declared = (css: string): string[] =>
  [...css.matchAll(DECLARATION_RE)]
    .map(([, name = '', value = '']) => `${name}: ${value.replaceAll(/\s+/gu, ' ').trim()}`)
    .toSorted();

const kitTheme = read('../../../packages/tokens/src/theme.css');

const kitDefaults = new Set(declared(/@theme static\s*\{([^}]*)\}/u.exec(kitTheme)?.[1] ?? ''));

const model = createThemeModel({
  kit: kitTheme,
  accents: read('../../../packages/tokens/src/accents.css'),
  site: read('../.vitepress/theme/numior.css'),
});

describe('theme builder', () => {
  it('exports the keys of the site theme file that differ from the kit for the Numior preset', () => {
    const css = model.css(model.presets.numior);
    const site = declared(read('../guide/snippets/numior-theme.css'));

    expect(css.startsWith(THEME_IMPORTS.join('\n'))).toBe(true);
    expect(declared(css)).toEqual(site.filter((line) => !kitDefaults.has(line)));
  });

  it('exports only the font family for the base preset, the rest is the kit default', () => {
    expect([...model.overrides(model.presets.base).keys()]).toEqual(['--font-sans']);
  });

  it('keeps the kit surfaces and takes the accent pair for a built-in accent', () => {
    const rose = { ...model.presets.base, palette: DocsAccent.Rose, font: ThemeFont.System };

    expect([...model.overrides(rose).keys()]).toEqual([
      '--color-primary',
      '--color-primary-foreground',
      '--font-sans',
    ]);

    expect(model.css(rose)).not.toContain('initial');
  });

  it('sets every key a preset touches on the preview, so the page theme does not leak in', () => {
    const base = model.preview(model.presets.base);
    const numior = model.preview(model.presets.numior);

    expect(Object.keys(base).toSorted()).toEqual(Object.keys(numior).toSorted());
    expect(base['--color-theme-soft-foreground']).toBe('initial');
    expect(base['--radius-base']).toBe('0.5rem');
    expect(numior['--color-primary']).toBe('light-dark(#ae3f10, #e0561a)');
  });

  it('writes the chosen radius and keeps the details of the preset with another palette', () => {
    const choice = {
      preset: ThemePreset.Numior,
      palette: DocsAccent.Teal,
      radius: '0rem',
      font: ThemeFont.Manrope,
    };

    const keys = model.overrides(choice);

    expect(keys.get('--radius-base')).toBe('0rem');
    expect(keys.get('--caption-transform')).toBe('uppercase');
    expect(keys.has('--color-surface')).toBe(false);
    expect(keys.has('--color-primary-soft-foreground')).toBe(false);
  });
});
