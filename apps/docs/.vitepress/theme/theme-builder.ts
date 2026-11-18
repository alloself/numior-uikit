import { escapeRegExp } from 'lodash-es';
import { NUMIOR_PALETTE, SITE_THEME_CLASS, ACCENT_CLASS_PREFIX } from './composables/use-accent';
import {
  DocsAccent,
  ThemeFont,
  ThemePreset,
  type ThemeChoice,
  type ThemeModel,
  type ThemeSources,
} from './theme.types';
import { cssDeclarationsOf } from './theme-css';

type Declarations = ReadonlyMap<string, string>;

const STATIC_THEME_RE = /@theme static\s*\{([^}]*)\}/u;
const HOOK_RE = /(--[a-z0-9-]+):\s*var\(\s*(--color-theme-[a-z0-9-]+)\s*,/gu;
const UNSET = 'initial';
const COLOR_PREFIX = '--color-';
const RADIUS = '--radius-base';
const FONT = '--font-sans';
const SYSTEM_STACK = 'ui-sans-serif, system-ui, sans-serif';
const INTER_STACK = `'Inter Variable', Inter, ${SYSTEM_STACK}`;

export const RADII = ['0rem', '0.25rem', '0.375rem', '0.5rem', '0.75rem', '1rem'] as const;

export const FONT_PACKAGES: Readonly<Record<ThemeFont, string | undefined>> = {
  inter: '@fontsource-variable/inter',
  manrope: '@fontsource-variable/manrope',
  system: undefined,
};

export const THEME_IMPORTS = [
  "@import 'tailwindcss';",
  "@import '@numior/kit/tailwind/theme.css';",
  "@import '@numior/kit/styles.css';",
] as const;

const ruleOf = (css: string, selector: string): Declarations =>
  cssDeclarationsOf(
    new RegExp(`${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`, 'u').exec(css)?.[1] ?? '',
  );

const required = (declarations: Declarations, key: string): string => {
  const value = declarations.get(key);

  if (value === undefined) {
    throw new Error(`The theme source has no ${key}`);
  }
  return value;
};

const isColor = ([key]: readonly [string, string]): boolean => key.startsWith(COLOR_PREFIX);

const isDetail = ([key]: readonly [string, string]): boolean =>
  !key.startsWith(COLOR_PREFIX) && key !== RADIUS && key !== FONT;

const entriesWhere = (
  declarations: Declarations,
  keep: (entry: readonly [string, string]) => boolean,
): Declarations => new Map([...declarations].filter(keep));

export const createThemeModel = (sources: ThemeSources): ThemeModel => {
  const kit = cssDeclarationsOf(STATIC_THEME_RE.exec(sources.kit)?.[1] ?? '');
  const site = ruleOf(sources.site, `.${SITE_THEME_CLASS}`);
  const siteColors = entriesWhere(site, isColor);
  const siteDetails = entriesWhere(site, isDetail);

  const accents = new Map<string, Declarations>(
    Object.values(DocsAccent).map((accent) => [
      accent,
      ruleOf(sources.accents, `.${ACCENT_CLASS_PREFIX}${accent}`),
    ]),
  );

  const fonts: Readonly<Record<ThemeFont, string>> = {
    inter: INTER_STACK,
    manrope: required(site, FONT),
    system: SYSTEM_STACK,
  };

  const presets: Readonly<Record<ThemePreset, ThemeChoice>> = {
    base: {
      preset: ThemePreset.Base,
      palette: DocsAccent.Indigo,
      radius: required(kit, RADIUS),
      font: ThemeFont.Inter,
    },
    numior: {
      preset: ThemePreset.Numior,
      palette: NUMIOR_PALETTE,
      radius: required(site, RADIUS),
      font: ThemeFont.Manrope,
    },
  };

  const paletteOf = (palette: string): Declarations =>
    palette === NUMIOR_PALETTE ? siteColors : (accents.get(palette) ?? new Map());

  const chosen = (choice: ThemeChoice): Declarations =>
    new Map([
      ...paletteOf(choice.palette),
      ...(choice.preset === ThemePreset.Numior ? siteDetails : []),
      [RADIUS, choice.radius],
      [FONT, fonts[choice.font]],
    ]);

  const hooks = new Map(
    Array.from(sources.kit.matchAll(HOOK_RE), ([, key = '', hook = '']) => [hook, key]),
  );

  const kitOrder = [...kit.keys()];

  const orderOf = (key: string): number => {
    const index = kitOrder.indexOf(key);

    return index === -1 ? kitOrder.length : index;
  };

  const scoped = new Set([
    ...site.keys(),
    ...[...accents.values()].flatMap((accent) => [...accent.keys()]),
    RADIUS,
    FONT,
  ]);

  const overrides = (choice: ThemeChoice): ReadonlyMap<string, string> =>
    new Map(
      [...chosen(choice)]
        .filter(([key, value]) => value !== UNSET && value !== kit.get(key))
        .toSorted(([a], [b]) => orderOf(a) - orderOf(b))
        .map(([key, value]) => [hooks.get(key) ?? key, value]),
    );

  const hookOf = new Map([...hooks].map(([hook, key]) => [key, hook]));

  const previewOf = (declarations: Declarations): Readonly<Record<string, string>> => {
    const values = new Map(
      [...declarations].map(([key, value]) => [hookOf.get(key) ?? key, value]),
    );

    return Object.fromEntries(
      [...new Set([...scoped, ...values.keys()])].map((key) => [
        key,
        values.get(key) ?? kit.get(key) ?? UNSET,
      ]),
    );
  };

  const preview = (choice: ThemeChoice): Readonly<Record<string, string>> =>
    previewOf(chosen(choice));

  const css = (choice: ThemeChoice): string => {
    const keys = [...overrides(choice)].map(([key, value]) => `  ${key}: ${value};`);
    const theme = keys.length === 0 ? [] : ['', '@theme {', ...keys, '}'];

    return [...THEME_IMPORTS, ...theme].join('\n');
  };

  return { presets, radii: RADII, overrides, preview, previewOf, css };
};
