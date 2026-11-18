import { ACCENT_CLASS_PREFIX, NUMIOR_PALETTE, SITE_THEME_CLASS } from './composables/use-accent';

const KIT_THEME_PREFIX = 'nui-theme--';

const isThemeClass = (name: string): boolean =>
  name === SITE_THEME_CLASS || name.startsWith(KIT_THEME_PREFIX);

export const paletteClassOf = (accent: string): string =>
  accent === NUMIOR_PALETTE ? SITE_THEME_CLASS : `${ACCENT_CLASS_PREFIX}${accent}`;

const isSchemeClass = (name: string): boolean =>
  name.startsWith(KIT_THEME_PREFIX) && !name.startsWith(ACCENT_CLASS_PREFIX);

export const themeClassesOf = (element: Element): string[] =>
  [...element.classList].filter(isThemeClass);

export const schemeClassesOf = (element: Element): string[] =>
  [...element.classList].filter(isSchemeClass);

export const applyThemeClasses = (
  target: Element | null | undefined,
  classes: readonly string[],
): void => {
  if (target === undefined || target === null) {
    return;
  }

  for (const name of themeClassesOf(target)) {
    target.classList.toggle(name, classes.includes(name));
  }

  target.classList.add(...classes);
};

export const topWindowOnly = (script: string): string => `if(window.parent===window){${script}}`;
