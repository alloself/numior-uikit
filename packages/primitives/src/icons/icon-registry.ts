import { defineAsyncComponent, inject, provide, type Component, type InjectionKey } from 'vue';

export interface NuiIconAliases {
  readonly check: true;
  readonly minus: true;
  readonly loader: true;
  readonly 'chevron-down': true;
  readonly x: true;
  readonly search: true;
  readonly info: true;
  readonly success: true;
  readonly warning: true;
  readonly error: true;
  readonly 'chevron-right': true;
  readonly 'chevron-left': true;
  readonly 'chevrons-left': true;
  readonly 'chevrons-right': true;
  readonly ellipsis: true;
  readonly 'external-link': true;
  readonly user: true;
  readonly image: true;
  readonly inbox: true;
  readonly folder: true;
  readonly 'folder-open': true;
  readonly file: true;
  readonly 'arrow-up': true;
  readonly 'arrow-up-down': true;
  readonly grip: true;
  readonly plus: true;
  readonly clock: true;
  readonly calendar: true;
  readonly upload: true;
  readonly refresh: true;
  readonly sidebar: true;
  readonly menu: true;
  readonly trash: true;
  readonly sun: true;
  readonly moon: true;
  readonly monitor: true;
  readonly copy: true;
  readonly hash: true;
  readonly link: true;
  readonly languages: true;
  readonly command: true;
  readonly 'arrow-left': true;
  readonly 'arrow-right': true;
  readonly code: true;
  readonly eye: true;
  readonly terminal: true;
  readonly 'chevrons-up-down': true;
  readonly 'chevron-up': true;
  readonly smartphone: true;
  readonly tablet: true;
  readonly maximize: true;
  readonly 'grip-horizontal': true;
  readonly direction: true;
  readonly filter: true;
  readonly 'arrow-down': true;
  readonly 'eye-off': true;
  readonly 'list-tree': true;
  readonly columns: true;
  readonly scissors: true;
  readonly 'clipboard-paste': true;
  readonly eraser: true;
  readonly table: true;
  readonly 'move-horizontal': true;
}

export type IconAlias = keyof NuiIconAliases;

export type IconRegistry = Readonly<Partial<Record<IconAlias, Component>>>;

export type IconLoader = () => Promise<Component | { default: Component }>;

export const ICONS_KEY: InjectionKey<IconRegistry> = Symbol('nui:icons');

const EMPTY: IconRegistry = Object.freeze({});

export const provideIcons = (registry: IconRegistry): IconRegistry => {
  const merged: IconRegistry = { ...inject(ICONS_KEY, EMPTY), ...registry };
  provide(ICONS_KEY, merged);
  return merged;
};

export const provideIconDefaults = (registry: IconRegistry): IconRegistry => {
  const merged: IconRegistry = { ...registry, ...inject(ICONS_KEY, EMPTY) };
  provide(ICONS_KEY, merged);
  return merged;
};

export const useIcons = (): IconRegistry => {
  return inject(ICONS_KEY, EMPTY);
};

export const lazyIcon = (loader: IconLoader): Component => {
  return defineAsyncComponent<Component>({ loader, suspensible: false });
};
